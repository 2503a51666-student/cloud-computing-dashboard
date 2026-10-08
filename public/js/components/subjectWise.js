/**
 * SmartAttend - Subject-Wise Attendance Component
 */

export function renderSubjectWiseAttendance(subjects, overallTarget = 75) {
  return `
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 22px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em;">
        Subject-Wise Attendance Breakdown
      </h2>
      <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
        Track your attendance performance, minimum threshold requirements, and safe-margin allowances per course.
      </p>
    </div>

    <!-- Subjects Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px;">
      ${subjects.map(subj => renderSubjectCard(subj, overallTarget)).join('')}
    </div>
  `;
}

function renderSubjectCard(subj, overallTarget) {
  const m = subj.metrics;
  const targetReq = subj.attendance_requirement || overallTarget;

  let badgeClass = 'badge-safe';
  let badgeText = 'Safe';
  let barClass = 'safe';

  if (m.status === 'CRITICAL') {
    badgeClass = 'badge-critical';
    badgeText = 'Critical';
    barClass = 'critical';
  } else if (m.status === 'WARNING') {
    badgeClass = 'badge-warning';
    badgeText = 'Warning';
    barClass = 'warning';
  }

  return `
    <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <!-- Card Header -->
        <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 11.5px; font-weight: 700; color: var(--primary); background: var(--primary-light); padding: 2px 7px; border-radius: 4px;">
                ${subj.subject_code}
              </span>
              <span style="font-size: 12px; color: var(--text-muted);">${subj.credits} Credits</span>
            </div>
            <h3 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">
              ${subj.subject_name}
            </h3>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
              👨‍🏫 ${subj.faculty}
            </div>
          </div>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>

        <!-- Attendance Stats Row -->
        <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 14px;">
          <div>
            <span style="font-size: 28px; font-weight: 800; color: var(--text-primary); font-feature-settings: 'tnum';">
              ${m.formattedPercentage}
            </span>
            <span style="font-size: 12px; color: var(--text-muted); margin-left: 6px;">
              (${m.classesAttended}/${m.totalClasses} attended)
            </span>
          </div>
          <div style="text-align: right; font-size: 11.5px; color: var(--text-muted);">
            Target: <strong>${targetReq}%</strong>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="progress-container" style="margin: 8px 0 14px;">
          <div class="progress-bar ${barClass}" style="width: ${Math.min(100, m.currentPercentage)}%;"></div>
        </div>

        <!-- Dynamic Threshold Calculations -->
        <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 12px; font-size: 12px; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="color: var(--text-secondary);">Safe to miss:</span>
            <strong style="color: ${m.safeToMissClasses > 0 ? '#059669' : '#dc2626'};">
              ${m.safeToMissClasses > 0 ? `${m.safeToMissClasses} class${m.safeToMissClasses > 1 ? 'es' : ''}` : '0 classes (at limit)'}
            </strong>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="color: var(--text-secondary);">Needed for ${targetReq}%:</span>
            <strong style="color: ${m.classesNeededToReachTarget > 0 ? '#d97706' : '#059669'};">
              ${m.classesNeededToReachTarget > 0 ? `${m.classesNeededToReachTarget} consecutive classes` : 'Target Achieved ✓'}
            </strong>
          </div>
        </div>
      </div>

      <div style="margin-top: 16px; pt-3; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: var(--text-muted);">
        <span>Missed: ${m.classesMissed} classes</span>
        <button class="btn btn-outline btn-sm btn-simulate-this-subject" data-subject-id="${subj.subject_id}" data-subject-name="${subj.subject_name}">
          Simulate Attendance →
        </button>
      </div>
    </div>
  `;
}
