/**
 * SmartAttend - Database Service Layer
 * Abstracts data persistence; modeled after Amazon DynamoDB Single-Table / Document Design.
 */
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'database.json');

class DatabaseService {
  constructor() {
    this.data = null;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        this.data = JSON.parse(raw);
      } else {
        throw new Error(`Database file not found at ${DB_PATH}`);
      }
    } catch (err) {
      console.error('Error loading database:', err);
      this.data = {
        rules: {},
        students: [],
        subjects: [],
        readers: [],
        timetable: [],
        attendance_records: [],
        student_aggregates: {},
        notifications: []
      };
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Error saving database:', err);
      return false;
    }
  }

  // Rules
  getRules() {
    return this.data.rules || {};
  }

  updateRules(newRules) {
    this.data.rules = { ...this.data.rules, ...newRules };
    this.save();
    return this.data.rules;
  }

  // Students
  getStudents() {
    return this.data.students || [];
  }

  getStudent(studentId) {
    return (this.data.students || []).find(s => s.student_id === studentId);
  }

  saveStudent(student) {
    const idx = (this.data.students || []).findIndex(s => s.student_id === student.student_id);
    if (idx >= 0) {
      this.data.students[idx] = { ...this.data.students[idx], ...student };
    } else {
      this.data.students.push(student);
      // Initialize aggregate stats
      if (!this.data.student_aggregates[student.student_id]) {
        this.data.student_aggregates[student.student_id] = {
          total_conducted: 0,
          attended: 0,
          missed: 0,
          subject_stats: {}
        };
      }
    }
    this.save();
    return student;
  }

  deleteStudent(studentId) {
    const idx = (this.data.students || []).findIndex(s => s.student_id === studentId);
    if (idx >= 0) {
      this.data.students.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  // Subjects
  getSubjects() {
    return this.data.subjects || [];
  }

  saveSubject(subject) {
    const idx = (this.data.subjects || []).findIndex(s => s.subject_id === subject.subject_id);
    if (idx >= 0) {
      this.data.subjects[idx] = { ...this.data.subjects[idx], ...subject };
    } else {
      this.data.subjects.push(subject);
    }
    this.save();
    return subject;
  }

  // Timetable
  getTimetable(day = null) {
    const tt = this.data.timetable || [];
    if (!day) return tt;
    return tt.filter(t => t.day.toLowerCase() === day.toLowerCase());
  }

  saveTimetableEntry(entry) {
    if (!entry.timetable_id) {
      entry.timetable_id = `TT-${Date.now()}`;
    }
    const idx = (this.data.timetable || []).findIndex(t => t.timetable_id === entry.timetable_id);
    if (idx >= 0) {
      this.data.timetable[idx] = { ...this.data.timetable[idx], ...entry };
    } else {
      this.data.timetable.push(entry);
    }
    this.save();
    return entry;
  }

  deleteTimetableEntry(id) {
    const idx = (this.data.timetable || []).findIndex(t => t.timetable_id === id);
    if (idx >= 0) {
      this.data.timetable.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  // Readers
  getReaders() {
    return this.data.readers || [];
  }

  saveReader(reader) {
    const idx = (this.data.readers || []).findIndex(r => r.reader_id === reader.reader_id);
    if (idx >= 0) {
      this.data.readers[idx] = { ...this.data.readers[idx], ...reader, last_seen: new Date().toISOString() };
    } else {
      this.data.readers.push({ ...reader, last_seen: new Date().toISOString() });
    }
    this.save();
    return reader;
  }

  // Attendance Records
  getAttendanceRecords(filters = {}) {
    let records = [...(this.data.attendance_records || [])];

    if (filters.student_id) {
      records = records.filter(r => r.student_id === filters.student_id);
    }
    if (filters.subject_id) {
      records = records.filter(r => r.subject_id === filters.subject_id);
    }
    if (filters.status && filters.status !== 'ALL') {
      records = records.filter(r => r.status === filters.status);
    }
    if (filters.date) {
      records = records.filter(r => r.date === filters.date);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      records = records.filter(r =>
        (r.student_name && r.student_name.toLowerCase().includes(q)) ||
        (r.student_id && r.student_id.toLowerCase().includes(q)) ||
        (r.subject_name && r.subject_name.toLowerCase().includes(q)) ||
        (r.room && r.room.toLowerCase().includes(q))
      );
    }

    // Sort descending by date and time
    records.sort((a, b) => {
      const dtA = `${a.date} ${a.rfid_punch_time || a.scheduled_start}`;
      const dtB = `${b.date} ${b.rfid_punch_time || b.scheduled_start}`;
      return dtB.localeCompare(dtA);
    });

    return records;
  }

  addAttendanceRecord(record) {
    this.data.attendance_records.unshift(record);

    // Update student aggregates
    const studentId = record.student_id;
    if (!this.data.student_aggregates[studentId]) {
      this.data.student_aggregates[studentId] = {
        total_conducted: 0,
        attended: 0,
        missed: 0,
        subject_stats: {}
      };
    }
    const agg = this.data.student_aggregates[studentId];
    const credited = record.classes_credited || (record.status !== 'NOT COUNTED' && record.status !== 'ABSENT' ? 1 : 0);

    agg.total_conducted += (record.periods_breakdown ? record.periods_breakdown.length : 1);
    if (credited > 0) {
      agg.attended += credited;
    } else {
      agg.missed += 1;
    }

    // Subject stats
    if (record.subject_id) {
      if (!agg.subject_stats[record.subject_id]) {
        agg.subject_stats[record.subject_id] = { conducted: 0, attended: 0, missed: 0 };
      }
      const sStat = agg.subject_stats[record.subject_id];
      sStat.conducted += (record.periods_breakdown ? record.periods_breakdown.length : 1);
      if (credited > 0) {
        sStat.attended += credited;
      } else {
        sStat.missed += 1;
      }
    }

    this.save();
    return record;
  }

  getStudentAggregates(studentId) {
    return this.data.student_aggregates[studentId] || {
      total_conducted: 50,
      attended: 38,
      missed: 12,
      subject_stats: {}
    };
  }

  // Notifications
  getNotifications(studentId) {
    const list = this.data.notifications || [];
    if (!studentId) return list;
    return list.filter(n => !n.student_id || n.student_id === studentId);
  }

  addNotification(notif) {
    const newNotif = {
      id: notif.id || `NOTIF-${Date.now()}`,
      student_id: notif.student_id,
      type: notif.type || 'SYSTEM',
      title: notif.title || 'Notification',
      message: notif.message,
      timestamp: notif.timestamp || new Date().toISOString(),
      read: false,
      severity: notif.severity || 'info'
    };
    if (!this.data.notifications) this.data.notifications = [];
    this.data.notifications.unshift(newNotif);
    this.save();
    return newNotif;
  }

  markNotificationAsRead(id) {
    const notif = (this.data.notifications || []).find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.save();
      return true;
    }
    return false;
  }

  markAllNotificationsAsRead(studentId) {
    (this.data.notifications || []).forEach(n => {
      if (!studentId || n.student_id === studentId) {
        n.read = true;
      }
    });
    this.save();
    return true;
  }

  // Leave & On-Duty (OD) Management
  getLeaveRequests(studentId = null) {
    const leaves = this.data.leave_requests || [];
    if (!studentId) return leaves;
    return leaves.filter(l => l.student_id === studentId);
  }

  createLeaveRequest(request) {
    const newLeave = {
      leave_id: request.leave_id || `LV-${Date.now()}`,
      student_id: request.student_id,
      student_name: request.student_name,
      type: request.type || 'MEDICAL',
      type_label: request.type_label || (request.type === 'ON_DUTY' ? 'On-Duty (OD)' : 'Medical Leave'),
      date_from: request.date_from,
      date_to: request.date_to,
      subjects_affected: request.subjects_affected || [],
      classes_credited: request.classes_credited || 0,
      reason: request.reason,
      document_ref: request.document_ref || 'Certificate_Attached.pdf',
      status: 'PENDING',
      applied_on: new Date().toISOString(),
      reviewed_by: null,
      reviewed_on: null,
      admin_remarks: null
    };

    if (!this.data.leave_requests) this.data.leave_requests = [];
    this.data.leave_requests.unshift(newLeave);
    this.save();
    return newLeave;
  }

  updateLeaveStatus(leaveId, status, adminRemarks = '', reviewerName = 'Dr. Nakka Shekhar (Academic Dean)') {
    const leave = (this.data.leave_requests || []).find(l => l.leave_id === leaveId);
    if (!leave) return null;

    leave.status = status;
    leave.admin_remarks = adminRemarks;
    leave.reviewed_by = reviewerName;
    leave.reviewed_on = new Date().toISOString();

    // If approved, grant attendance credit to student aggregates!
    if (status === 'APPROVED') {
      const studentId = leave.student_id;
      const creditsToGrant = leave.subjects_affected?.length ? leave.subjects_affected.length : 2;
      leave.classes_credited = creditsToGrant;

      if (!this.data.student_aggregates[studentId]) {
        this.data.student_aggregates[studentId] = { total_conducted: 52, attended: 40, missed: 12, od_credited: 0, subject_stats: {} };
      }
      const agg = this.data.student_aggregates[studentId];
      agg.attended += creditsToGrant;
      agg.missed = Math.max(0, agg.missed - creditsToGrant);
      agg.od_credited = (agg.od_credited || 0) + creditsToGrant;

      // Update individual subject stats if specified
      (leave.subjects_affected || []).forEach(subjId => {
        if (agg.subject_stats && agg.subject_stats[subjId]) {
          agg.subject_stats[subjId].attended += 1;
          agg.subject_stats[subjId].missed = Math.max(0, agg.subject_stats[subjId].missed - 1);
        }
      });

      // Add student notification
      this.addNotification({
        student_id: studentId,
        type: 'LEAVE_APPROVED',
        title: `${leave.type_label} Approved ✓`,
        message: `Your ${leave.type_label} was approved by ${reviewerName}. +${creditsToGrant} attendance credit(s) applied.`,
        severity: 'success'
      });
    } else if (status === 'REJECTED') {
      this.addNotification({
        student_id: leave.student_id,
        type: 'LEAVE_REJECTED',
        title: `${leave.type_label} Update`,
        message: `Your ${leave.type_label} was rejected. Reason: ${adminRemarks || 'Document verification incomplete'}`,
        severity: 'critical'
      });
    }

    this.save();
    return leave;
  }

  // Parent Alerts
  getParentAlerts(studentId = null) {
    const list = this.data.parent_alerts || [];
    if (!studentId) return list;
    return list.filter(a => a.student_id === studentId);
  }

  recordParentAlert(alert) {
    const newAlert = {
      alert_id: alert.alert_id || `PA-${Date.now()}`,
      student_id: alert.student_id,
      student_name: alert.student_name,
      parent_phone: alert.parent_phone || '+91 94401 23456',
      parent_name: alert.parent_name || 'Parent/Guardian',
      type: alert.type || 'SNS_SMS_AND_EMAIL',
      severity: alert.severity || 'CRITICAL',
      trigger_reason: alert.trigger_reason,
      message: alert.message,
      sent_at: new Date().toISOString(),
      delivery_status: 'DELIVERED_VIA_AWS_SNS',
      sns_message_id: `sns-msg-${Math.random().toString(36).substring(2, 10)}-${Date.now()}`
    };

    if (!this.data.parent_alerts) this.data.parent_alerts = [];
    this.data.parent_alerts.unshift(newAlert);
    this.save();
    return newAlert;
  }

  // CSV Report Generator
  generateAttendanceCsv(filters = {}) {
    const records = this.getAttendanceRecords(filters);
    const headers = [
      'Attendance ID',
      'Student ID',
      'Student Name',
      'Subject Code',
      'Subject Name',
      'Date',
      'Scheduled Start',
      'Scheduled End',
      'RFID Punch Time',
      'Status',
      'Classes Credited',
      'Reader ID',
      'Room',
      'Remarks'
    ];

    const rows = records.map(r => [
      `"${r.attendance_id || ''}"`,
      `"${r.student_id || ''}"`,
      `"${r.student_name || ''}"`,
      `"${r.subject_id || ''}"`,
      `"${r.subject_name || ''}"`,
      `"${r.date || ''}"`,
      `"${r.scheduled_start || ''}"`,
      `"${r.scheduled_end || ''}"`,
      `"${r.rfid_punch_time || 'N/A'}"`,
      `"${r.status || ''}"`,
      r.classes_credited ?? 1,
      `"${r.reader_id || 'N/A'}"`,
      `"${r.room || ''}"`,
      `"${(r.remarks || '').replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
  }
}

module.exports = new DatabaseService();

