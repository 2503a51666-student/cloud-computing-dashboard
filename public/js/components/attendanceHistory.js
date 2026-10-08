/**
 * SmartAttend - Attendance History Component
 */

export function renderAttendanceHistory(records, subjects, currentFilters = {}) {
  return `
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 22px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em;">
        Attendance History & Logs
      </h2>
      <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
        Detailed audit trail of all RFID taps, schedule evaluations, and credited academic periods.
      </p>
    </div>

    <!-- Filter Toolbar Card -->
    <div class="card" style="margin-bottom: 20px; padding: 16px 20px;">
      <div style="display: grid; grid-template-columns: 2fr 1.5fr 1.2fr 1fr auto; gap: 12px; align-items: flex-end;">
        <!-- Search -->
        <div>
          <label class="form-label" style="font-size: 11px;">Search Records</label>
          <input type="text" id="history-search-input" class="form-control" placeholder="Search subject, room, remarks..." value="${currentFilters.search || ''}">
        </div>

        <!-- Subject Filter -->
        <div>
          <label class="form-label" style="font-size: 11px;">Subject</label>
          <select id="history-subject-select" class="form-control">
            <option value="">All Enrolled Subjects</option>
            ${subjects.map(s => `<option value="${s.subject_id}" ${currentFilters.subject_id === s.subject_id ? 'selected' : ''}>${s.subject_name}</option>`).join('')}
          </select>
        </div>

        <!-- Status Filter -->
        <div>
          <label class="form-label" style="font-size: 11px;">Status</label>
          <select id="history-status-select" class="form-control">
            <option value="ALL" ${!currentFilters.status || currentFilters.status === 'ALL' ? 'selected' : ''}>All Statuses</option>
            <option value="ON TIME" ${currentFilters.status === 'ON TIME' ? 'selected' : ''}>On Time</option>
            <option value="LATE" ${currentFilters.status === 'LATE' ? 'selected' : ''}>Late</option>
            <option value="VERY LATE" ${currentFilters.status === 'VERY LATE' ? 'selected' : ''}>Very Late</option>
            <option value="ABSENT" ${currentFilters.status === 'ABSENT' ? 'selected' : ''}>Absent</option>
          </select>
        </div>

        <!-- Date Filter -->
        <div>
          <label class="form-label" style="font-size: 11px;">Date</label>
          <input type="date" id="history-date-input" class="form-control" value="${currentFilters.date || ''}">
        </div>

        <!-- Reset Button -->
        <div>
          <button id="btn-reset-history-filters" class="btn btn-secondary" style="padding: 9px 14px; font-size: 12px;">
            Reset
          </button>
        </div>
      </div>
    </div>

    <!-- Attendance Records Table Card -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <span>Attendance Records</span>
          <span style="font-size: 12px; font-weight: 500; color: var(--text-muted); margin-left: 6px;">
            (${records.length} total entries)
          </span>
        </div>
        <div>
          <a href="/api/reports/export" target="_blank" class="btn btn-outline btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Export CSV
          </a>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Subject</th>
              <th>Class Time</th>
              <th>RFID Tap Time</th>
              <th>Status</th>
              <th>Room</th>
              <th>Credits</th>
              <th>Remarks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${records.length === 0 ? `
              <tr>
                <td colspan="9" style="text-align: center; padding: 36px; color: var(--text-muted);">
                  No attendance records matched your filter criteria.
                </td>
              </tr>
            ` : records.map(r => renderRecordRow(r)).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Details Audit Modal Container -->
    <div id="record-details-modal" style="display: none;"></div>
  `;
}

function renderRecordRow(r) {
  let badge = `<span class="badge badge-absent">${r.status}</span>`;
  if (r.status === 'ON TIME') badge = `<span class="badge badge-ontime">ON TIME</span>`;
  else if (r.status === 'LATE') badge = `<span class="badge badge-late">LATE</span>`;
  else if (r.status === 'VERY LATE') badge = `<span class="badge badge-verylate">VERY LATE</span>`;
  else if (r.status === 'ABSENT') badge = `<span class="badge badge-critical">ABSENT</span>`;

  return `
    <tr>
      <td style="font-weight: 600; font-feature-settings: 'tnum'; white-space: nowrap;">${r.date}</td>
      <td>
        <div style="font-weight: 600; color: var(--text-primary);">${r.subject_name}</div>
        <div style="font-size: 11px; color: var(--text-muted);">${r.subject_id}</div>
      </td>
      <td style="font-feature-settings: 'tnum'; font-size: 12px;">${r.scheduled_start} – ${r.scheduled_end}</td>
      <td style="font-feature-settings: 'tnum'; font-weight: 600; color: var(--primary);">${r.rfid_punch_time || '<span style="color: var(--text-light)">No tap</span>'}</td>
      <td>${badge}</td>
      <td>${r.room || '—'}</td>
      <td style="font-weight: 700; text-align: center;">${r.classes_credited ?? 1}</td>
      <td style="font-size: 12px; color: var(--text-secondary); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.remarks || '—'}</td>
      <td>
        <button class="btn btn-outline btn-sm btn-view-audit" data-record='${JSON.stringify(r).replace(/'/g, "&apos;")}'>
          Details
        </button>
      </td>
    </tr>
  `;
}
