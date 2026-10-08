/**
 * SmartAttend - "Can I Bunk?" Attendance Impact Estimator
 */

export function renderBunkCalculatorModal(studentData, defaultSubjectId = '') {
  const metrics = studentData.metrics;
  const subjects = studentData.subjects || [];
  const todayClasses = studentData.todaySchedule || [];
  const currentAttended = metrics.classesAttended;
  const currentTotal = metrics.totalClasses;
  const target = metrics.targetPercentage || 75;

  return `
    <div class="modal-backdrop" id="bunk-modal-backdrop">
      <div class="modal-content" style="max-width: 580px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 34px; height: 34px; border-radius: var(--radius-md); background: linear-gradient(135deg, #f59e0b, #d97706); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px;">
              🤔
            </div>
            <div>
              <h3 style="font-size: 17px; font-weight: 700; color: var(--text-primary);">"Can I Bunk?" Impact Estimator</h3>
              <div style="font-size: 11.5px; color: var(--text-muted);">Simulate absenteeism consequences before making a decision</div>
            </div>
          </div>
          <button id="btn-close-bunk-modal" style="background: none; border: none; font-size: 22px; color: var(--text-muted); cursor: pointer; padding: 4px;">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Current Standing Summary Strip -->
          <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border-color);">
            <div>
              <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Current Standing</span>
              <div style="font-size: 18px; font-weight: 800; color: var(--text-primary); font-feature-settings: 'tnum';">
                ${metrics.formattedPercentage} <span style="font-size: 12px; font-weight: 500; color: var(--text-muted);">(${currentAttended}/${currentTotal} attended)</span>
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Safe Buffer</span>
              <div style="font-size: 14px; font-weight: 700; color: ${metrics.safeToMissClasses > 0 ? '#059669' : '#dc2626'};">
                ${metrics.safeToMissClasses > 0 ? `+${metrics.safeToMissClasses} class buffer` : 'Zero buffer (At limit)'}
              </div>
            </div>
          </div>

          <!-- Bunk Scope Selector -->
          <div class="form-group">
            <label class="form-label">Select Course to Simulate</label>
            <select id="bunk-subject-select" class="form-control">
              <option value="OVERALL">Overall Semester Attendance (All Subjects)</option>
              ${subjects.map(s => `
                <option value="${s.subject_id}" ${defaultSubjectId === s.subject_id ? 'selected' : ''}>
                  ${s.subject_name} (${s.metrics.formattedPercentage}) — ${s.faculty}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Classes to Bunk Stepper -->
          <div class="form-group">
            <label class="form-label" style="display: flex; justify-content: space-between;">
              <span>How many classes do you plan to skip?</span>
              <strong id="bunk-count-label" style="color: var(--primary);">1 class</strong>
            </label>
            <input type="range" id="bunk-slider" min="1" max="6" step="1" value="1" style="width: 100%; accent-color: var(--primary); cursor: pointer;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-top: 4px;">
              <span>1 Class</span>
              <span>2 Classes</span>
              <span>3 Classes</span>
              <span>4 Classes</span>
              <span>5 Classes</span>
              <span>6 Classes</span>
            </div>
          </div>

          <!-- Quick Presets -->
          <div style="display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" id="btn-preset-skip-1">Skip 1 Class</button>
            <button class="btn btn-secondary btn-sm" id="btn-preset-skip-2">Skip 2 Classes</button>
            <button class="btn btn-secondary btn-sm" id="btn-preset-skip-today">
              Skip Full Day Today (${todayClasses.length} sessions)
            </button>
          </div>

          <!-- Real-Time Verdict Card -->
          <div id="bunk-verdict-card" style="border-radius: var(--radius-lg); padding: 18px; border: 1px solid var(--safe-border); background: var(--safe-bg); transition: var(--transition);">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px;">
              <div>
                <span id="bunk-verdict-badge" class="badge badge-safe">SAFE TO BUNK</span>
                <div id="bunk-projected-pct" style="font-size: 32px; font-weight: 800; color: #065f46; margin-top: 4px; font-feature-settings: 'tnum';">
                  77.4%
                </div>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Impact Delta</span>
                <div id="bunk-delta-val" style="font-size: 15px; font-weight: 700; color: #dc2626;">
                  -1.4% drop
                </div>
              </div>
            </div>

            <p id="bunk-advice-text" style="font-size: 12.5px; line-height: 1.45; color: #065f46;">
              Safe to bunk! Your attendance will remain above the 75% target threshold with a safety buffer.
            </p>
          </div>
        </div>

        <div class="modal-footer">
          <button id="btn-close-bunk-footer" class="btn btn-secondary btn-sm">Close</button>
          <button id="btn-apply-leave-shortcut" class="btn btn-primary btn-sm">
            Need Leave? Apply for OD / Medical →
          </button>
        </div>
      </div>
    </div>
  `;
}
