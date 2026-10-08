/**
 * SmartAttend - Admin & Faculty Management Dashboard
 */

export function renderAdminDashboard(adminData, currentTab = 'rules') {
  const rules = adminData.rules || {};
  const students = adminData.students || [];
  const subjects = adminData.subjects || [];
  const readers = adminData.readers || [];
  const timetable = adminData.timetable || [];

  return `
    <div style="margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span style="background: #7c3aed; color: white; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: var(--radius-full); text-transform: uppercase;">
            ADMIN / FACULTY PORTAL
          </span>
          <span style="font-size: 12px; color: var(--text-muted);">
            Dr. Ramesh Sharma (Head of Department)
          </span>
        </div>
        <h2 style="font-size: 22px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em;">
          Institutional Administration & Engine Controls
        </h2>
      </div>

      <div style="display: flex; gap: 10px;">
        <button id="btn-admin-open-sns-sim" class="btn btn-outline btn-sm" style="color: #dc2626; border-color: #fca5a5;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          Parent SNS Alert Simulator
        </button>
        <a href="/api/reports/export" target="_blank" class="btn btn-primary btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          Export Full Attendance CSV
        </a>
      </div>
    </div>

    <!-- Admin Top Metrics Grid -->
    <div class="grid-4" style="margin-bottom: 24px;">
      <div class="card stat-card">
        <span class="stat-label">Total Enrolled Students</span>
        <div class="stat-value" id="admin-total-students">${students.length}</div>
        <div class="stat-subtext">Across CSE Departments</div>
      </div>
      <div class="card stat-card">
        <span class="stat-label">Active RFID Readers</span>
        <div class="stat-value" style="color: #059669;">${readers.filter(r => r.status === 'Online').length} / ${readers.length}</div>
        <div class="stat-subtext">All hardware nodes online</div>
      </div>
      <div class="card stat-card">
        <span class="stat-label">Configured Subjects</span>
        <div class="stat-value" style="color: var(--primary);">${subjects.length}</div>
        <div class="stat-subtext">Term 6 Curriculum</div>
      </div>
      <div class="card stat-card">
        <span class="stat-label">Low Attendance Alert (<75%)</span>
        <div class="stat-value" style="color: #dc2626;">1 Student</div>
        <div class="stat-subtext" style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
          <span>Dheeraj (70.6%) in Warning</span>
          <button class="btn btn-outline btn-sm btn-admin-trigger-sns" data-id="23CS01048" style="font-size: 10.5px; padding: 2px 6px; color: #dc2626; border-color: #fca5a5;">Dispatch SNS</button>
        </div>
      </div>
    </div>

    <!-- Admin Navigation Tabs -->
    <div class="card" style="padding: 6px; margin-bottom: 24px; background: var(--bg-subtle);">
      <div style="display: flex; gap: 4px; overflow-x: auto;">
        <button class="btn btn-sm admin-tab-btn ${currentTab === 'rules' ? 'btn-primary' : 'btn-secondary'}" data-tab="rules">
          ⚙️ Attendance Rules Engine
        </button>
        <button class="btn btn-sm admin-tab-btn ${currentTab === 'leaves' ? 'btn-primary' : 'btn-secondary'}" data-tab="leaves">
          📝 Leave & OD Approvals (${(adminData.leaveRequests || []).filter(l => l.status === 'PENDING').length} Pending)
        </button>
        <button class="btn btn-sm admin-tab-btn ${currentTab === 'students' ? 'btn-primary' : 'btn-secondary'}" data-tab="students">
          👥 Students Directory (${students.length})
        </button>
        <button class="btn btn-sm admin-tab-btn ${currentTab === 'subjects' ? 'btn-primary' : 'btn-secondary'}" data-tab="subjects">
          📚 Subjects (${subjects.length})
        </button>
        <button class="btn btn-sm admin-tab-btn ${currentTab === 'timetable' ? 'btn-primary' : 'btn-secondary'}" data-tab="timetable">
          📅 Timetable Management
        </button>
        <button class="btn btn-sm admin-tab-btn ${currentTab === 'readers' ? 'btn-primary' : 'btn-secondary'}" data-tab="readers">
          📡 RFID Readers (${readers.length})
        </button>
        <button class="btn btn-sm admin-tab-btn ${currentTab === 'reports' ? 'btn-primary' : 'btn-secondary'}" data-tab="reports">
          📊 Reports & Analytics
        </button>
      </div>
    </div>

    <!-- Admin Tab Content Body -->
    <div id="admin-tab-content">
      ${renderAdminTabBody(currentTab, { rules, students, subjects, readers, timetable, leaveRequests: adminData.leaveRequests || [], parentAlerts: adminData.parentAlerts || [] })}
    </div>

    <!-- Reusable Admin Modal Container -->
    <div id="admin-modal-container" style="display: none;"></div>
  `;
}

function renderAdminTabBody(tab, data) {
  switch (tab) {
    case 'rules':
      return renderRulesEngineTab(data.rules);
    case 'leaves':
      return renderAdminLeavesTab(data.leaveRequests);
    case 'students':
      return renderStudentsTab(data.students);
    case 'subjects':
      return renderSubjectsTab(data.subjects);
    case 'timetable':
      return renderTimetableTab(data.timetable, data.subjects, data.readers);
    case 'readers':
      return renderReadersTab(data.readers);
    case 'reports':
      return renderReportsTab();
    default:
      return renderRulesEngineTab(data.rules);
  }
}

/**
 * 1b. LEAVE & OD APPROVALS CONSOLE
 */
function renderAdminLeavesTab(leaveRequests) {
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Leave & On-Duty (OD) Approval Queue</h3>
          <p class="card-subtitle">Verify student medical certificates and hackathon/sports representations to grant attendance condonation.</p>
        </div>
        <span class="badge badge-info">${leaveRequests.filter(l => l.status === 'PENDING').length} Pending Action</span>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Student</th>
              <th>Type</th>
              <th>Dates</th>
              <th>Reason</th>
              <th>Proof Document</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${leaveRequests.length === 0 ? `
              <tr>
                <td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">
                  No leave or on-duty requests currently logged.
                </td>
              </tr>
            ` : leaveRequests.map(l => `
              <tr>
                <td style="font-family: monospace; font-weight: 700;">${l.leave_id}</td>
                <td>
                  <strong>${l.student_name || 'Student'}</strong>
                  <div style="font-size: 11px; color: var(--text-muted);">${l.student_id}</div>
                </td>
                <td><span class="badge ${l.type === 'ON_DUTY' ? 'badge-info' : 'badge-warning'}">${l.type_label || l.type}</span></td>
                <td style="font-feature-settings: 'tnum'; font-size: 12px;">${l.date_from} ${l.date_to !== l.date_from ? `– ${l.date_to}` : ''}</td>
                <td style="max-width: 220px; font-size: 12px; color: var(--text-secondary);">${l.reason}</td>
                <td style="font-size: 11.5px; color: var(--primary);">📎 ${l.document_ref || 'Certificate.pdf'}</td>
                <td>
                  <span class="badge ${l.status === 'APPROVED' ? 'badge-safe' : (l.status === 'PENDING' ? 'badge-warning' : 'badge-critical')}">
                    ${l.status}
                  </span>
                </td>
                <td>
                  ${l.status === 'PENDING' ? `
                    <div style="display: flex; gap: 6px;">
                      <button class="btn btn-primary btn-sm btn-admin-approve-leave" data-id="${l.leave_id}">
                        ✓ Approve
                      </button>
                      <button class="btn btn-outline btn-sm btn-admin-reject-leave" data-id="${l.leave_id}" style="color: #dc2626;">
                        ✕ Reject
                      </button>
                    </div>
                  ` : `
                    <span style="font-size: 11px; color: var(--text-muted);">Processed</span>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * 1. ATTENDANCE RULES ENGINE CONFIGURATION
 */
function renderRulesEngineTab(rules) {
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Attendance Evaluation Engine Configuration</h3>
          <p class="card-subtitle">Define automated thresholds, grace intervals, and consecutive period policies executed by AWS Lambda.</p>
        </div>
        <span class="badge badge-info">AWS Lambda Sync</span>
      </div>

      <form id="admin-rules-form" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
        <div class="form-group">
          <label class="form-label">Minimum Target Attendance (%)</label>
          <input type="number" id="rule-min-percent" class="form-control" min="65" max="90" value="${rules.minimum_percentage || 75}">
          <small style="color: var(--text-muted); font-size: 11px;">Default threshold between 75% and 80% mandated by institution.</small>
        </div>

        <div class="form-group">
          <label class="form-label">Grace Period (Minutes)</label>
          <input type="number" id="rule-grace-period" class="form-control" min="0" max="15" value="${rules.grace_period_minutes ?? 5}">
          <small style="color: var(--text-muted); font-size: 11px;">Scans up to this many minutes after class start are marked <strong>ON TIME</strong>.</small>
        </div>

        <div class="form-group">
          <label class="form-label">Late Threshold (Minutes)</label>
          <input type="number" id="rule-late-thresh" class="form-control" min="5" max="30" value="${rules.late_threshold_minutes ?? 15}">
          <small style="color: var(--text-muted); font-size: 11px;">Scans after grace up to this minute are evaluated as <strong>LATE</strong>.</small>
        </div>

        <div class="form-group">
          <label class="form-label">Very Late Threshold (Minutes)</label>
          <input type="number" id="rule-verylate-thresh" class="form-control" min="15" max="45" value="${rules.very_late_threshold_minutes ?? 30}">
          <small style="color: var(--text-muted); font-size: 11px;">Arrivals between late and very-late threshold.</small>
        </div>

        <div class="form-group">
          <label class="form-label">Attendance Cutoff Time (Minutes)</label>
          <input type="number" id="rule-cutoff-mins" class="form-control" min="30" max="60" value="${rules.cutoff_minutes ?? 45}">
          <small style="color: var(--text-muted); font-size: 11px;">After this cutoff, scans are evaluated as <strong>NOT COUNTED</strong>.</small>
        </div>

        <div class="form-group">
          <label class="form-label">Duplicate Scan Prevention Window (Seconds)</label>
          <input type="number" id="rule-dup-window" class="form-control" min="60" max="600" value="${rules.duplicate_scan_window_seconds ?? 300}">
          <small style="color: var(--text-muted); font-size: 11px;">Duplicate taps within 300s (5 mins) are rejected to prevent abuse.</small>
        </div>

        <div class="form-group" style="grid-column: span 2;">
          <label class="form-label">Multiple-Consecutive-Period Crediting Policy</label>
          <select id="rule-consecutive-policy" class="form-control">
            <option value="AUTO_CREDIT_QUALIFIED" ${rules.consecutive_period_policy === 'AUTO_CREDIT_QUALIFIED' ? 'selected' : ''}>
              Auto-Credit Qualified Subsequent Periods (Single entry tap credits valid consecutive lab periods)
            </option>
            <option value="REQUIRE_PERIOD_TAP" ${rules.consecutive_period_policy === 'REQUIRE_PERIOD_TAP' ? 'selected' : ''}>
              Require Periodic Tap (Students must tap card at start of each individual period)
            </option>
          </select>
        </div>

        <div style="grid-column: span 2; display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px;">
          <button type="submit" class="btn btn-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Save & Publish Attendance Rules
          </button>
        </div>
      </form>
    </div>
  `;
}

/**
 * 2. STUDENTS DIRECTORY TAB
 */
function renderStudentsTab(students) {
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Enrolled Students & RFID Card Bindings</h3>
          <p class="card-subtitle">Manage student enrollment, roll identifiers, and RFID tag associations.</p>
        </div>
        <button id="btn-admin-add-student" class="btn btn-primary btn-sm">
          + Add New Student
        </button>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Full Name</th>
              <th>Department</th>
              <th>Year / Sem</th>
              <th>Section</th>
              <th>RFID Card ID</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${students.map(s => `
              <tr>
                <td style="font-weight: 700; font-feature-settings: 'tnum';">${s.student_id}</td>
                <td style="font-weight: 600;">${s.name}</td>
                <td>${s.department}</td>
                <td>${s.year}</td>
                <td>Section ${s.section}</td>
                <td style="font-family: monospace; font-weight: 700; color: var(--primary);">${s.rfid_card_id}</td>
                <td style="font-size: 12px; color: var(--text-muted);">${s.email}</td>
                <td><span class="badge badge-safe">${s.status || 'Active'}</span></td>
                <td>
                  <div style="display: flex; gap: 6px;">
                    <button class="btn btn-outline btn-sm btn-edit-student" data-id="${s.student_id}">Edit</button>
                    <button class="btn btn-outline btn-sm btn-delete-student" data-id="${s.student_id}" style="color: #dc2626; border-color: #fecaca;">Delete</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * 3. SUBJECTS TAB
 */
function renderSubjectsTab(subjects) {
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Academic Courses & Attendance Requirements</h3>
          <p class="card-subtitle">Configured curriculum subjects with designated faculty and target thresholds.</p>
        </div>
        <button id="btn-admin-add-subject" class="btn btn-primary btn-sm">
          + Add New Subject
        </button>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Subject Name</th>
              <th>Faculty</th>
              <th>Credits</th>
              <th>Attendance Requirement</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${subjects.map(s => `
              <tr>
                <td style="font-weight: 700; color: var(--primary);">${s.subject_code}</td>
                <td style="font-weight: 600;">${s.subject_name}</td>
                <td>${s.faculty}</td>
                <td>${s.credits} Credits</td>
                <td><span class="badge badge-info">${s.attendance_requirement || 75}%</span></td>
                <td>
                  <button class="btn btn-outline btn-sm btn-edit-subject" data-id="${s.subject_id}">Edit</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * 4. TIMETABLE TAB
 */
function renderTimetableTab(timetable, subjects, readers) {
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Master Timetable & Classroom Allocation</h3>
          <p class="card-subtitle">Map courses to days, time slots, physical rooms, and assigned RFID scanners.</p>
        </div>
        <button id="btn-admin-add-timetable" class="btn btn-primary btn-sm">
          + Schedule New Class Slot
        </button>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Time Slot</th>
              <th>Subject</th>
              <th>Faculty</th>
              <th>Room</th>
              <th>Consecutive Periods</th>
              <th>RFID Reader</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${timetable.map(t => `
              <tr>
                <td style="font-weight: 700;">${t.day}</td>
                <td style="font-feature-settings: 'tnum'; font-weight: 600;">${t.start_time} – ${t.end_time}</td>
                <td>${t.subject_name}</td>
                <td>${t.faculty}</td>
                <td>${t.room}</td>
                <td>
                  ${t.consecutive ? `<span class="badge badge-warning">${t.periods} Periods</span>` : '1 Period'}
                </td>
                <td style="font-family: monospace; font-size: 12px; color: var(--primary);">${t.reader_id}</td>
                <td>
                  <button class="btn btn-outline btn-sm btn-delete-timetable" data-id="${t.timetable_id}" style="color: #dc2626;">Remove</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * 5. RFID READERS FLEET TAB
 */
function renderReadersTab(readers) {
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">RFID Reader Fleet & Hardware Telemetry</h3>
          <p class="card-subtitle">Active classroom readers connected via AWS IoT Core / API Gateway.</p>
        </div>
        <button id="btn-admin-add-reader" class="btn btn-primary btn-sm">
          + Register New Reader
        </button>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Reader ID</th>
              <th>Location</th>
              <th>Room</th>
              <th>Hardware Model</th>
              <th>IP Address</th>
              <th>Status</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            ${readers.map(r => `
              <tr>
                <td style="font-weight: 700; font-family: monospace; color: var(--primary);">${r.reader_id}</td>
                <td>${r.location}</td>
                <td style="font-weight: 600;">${r.room}</td>
                <td style="font-size: 12px;">${r.hardware_model || 'ESP32-RC522-AWS-IOT'}</td>
                <td style="font-family: monospace; font-size: 12px;">${r.ip_address || '192.168.10.x'}</td>
                <td>
                  <span class="badge ${r.status === 'Online' ? 'badge-safe' : 'badge-critical'}">
                    ${r.status}
                  </span>
                </td>
                <td style="font-size: 12px; color: var(--text-muted);">Just now (Active)</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * 6. REPORTS & ANALYTICS TAB
 */
function renderReportsTab() {
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Attendance Reports & CSV Export Center</h3>
          <p class="card-subtitle">Generate institutional audits, student compliance sheets, and compliance summaries.</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
        <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 18px; border: 1px solid var(--border-color);">
          <div style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">Daily Attendance Audit</div>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">Complete timestamped tap history for today.</p>
          <a href="/api/reports/export?date=2026-09-17" target="_blank" class="btn btn-outline btn-sm" style="width: 100%;">
            Download Today's CSV
          </a>
        </div>

        <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 18px; border: 1px solid var(--border-color);">
          <div style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">Subject Compliance Report</div>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">Full breakdown by course code and faculty.</p>
          <a href="/api/reports/export" target="_blank" class="btn btn-outline btn-sm" style="width: 100%;">
            Download Subject CSV
          </a>
        </div>

        <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 18px; border: 1px solid var(--border-color);">
          <div style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">Semester Rollup Report</div>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">All historical term records and student %.</p>
          <a href="/api/reports/export" target="_blank" class="btn btn-primary btn-sm" style="width: 100%;">
            Export Complete Term CSV
          </a>
        </div>
      </div>
    </div>
  `;
}
