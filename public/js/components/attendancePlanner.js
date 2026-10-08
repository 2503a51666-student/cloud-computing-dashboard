/**
 * SmartAttend - Attendance Planner & What-If Simulation Component
 */

export function renderAttendancePlanner(data) {
  const metrics = data.metrics;
  const subjects = data.subjects || [];
  const currentAttended = metrics.classesAttended;
  const currentTotal = metrics.totalClasses;
  const currentPercent = metrics.currentPercentage;
  const target = metrics.targetPercentage;

  return `
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 22px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em;">
        Attendance Prediction & Planner
      </h2>
      <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
        Simulate upcoming class attendance scenarios to understand their mathematical impact on your term eligibility.
      </p>
    </div>

    <!-- Simulator Interactive Box -->
    <div class="grid-2-1">
      <!-- Simulation Controls Card -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--primary);"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            What-If Scenario Controls
          </div>
          <span style="font-size: 11px; background: var(--bg-subtle); padding: 3px 8px; border-radius: var(--radius-sm); font-weight: 600;">
            Current: <strong>${currentPercent}%</strong> (${currentAttended}/${currentTotal})
          </span>
        </div>

        <div style="margin-bottom: 20px;">
          <label class="form-label" style="font-size: 12px; margin-bottom: 4px;">Scope of Simulation</label>
          <select id="sim-scope-select" class="form-control">
            <option value="OVERALL">Overall Term Attendance (${currentPercent}%)</option>
            ${subjects.map(s => `<option value="${s.subject_id}">${s.subject_name} (${s.metrics.formattedPercentage})</option>`).join('')}
          </select>
        </div>

        <!-- Scenario 1: Attend Next X Classes -->
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <label style="font-size: 13px; font-weight: 700; color: #065f46; display: flex; align-items: center; gap: 6px;">
              <span>✅</span> If I ATTEND next upcoming classes:
            </label>
            <span style="font-size: 15px; font-weight: 800; color: #059669;" id="slider-attend-display">+5 classes</span>
          </div>
          <input type="range" id="slider-attend" min="0" max="25" step="1" value="5" style="width: 100%; accent-color: #059669; cursor: pointer;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #047857; margin-top: 4px;">
            <span>0</span>
            <span>5</span>
            <span>10</span>
            <span>15</span>
            <span>20</span>
            <span>25</span>
          </div>
        </div>

        <!-- Scenario 2: Miss Next Y Classes -->
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <label style="font-size: 13px; font-weight: 700; color: #991b1b; display: flex; align-items: center; gap: 6px;">
              <span>❌</span> If I MISS next upcoming classes:
            </label>
            <span style="font-size: 15px; font-weight: 800; color: #dc2626;" id="slider-miss-display">+0 classes</span>
          </div>
          <input type="range" id="slider-miss" min="0" max="15" step="1" value="0" style="width: 100%; accent-color: #dc2626; cursor: pointer;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #b91c1c; margin-top: 4px;">
            <span>0</span>
            <span>3</span>
            <span>6</span>
            <span>9</span>
            <span>12</span>
            <span>15</span>
          </div>
        </div>

        <!-- Quick Simulation Buttons -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-secondary btn-sm" id="btn-quick-sim-1">Attend next 3 classes</button>
          <button class="btn btn-secondary btn-sm" id="btn-quick-sim-2">Attend next 10 classes</button>
          <button class="btn btn-secondary btn-sm" id="btn-quick-sim-3">Miss next 2 classes</button>
          <button class="btn btn-secondary btn-sm" id="btn-quick-sim-reset">Reset Scenarios</button>
        </div>
      </div>

      <!-- Projection Results Card -->
      <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div class="card-header">
            <div class="card-title">Projected Outcome</div>
            <span id="proj-status-badge" class="badge badge-safe">Safe</span>
          </div>

          <div style="text-align: center; padding: 20px 0;">
            <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em;">
              Simulated Attendance Percentage
            </div>
            <div id="proj-percentage-val" style="font-size: 46px; font-weight: 800; color: var(--primary); line-height: 1.1; margin: 6px 0; font-feature-settings: 'tnum';">
              --%
            </div>
            <div id="proj-delta-val" style="font-size: 13px; font-weight: 700; color: #059669;">
              +0.0% from current
            </div>
          </div>

          <div class="progress-container" style="height: 10px; margin-bottom: 20px;">
            <div id="proj-progress-bar" class="progress-bar safe" style="width: 75%;"></div>
          </div>

          <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 14px; font-size: 12.5px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Simulated Classes Attended:</span>
              <strong id="proj-attended-count" style="font-feature-settings: 'tnum';">--</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Simulated Total Classes:</span>
              <strong id="proj-total-count" style="font-feature-settings: 'tnum';">--</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Target Threshold:</span>
              <strong style="font-feature-settings: 'tnum';">${target}%</strong>
            </div>
          </div>
        </div>

        <div id="proj-summary-alert" style="margin-top: 16px; padding: 12px 14px; border-radius: var(--radius-md); font-size: 12.5px; line-height: 1.4; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af;">
          Adjust the sliders to simulate future attendance outcomes in real-time.
        </div>
      </div>
    </div>
  `;
}
