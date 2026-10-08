/**
 * SmartAttend - Live Classroom RFID Attendance Monitor
 * Designed for podium display computers in classrooms and laboratories.
 */

export function renderLiveMonitor(data) {
  const currentClass = data.nextClass || {
    subject_name: 'Computer Networks',
    room: 'CSE Lab 2',
    faculty: 'Dr. B. N. Rao',
    reader_id: 'READER-LAB-02',
    start_time: '11:00',
    end_time: '12:00'
  };

  const recentScans = data.recentRecords || [];

  return `
    <!-- Top Classroom Header -->
    <div style="background: linear-gradient(135deg, #0f172a, #1e293b); color: white; border-radius: var(--radius-xl); padding: 24px 28px; margin-bottom: 24px; box-shadow: var(--shadow-lg);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 800; background: #2563eb; color: white; padding: 3px 9px; border-radius: var(--radius-full); text-transform: uppercase; letter-spacing: 0.06em;">
              CLASSROOM PODIUM DISPLAY
            </span>
            <span style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #10b981; font-weight: 600;">
              <span class="pulse-dot"></span> LIVE SCANNER ACTIVE
            </span>
          </div>
          <h1 style="font-size: 26px; font-weight: 800; letter-spacing: -0.02em;">
            ${currentClass.subject_name}
          </h1>
          <div style="font-size: 13.5px; color: #94a3b8; margin-top: 4px; display: flex; gap: 18px; flex-wrap: wrap;">
            <span>📍 Location: <strong>${currentClass.room}</strong></span>
            <span>📡 RFID Reader: <strong>${currentClass.reader_id}</strong></span>
            <span>👨‍🏫 Faculty: <strong>${currentClass.faculty}</strong></span>
            <span>⏰ Slot: <strong>${currentClass.start_time} – ${currentClass.end_time}</strong></span>
          </div>
        </div>

        <!-- Live Clock & Tap Trigger -->
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">
          <div style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.15); padding: 8px 18px; border-radius: var(--radius-md); text-align: right;">
            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Session Time</div>
            <div style="font-size: 20px; font-weight: 800; font-feature-settings: 'tnum'; color: #60a5fa;" id="podium-live-clock">
              --:--:--
            </div>
          </div>
          <button id="btn-podium-scan-card" class="btn btn-primary btn-sm" style="border-radius: var(--radius-full);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            Simulate Student Tap
          </button>
        </div>
      </div>
    </div>

    <!-- Live Metrics Strip -->
    <div class="grid-4" style="margin-bottom: 24px;">
      <div class="card stat-card">
        <span class="stat-label">Total Enrolled</span>
        <div class="stat-value">48</div>
        <div class="stat-subtext">Section A Students</div>
      </div>
      <div class="card stat-card">
        <span class="stat-label">Present (On Time)</span>
        <div class="stat-value" style="color: #059669;" id="podium-ontime-count">38</div>
        <div class="stat-subtext">Tapped before grace cutoff</div>
      </div>
      <div class="card stat-card">
        <span class="stat-label">Late Arrivals</span>
        <div class="stat-value" style="color: #d97706;" id="podium-late-count">4</div>
        <div class="stat-subtext">Tapped during late threshold</div>
      </div>
      <div class="card stat-card">
        <span class="stat-label">Class Attendance</span>
        <div class="stat-value" style="color: var(--primary);" id="podium-turnout-rate">87.5%</div>
        <div class="stat-subtext">42 of 48 in session</div>
      </div>
    </div>

    <!-- Live Scans Feed Table -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--primary);"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Recent RFID Tap Stream
          </div>
          <div class="card-subtitle">Real-time incoming student card swipes from ${currentClass.reader_id}</div>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
          <span class="pulse-dot"></span> Listening on AWS IoT / EventBridge
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Roll ID</th>
              <th>Department & Section</th>
              <th>Scan Time</th>
              <th>Evaluation Status</th>
              <th>Credited</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody id="podium-scans-tbody">
            ${recentScans.slice(0, 10).map(s => renderPodiumRow(s)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPodiumRow(s) {
  let badge = `<span class="badge badge-ontime">ON TIME</span>`;
  if (s.status === 'LATE') badge = `<span class="badge badge-late">LATE</span>`;
  else if (s.status === 'VERY LATE') badge = `<span class="badge badge-verylate">VERY LATE</span>`;
  else if (s.status === 'NOT COUNTED') badge = `<span class="badge badge-absent">NOT COUNTED</span>`;

  return `
    <tr class="scan-stream-row" style="animation: fadeIn 0.3s ease;">
      <td style="font-weight: 700; color: var(--text-primary);">${s.student_name || 'Student'}</td>
      <td style="font-feature-settings: 'tnum'; font-weight: 600;">${s.student_id || '23CS01042'}</td>
      <td style="font-size: 12px; color: var(--text-secondary);">CSE - Sec A</td>
      <td style="font-feature-settings: 'tnum'; font-weight: 700; color: var(--primary);">${s.rfid_punch_time || '10:57:00'}</td>
      <td>${badge}</td>
      <td style="font-weight: 700; text-align: center;">${s.classes_credited ?? 1}</td>
      <td style="font-size: 12px; color: var(--text-muted);">${s.remarks || 'Attendance recorded'}</td>
    </tr>
  `;
}
