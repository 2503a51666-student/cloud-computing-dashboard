/**
 * SmartAttend - Student Profile & Settings Component
 */

export function renderProfile(student, rules) {
  const prefs = student.notification_prefs || {
    reminder_30m: true,
    reminder_15m: true,
    reminder_5m: true,
    email_alerts: true,
    sound_enabled: true
  };

  return `
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 22px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em;">
        Student Profile & System Preferences
      </h2>
      <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
        Manage your registered academic credentials, RFID card binding, and class reminder alerts.
      </p>
    </div>

    <div class="grid-2-1">
      <!-- Profile Details Card -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--primary);"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Academic Identification
          </div>
          <span class="badge badge-safe">${student.status || 'Active'}</span>
        </div>

        <div style="display: flex; align-items: center; gap: 18px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">
          <div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; box-shadow: var(--shadow-md);">
            ${student.avatar || student.name.charAt(0)}
          </div>
          <div>
            <h3 style="font-size: 19px; font-weight: 800; color: var(--text-primary);">${student.name}</h3>
            <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">
              Roll ID: <strong>${student.student_id}</strong>
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
              ${student.department}
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          <div>
            <label class="form-label">Full Name</label>
            <input type="text" class="form-control" value="${student.name}" readonly style="background: var(--bg-subtle);">
          </div>
          <div>
            <label class="form-label">Student ID / Roll No</label>
            <input type="text" class="form-control" value="${student.student_id}" readonly style="background: var(--bg-subtle);">
          </div>
          <div>
            <label class="form-label">Department</label>
            <input type="text" class="form-control" value="${student.department}" readonly style="background: var(--bg-subtle);">
          </div>
          <div>
            <label class="form-label">Year & Semester</label>
            <input type="text" class="form-control" value="${student.year} (${student.semester || 'Sem 6'})" readonly style="background: var(--bg-subtle);">
          </div>
          <div>
            <label class="form-label">Section</label>
            <input type="text" class="form-control" value="Section ${student.section}" readonly style="background: var(--bg-subtle);">
          </div>
          <div>
            <label class="form-label">Email Address</label>
            <input type="email" class="form-control" value="${student.email}" readonly style="background: var(--bg-subtle);">
          </div>
        </div>
      </div>

      <!-- RFID Card & Preferences Card -->
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- RFID Card Binding -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--primary);"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
              RFID Smart Card
            </div>
            <span class="badge badge-safe">Verified</span>
          </div>

          <div style="background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: var(--radius-md); padding: 18px; color: white; margin-bottom: 12px; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #94a3b8; text-transform: uppercase;">SmartAttend RFID ID</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <div style="font-size: 17px; font-family: monospace; letter-spacing: 0.2em; margin-bottom: 12px; color: #f8fafc;" id="masked-card-number">
              •••• •••• ${student.rfid_card_id ? student.rfid_card_id.slice(-4) : '1042'}
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8;">
              <span>Card Holder: ${student.name.toUpperCase()}</span>
              <span>Status: ACTIVE</span>
            </div>
          </div>

          <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">
            🔒 For physical security, full 64-bit RFID identifiers are masked in student views. If your card is lost or damaged, visit the campus administrator immediately to revoke and re-issue.
          </div>
        </div>

        <!-- Class Reminder System Preferences -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--primary);"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              Class Reminder System
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            <label style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; cursor: pointer;">
              <span>30 Minutes before class</span>
              <input type="checkbox" id="pref-remind-30m" ${prefs.reminder_30m ? 'checked' : ''} style="accent-color: var(--primary); width: 16px; height: 16px;">
            </label>
            <label style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; cursor: pointer;">
              <span>15 Minutes before class</span>
              <input type="checkbox" id="pref-remind-15m" ${prefs.reminder_15m ? 'checked' : ''} style="accent-color: var(--primary); width: 16px; height: 16px;">
            </label>
            <label style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; cursor: pointer;">
              <span>5 Minutes before class</span>
              <input type="checkbox" id="pref-remind-5m" ${prefs.reminder_5m ? 'checked' : ''} style="accent-color: var(--primary); width: 16px; height: 16px;">
            </label>
            <hr style="border: none; border-top: 1px solid var(--border-color); margin: 4px 0;">
            <label style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; cursor: pointer;">
              <span>Audio Chime on Tap / Notification</span>
              <input type="checkbox" id="pref-sound" ${prefs.sound_enabled ? 'checked' : ''} style="accent-color: var(--primary); width: 16px; height: 16px;">
            </label>
            <label style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; cursor: pointer;">
              <span>AWS SNS Email / SMS Alerts</span>
              <input type="checkbox" id="pref-email" ${prefs.email_alerts ? 'checked' : ''} style="accent-color: var(--primary); width: 16px; height: 16px;">
            </label>
          </div>

          <button id="btn-save-prefs" class="btn btn-primary btn-sm" style="margin-top: 16px; width: 100%;">
            Save Reminder Preferences
          </button>
        </div>
      </div>
    </div>
  `;
}
