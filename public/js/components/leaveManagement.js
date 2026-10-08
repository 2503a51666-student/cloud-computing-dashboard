/**
 * SmartAttend - Leave & On-Duty (OD) Management Component
 */

export function renderLeaveManagementPage(student, leaveRequests, subjects, isAdmin = false) {
  const pendingLeaves = leaveRequests.filter(l => l.status === 'PENDING');
  const pastLeaves = leaveRequests.filter(l => l.status !== 'PENDING');

  return `
    <div style="margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
      <div>
        <h2 style="font-size: 22px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em;">
          Leave & On-Duty (OD) Management
        </h2>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
          Submit Medical Certificates, Hackathon/Sports On-Duty requests, and track administrative condonation approvals.
        </p>
      </div>

      ${!isAdmin ? `
        <button id="btn-open-leave-form" class="btn btn-primary btn-sm">
          + Apply for Leave / OD
        </button>
      ` : ''}
    </div>

    <!-- Active Summary Cards -->
    <div class="grid-3" style="margin-bottom: 24px;">
      <div class="card stat-card">
        <span class="stat-label">Pending Reviews</span>
        <div class="stat-value" style="color: #d97706;">${pendingLeaves.length}</div>
        <div class="stat-subtext">Awaiting Dean/HOD verification</div>
      </div>
      <div class="card stat-card">
        <span class="stat-label">Approved On-Duty Credits</span>
        <div class="stat-value" style="color: #059669;">
          +${leaveRequests.filter(l => l.status === 'APPROVED').reduce((acc, l) => acc + (l.classes_credited || 2), 0)} Credits
        </div>
        <div class="stat-subtext">Applied to semester attendance</div>
      </div>
      <div class="card stat-card">
        <span class="stat-label">Total Applications</span>
        <div class="stat-value" style="color: var(--primary);">${leaveRequests.length}</div>
        <div class="stat-subtext">Academic Year 2026</div>
      </div>
    </div>

    <!-- Split: Apply Form (if student) + History / Approvals -->
    <div class="grid-2-1">
      <!-- Leave Applications List -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--primary);"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Submitted Requests & Audit History
          </div>
          <span style="font-size: 12px; color: var(--text-muted);">${leaveRequests.length} recorded</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${leaveRequests.length === 0 ? `
            <div style="padding: 36px; text-align: center; color: var(--text-muted); font-size: 13px;">
              No leave or on-duty requests submitted yet.
            </div>
          ` : leaveRequests.map(l => renderLeaveCard(l, isAdmin)).join('')}
        </div>
      </div>

      <!-- Quick Apply or Info Box -->
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- Application Form Card -->
        <div class="card" id="leave-form-container">
          <div class="card-header">
            <h3 class="card-title" style="font-size: 15px;">New Leave / OD Request</h3>
          </div>

          <form id="form-submit-leave">
            <div class="form-group">
              <label class="form-label">Leave Category</label>
              <select id="leave-type-select" class="form-control" required>
                <option value="ON_DUTY">On-Duty (Hackathon / Tech Fest / Conference)</option>
                <option value="MEDICAL">Medical Leave (Illness / Hospitalization)</option>
                <option value="SPORTS">Sports / Cultural Representation</option>
                <option value="EMERGENCY">Emergency / Personal Leave</option>
              </select>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">From Date</label>
                <input type="date" id="leave-date-from" class="form-control" required value="2026-10-09">
              </div>
              <div class="form-group">
                <label class="form-label">To Date</label>
                <input type="date" id="leave-date-to" class="form-control" required value="2026-10-09">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Affected Subject(s)</label>
              <select id="leave-subjects-select" class="form-control" multiple style="height: 85px;">
                ${subjects.map(s => `<option value="${s.subject_id}" selected>${s.subject_name} (${s.subject_code})</option>`).join('')}
              </select>
              <small style="font-size: 11px; color: var(--text-muted);">Hold Ctrl to select specific courses.</small>
            </div>

            <div class="form-group">
              <label class="form-label">Detailed Reason / Event Name</label>
              <textarea id="leave-reason" class="form-control" rows="2" required placeholder="e.g. Attending Smart India Hackathon Grand Finale at IIT Madras"></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Document Reference / Proof</label>
              <input type="text" id="leave-doc-ref" class="form-control" placeholder="e.g. SIH2026_Selection_Letter.pdf" value="Event_Approval_Letter.pdf">
            </div>

            <button type="submit" class="btn btn-primary btn-sm" style="width: 100%;">
              Submit for Dean Approval
            </button>
          </form>
        </div>

        <!-- Academic Policy Note Card -->
        <div class="card" style="background: var(--bg-subtle);">
          <div style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">
            ℹ Institutional Condonation Rules
          </div>
          <p style="font-size: 11.5px; color: var(--text-secondary); line-height: 1.45;">
            Approved On-Duty leaves convert absences into credited academic sessions for semester exam hall ticket clearance. Medical leaves must be submitted within 3 days of return with registered physician documentation.
          </p>
        </div>
      </div>
    </div>
  `;
}

function renderLeaveCard(l, isAdmin) {
  let badgeClass = 'badge-warning';
  let statusText = 'Pending Approval';
  if (l.status === 'APPROVED') {
    badgeClass = 'badge-safe';
    statusText = `Approved (+${l.classes_credited ?? 2} Credits)`;
  } else if (l.status === 'REJECTED') {
    badgeClass = 'badge-critical';
    statusText = 'Rejected';
  }

  return `
    <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px 16px; background: white;">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;">
        <div>
          <span style="font-size: 11px; font-weight: 700; color: var(--primary); background: var(--primary-light); padding: 2px 7px; border-radius: 4px;">
            ${l.type_label || l.type}
          </span>
          <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">
            ${l.student_name ? `${l.student_name} (${l.student_id})` : ''}
          </div>
        </div>
        <span class="badge ${badgeClass}">${statusText}</span>
      </div>

      <div style="font-size: 12px; color: var(--text-secondary); margin: 6px 0;">
        📅 Dates: <strong>${l.date_from}</strong> ${l.date_to !== l.date_from ? `to <strong>${l.date_to}</strong>` : ''}
        ${l.subjects_affected?.length ? `• Courses: <strong>${l.subjects_affected.join(', ')}</strong>` : ''}
      </div>

      <div style="font-size: 12.5px; color: var(--text-primary); background: var(--bg-subtle); padding: 8px 12px; border-radius: var(--radius-sm); margin: 8px 0;">
        "${l.reason}"
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-muted); flex-wrap: wrap; gap: 8px; margin-top: 8px;">
        <span>📎 Document: <strong>${l.document_ref || 'Certificate.pdf'}</strong></span>
        ${l.reviewed_by ? `<span>Reviewed by: <strong>${l.reviewed_by}</strong></span>` : '<span>Awaiting Dean Review</span>'}
      </div>

      ${isAdmin && l.status === 'PENDING' ? `
        <div style="display: flex; gap: 8px; margin-top: 12px; pt-2; border-top: 1px solid var(--border-color); padding-top: 10px;">
          <button class="btn btn-primary btn-sm btn-admin-approve-leave" data-id="${l.leave_id}" style="flex: 1;">
            ✓ Approve & Grant Credits
          </button>
          <button class="btn btn-outline btn-sm btn-admin-reject-leave" data-id="${l.leave_id}" style="flex: 1; color: #dc2626;">
            ✕ Reject
          </button>
        </div>
      ` : ''}
    </div>
  `;
}
