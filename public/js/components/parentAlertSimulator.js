/**
 * SmartAttend - Automated Parent Alert Simulator (Amazon SNS)
 * Demonstrates cloud notification pipelines delivering SMS/Email alerts to parents.
 */

export function renderParentAlertSimulatorModal(students, defaultStudentId = '23CS01048') {
  const currentStudent = students.find(s => s.student_id === defaultStudentId) || students[0];

  return `
    <div class="modal-backdrop" id="parent-alert-modal-backdrop">
      <div class="modal-content" style="max-width: 620px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 34px; height: 34px; border-radius: var(--radius-md); background: linear-gradient(135deg, #dc2626, #b91c1c); display: flex; align-items: center; justify-content: center; color: white;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <div>
              <h3 style="font-size: 17px; font-weight: 700; color: var(--text-primary);">Automated Parent Alert Simulator</h3>
              <div style="font-size: 11.5px; color: var(--text-muted);">Amazon SNS Notification Pipeline (SMS & Email Dispatch)</div>
            </div>
          </div>
          <button id="btn-close-parent-alert-modal" style="background: none; border: none; font-size: 22px; color: var(--text-muted); cursor: pointer; padding: 4px;">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Student Selector -->
          <div class="form-group">
            <label class="form-label">Select Student for Parent Alert</label>
            <select id="parent-alert-student-select" class="form-control">
              ${students.map(s => `
                <option value="${s.student_id}" ${s.student_id === defaultStudentId ? 'selected' : ''}>
                  ${s.name} (${s.student_id}) — Parent: ${s.parent_name || 'Guardian'} (${s.parent_phone || '+91 94401 XXXXX'})
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Alert Trigger Reason -->
          <div class="form-group">
            <label class="form-label">Trigger Condition</label>
            <select id="parent-alert-trigger-reason" class="form-control">
              <option value="CRITICAL_SHORTAGE">Attendance Dropped Below 75% (Exam Debarment Risk)</option>
              <option value="CONSECUTIVE_ABSENCE">3 Consecutive Unexcused Classes Missed</option>
              <option value="LAB_BUNK">Mandatory Practical Laboratory Session Missed</option>
              <option value="EXAM_CONDONATION">End-Semester Condonation Penalty Notice</option>
            </select>
          </div>

          <!-- Smartphone SMS Preview Box -->
          <div style="background: #0f172a; border-radius: var(--radius-xl); padding: 20px; color: white; margin-top: 14px; box-shadow: var(--shadow-lg);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8; border-bottom: 1px solid #1e293b; padding-bottom: 8px; margin-bottom: 14px;">
              <span>📲 SMS GATEWAY • AWS SNS</span>
              <span>To: <strong id="preview-parent-phone" style="color: #60a5fa;">${currentStudent.parent_phone || '+91 94403 45678'}</strong></span>
            </div>

            <!-- Chat Bubble -->
            <div style="background: #1e293b; border-radius: var(--radius-lg); padding: 14px 16px; border-left: 4px solid #ef4444; max-width: 90%;">
              <div style="font-size: 11px; font-weight: 700; color: #f87171; margin-bottom: 4px; text-transform: uppercase;">
                SMARTATTEND CAMPUS SYSTEM
              </div>
              <p id="preview-sms-text" style="font-size: 13px; line-height: 1.45; color: #f1f5f9;">
                URGENT: SmartAttend Campus Alert. Your ward ${currentStudent.name} (Roll: ${currentStudent.student_id}) has overall attendance below mandatory 75% requirement. End-semester hall ticket clearance is at risk. Please contact the Department Coordinator.
              </p>
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; margin-top: 8px;">
                <span>Amazon SNS Topic: arn:aws:sns:us-east-1:parent-alerts</span>
                <span>Just Now ✓✓</span>
              </div>
            </div>
          </div>

          <!-- Live Dispatch Status Preview -->
          <div id="parent-dispatch-status" style="margin-top: 14px;"></div>
        </div>

        <div class="modal-footer">
          <button id="btn-close-parent-alert-footer" class="btn btn-secondary btn-sm">Close</button>
          <button id="btn-send-sns-alert-now" class="btn btn-primary" style="background: #dc2626; border-color: #dc2626;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            DISPATCH AWS SNS ALERT NOW
          </button>
        </div>
      </div>
    </div>
  `;
}
