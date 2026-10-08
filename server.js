/**
 * SmartAttend - Production-Ready Backend Server
 * 
 * Provides:
 * 1. REST API corresponding to Amazon API Gateway endpoints
 * 2. Real-Time Server-Sent Events (SSE) for Live RFID scans and Classroom Monitors
 * 3. Static Web Server for Student & Admin frontend dashboards
 * 4. AWS Cloud Integration layer
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const db = require('./services/databaseService');
const engine = require('./services/attendanceEngine');
const awsConfig = require('./services/awsConfig');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Active SSE Connections for Live Broadcast
const sseClients = new Set();

/**
 * Broadcasts an event to all connected web clients (Student Dashboards & Classroom Podium Displays)
 */
function broadcastSseEvent(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv; charset=utf-8'
};

/**
 * Helper to parse JSON request body
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) { // 1MB limit
        req.connection.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response with CORS
 */
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  });
  res.end(JSON.stringify(data));
}

/**
 * Main HTTP Server Request Handler
 */
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
    return res.end();
  }

  try {
    // -------------------------------------------------------------
    // REAL-TIME SERVER-SENT EVENTS (SSE) STREAM
    // -------------------------------------------------------------
    if (pathname === '/api/attendance/live' && method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      res.write(': connected\n\n');
      sseClients.add(res);

      req.on('close', () => {
        sseClients.delete(res);
      });
      return;
    }

    // -------------------------------------------------------------
    // REST API ROUTES
    // -------------------------------------------------------------

    // 1. RFID SCAN INGESTION (Simulates AWS API Gateway -> Lambda)
    if (pathname === '/api/rfid/scan' && method === 'POST') {
      const payload = await parseJsonBody(req);
      const scanResult = engine.processRfidScan({
        rfid_card_id: payload.rfid_card_id,
        reader_id: payload.reader_id,
        timestamp: payload.timestamp || new Date().toISOString(),
        custom_time: payload.custom_time,
        db: db.data
      });

      if (scanResult.success && scanResult.record) {
        db.addAttendanceRecord(scanResult.record);

        // Generate student in-app notification
        db.addNotification({
          student_id: scanResult.student.id,
          type: 'ATTENDANCE_' + (scanResult.status_label || 'MARKED').replace(/\s+/g, '_'),
          title: `Attendance Marked: ${scanResult.status_label}`,
          message: `Attendance for ${scanResult.subject.name} recorded at ${scanResult.scan_time} (${scanResult.remarks}). Credited: ${scanResult.classes_credited} period(s).`,
          severity: scanResult.status_label === 'ON TIME' ? 'success' : (scanResult.status_label === 'LATE' ? 'warning' : 'critical')
        });

        // Broadcast to all active dashboards and classroom monitors
        broadcastSseEvent('RFID_SCAN', {
          type: 'SCAN_RECORDED',
          scanResult
        });
      } else {
        // Broadcast non-fatal scan failures (e.g. duplicate scan, invalid card) to classroom monitor
        broadcastSseEvent('RFID_SCAN', {
          type: 'SCAN_FAILED',
          scanResult
        });
      }

      return sendJson(res, scanResult.success ? 200 : 400, scanResult);
    }

    // 2. STUDENT DASHBOARD AGGREGATED DATA
    if (pathname.startsWith('/api/attendance/student/') && method === 'GET') {
      const studentId = pathname.replace('/api/attendance/student/', '');
      const student = db.getStudent(studentId);

      if (!student) {
        return sendJson(res, 404, { error: 'Student not found' });
      }

      const aggregates = db.getStudentAggregates(studentId);
      const rules = db.getRules();
      const targetPercent = rules.minimum_percentage || 75;

      const metrics = engine.calculateAttendanceMetrics(
        aggregates.attended,
        aggregates.total_conducted,
        targetPercent
      );

      const records = db.getAttendanceRecords({ student_id: studentId });
      const timetableToday = db.getTimetable('Thursday'); // Defaults to seeded Thursday
      const subjects = db.getSubjects().map(subj => {
        const sStat = (aggregates.subject_stats && aggregates.subject_stats[subj.subject_id]) || {
          conducted: 10,
          attended: 8,
          missed: 2
        };
        const sMetrics = engine.calculateAttendanceMetrics(
          sStat.attended,
          sStat.conducted,
          subj.attendance_requirement || targetPercent
        );
        return {
          ...subj,
          stats: sStat,
          metrics: sMetrics
        };
      });

      // Exam Eligibility & Bunk Estimators
      const examEligibility = engine.getExamEligibility(metrics.currentPercentage);
      const bunkImpact1 = engine.calculateBunkImpact(aggregates.attended, aggregates.total_conducted, 1, targetPercent);
      const bunkImpact2 = engine.calculateBunkImpact(aggregates.attended, aggregates.total_conducted, 2, targetPercent);
      const bunkImpactToday = engine.calculateBunkImpact(aggregates.attended, aggregates.total_conducted, timetableToday.length || 3, targetPercent);
      const leaveRequests = db.getLeaveRequests(studentId);
      const parentAlerts = db.getParentAlerts(studentId);

      // Find Next Class
      const nowMins = engine.timeToMinutes('11:15'); // Current morning demo time
      let nextClass = timetableToday.find(t => engine.timeToMinutes(t.start_time) >= nowMins);
      if (!nextClass && timetableToday.length > 0) {
        nextClass = timetableToday[0];
      }

      return sendJson(res, 200, {
        student,
        aggregates,
        metrics,
        rules,
        recentRecords: records.slice(0, 10),
        allRecordsCount: records.length,
        subjects,
        todaySchedule: timetableToday,
        allTimetable: db.getTimetable(),
        examEligibility,
        bunkEstimates: {
          bunk1: bunkImpact1,
          bunk2: bunkImpact2,
          bunkToday: bunkImpactToday
        },
        leaveRequests,
        parentAlerts,
        nextClass: nextClass ? {
          ...nextClass,
          starts_in_minutes: Math.max(0, engine.timeToMinutes(nextClass.start_time) - nowMins)
        } : null
      });
    }

    // 2b. DYNAMIC BUNK IMPACT CALCULATOR
    if (pathname === '/api/bunk/calculate' && method === 'POST') {
      const { student_id, classes_to_bunk, subject_id, target } = await parseJsonBody(req);
      const aggregates = db.getStudentAggregates(student_id || '23CS01042');
      const rules = db.getRules();
      const targetPercent = target || rules.minimum_percentage || 75;

      let attended = aggregates.attended;
      let total = aggregates.total_conducted;

      if (subject_id && aggregates.subject_stats && aggregates.subject_stats[subject_id]) {
        attended = aggregates.subject_stats[subject_id].attended;
        total = aggregates.subject_stats[subject_id].conducted;
      }

      const result = engine.calculateBunkImpact(attended, total, classes_to_bunk || 1, targetPercent);
      return sendJson(res, 200, result);
    }

    // 2c. LEAVE & ON-DUTY (OD) MANAGEMENT
    if (pathname === '/api/leaves' && method === 'GET') {
      const studentId = parsedUrl.query.student_id;
      const leaves = db.getLeaveRequests(studentId);
      return sendJson(res, 200, { leaves });
    }

    if (pathname === '/api/leaves' && method === 'POST') {
      const payload = await parseJsonBody(req);
      const student = db.getStudent(payload.student_id);
      const created = db.createLeaveRequest({
        ...payload,
        student_name: student ? student.name : (payload.student_name || 'Student')
      });
      broadcastSseEvent('LEAVE_REQUESTED', { leave: created });
      return sendJson(res, 201, { success: true, leave: created });
    }

    if (pathname.startsWith('/api/leaves/') && method === 'PUT') {
      const leaveId = pathname.replace('/api/leaves/', '');
      const { status, admin_remarks, reviewer_name } = await parseJsonBody(req);
      const updated = db.updateLeaveStatus(leaveId, status, admin_remarks, reviewer_name);
      if (!updated) {
        return sendJson(res, 404, { error: 'Leave request not found' });
      }
      broadcastSseEvent('LEAVE_STATUS_UPDATED', { leave: updated });
      return sendJson(res, 200, { success: true, leave: updated });
    }

    // 2d. AUTOMATED PARENT ALERT SIMULATOR (AMAZON SNS)
    if (pathname === '/api/alerts/parent-sns' && method === 'POST') {
      const { student_id, reason, custom_message } = await parseJsonBody(req);
      const student = db.getStudent(student_id || '23CS01048');
      if (!student) {
        return sendJson(res, 404, { error: 'Student not found' });
      }

      const aggregates = db.getStudentAggregates(student.student_id);
      const currentPct = ((aggregates.attended / (aggregates.total_conducted || 1)) * 100).toFixed(1);

      const alertMessage = custom_message || `URGENT: SmartAttend Campus Alert. Your ward ${student.name} (Roll: ${student.student_id}) has overall attendance of ${currentPct}% in Semester 2 (below mandatory 75% requirement). Hall ticket clearance is at risk. Please contact the Head of Department.`;

      const recorded = db.recordParentAlert({
        student_id: student.student_id,
        student_name: student.name,
        parent_phone: student.parent_phone || '+91 94401 23456',
        parent_name: student.parent_name || 'Parent/Guardian',
        trigger_reason: reason || `Attendance dropped to ${currentPct}%`,
        message: alertMessage
      });

      // Also log student notification
      db.addNotification({
        student_id: student.student_id,
        type: 'PARENT_ALERT_DISPATCHED',
        title: 'Parent Alert Dispatched (AWS SNS)',
        message: `An automated SMS notification was dispatched to ${student.parent_phone} regarding attendance shortage.`,
        severity: 'critical'
      });

      broadcastSseEvent('PARENT_ALERT_SENT', { alert: recorded });
      return sendJson(res, 200, { success: true, alert: recorded });
    }

    // 3. ATTENDANCE HISTORY LIST & FILTERS
    if (pathname === '/api/attendance/records' && method === 'GET') {
      const filters = {
        student_id: parsedUrl.query.student_id,
        subject_id: parsedUrl.query.subject_id,
        status: parsedUrl.query.status,
        date: parsedUrl.query.date,
        search: parsedUrl.query.search
      };
      const records = db.getAttendanceRecords(filters);
      return sendJson(res, 200, {
        records,
        total: records.length
      });
    }

    // 4. TIMETABLE
    if (pathname === '/api/timetable/today' && method === 'GET') {
      const day = parsedUrl.query.day || 'Thursday';
      const schedule = db.getTimetable(day);
      return sendJson(res, 200, { day, schedule });
    }

    if (pathname === '/api/timetable' && method === 'GET') {
      return sendJson(res, 200, { timetable: db.getTimetable() });
    }

    if (pathname === '/api/timetable' && method === 'POST') {
      const entry = await parseJsonBody(req);
      const saved = db.saveTimetableEntry(entry);
      return sendJson(res, 200, { success: true, entry: saved });
    }

    if (pathname.startsWith('/api/timetable/') && method === 'DELETE') {
      const id = pathname.replace('/api/timetable/', '');
      const deleted = db.deleteTimetableEntry(id);
      return sendJson(res, 200, { success: deleted });
    }

    // 5. ATTENDANCE RULES
    if (pathname === '/api/rules' && method === 'GET') {
      return sendJson(res, 200, { rules: db.getRules() });
    }

    if (pathname === '/api/rules' && method === 'PUT') {
      const newRules = await parseJsonBody(req);
      const updated = db.updateRules(newRules);
      broadcastSseEvent('RULES_UPDATED', { rules: updated });
      return sendJson(res, 200, { success: true, rules: updated });
    }

    // 6. STUDENTS DIRECTORY
    if (pathname === '/api/students' && method === 'GET') {
      return sendJson(res, 200, { students: db.getStudents() });
    }

    if (pathname === '/api/students' && method === 'POST') {
      const studentData = await parseJsonBody(req);
      const saved = db.saveStudent(studentData);
      return sendJson(res, 200, { success: true, student: saved });
    }

    if (pathname.startsWith('/api/students/') && method === 'DELETE') {
      const id = pathname.replace('/api/students/', '');
      const ok = db.deleteStudent(id);
      return sendJson(res, 200, { success: ok });
    }

    // 7. SUBJECTS DIRECTORY
    if (pathname === '/api/subjects' && method === 'GET') {
      return sendJson(res, 200, { subjects: db.getSubjects() });
    }

    if (pathname === '/api/subjects' && method === 'POST') {
      const subjectData = await parseJsonBody(req);
      const saved = db.saveSubject(subjectData);
      return sendJson(res, 200, { success: true, subject: saved });
    }

    // 8. RFID READERS
    if (pathname === '/api/readers' && method === 'GET') {
      return sendJson(res, 200, { readers: db.getReaders() });
    }

    if (pathname === '/api/readers' && method === 'POST') {
      const readerData = await parseJsonBody(req);
      const saved = db.saveReader(readerData);
      return sendJson(res, 200, { success: true, reader: saved });
    }

    // 9. NOTIFICATIONS
    if (pathname === '/api/notifications' && method === 'GET') {
      const studentId = parsedUrl.query.student_id;
      const notifs = db.getNotifications(studentId);
      return sendJson(res, 200, { notifications: notifs });
    }

    if (pathname === '/api/notifications/read' && method === 'POST') {
      const { id } = await parseJsonBody(req);
      const ok = db.markNotificationAsRead(id);
      return sendJson(res, 200, { success: ok });
    }

    if (pathname === '/api/notifications/read-all' && method === 'POST') {
      const { student_id } = await parseJsonBody(req);
      const ok = db.markAllNotificationsAsRead(student_id);
      return sendJson(res, 200, { success: ok });
    }

    // 10. CSV REPORT EXPORT
    if (pathname === '/api/reports/export' && method === 'GET') {
      const csvData = db.generateAttendanceCsv(parsedUrl.query);
      const filename = `SmartAttend_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(csvData);
    }

    // 11. AWS ARCHITECTURE CONFIG ENDPOINT
    if (pathname === '/api/aws/config' && method === 'GET') {
      return sendJson(res, 200, { awsConfig });
    }

    // -------------------------------------------------------------
    // STATIC FILE SERVING
    // -------------------------------------------------------------
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

    // Security check: prevent directory traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('Access Denied');
    }

    // Check if file exists, if not fall back to index.html for SPA routing
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      return res.end(content);
    }

    // 404 Fallback
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');

  } catch (err) {
    console.error('Unhandled server error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', details: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  SmartAttend — RFID-Based Attendance Management System`);
  console.log(`  Ready for AWS Cloud Computing Project Demonstration`);
  console.log(`======================================================`);
  console.log(`  Local Server:    http://localhost:${PORT}`);
  console.log(`  API Base:        http://localhost:${PORT}/api`);
  console.log(`  Live SSE Stream: http://localhost:${PORT}/api/attendance/live`);
  console.log(`======================================================\n`);
});
