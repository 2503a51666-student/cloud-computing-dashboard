/**
 * SmartAttend - Student Dashboard Component
 */

let countdownInterval = null;

export function renderStudentDashboard(data, onNavigate, onTriggerSimulator) {
  const student = data.student;
  const metrics = data.metrics;
  const rules = data.rules;
  const nextClass = data.nextClass;
  const todaySchedule = data.todaySchedule || [];
  const recentRecords = data.recentRecords || [];

  // Determine badge class for status
  let statusBadgeClass = 'badge-safe';
  let statusText = 'Safe';
  let progressBarClass = 'safe';

  if (metrics.status === 'CRITICAL') {
    statusBadgeClass = 'badge-critical';
    statusText = 'Critical';
    progressBarClass = 'critical';
  } else if (metrics.status === 'WARNING') {
    statusBadgeClass = 'badge-warning';
    statusText = 'Warning';
    progressBarClass = 'warning';
  }

  // Exam Eligibility & Hall Ticket Status
  const exam = data.examEligibility || {
    status: metrics.isAboveTarget ? 'ELIGIBLE' : (metrics.currentPercentage >= 65 ? 'CONDONATION' : 'DEBARRED'),
    label: metrics.isAboveTarget ? 'Exam Eligible' : (metrics.currentPercentage >= 65 ? 'Condonation Required' : 'Debarred (Shortage)'),
    badgeClass: metrics.isAboveTarget ? 'badge-safe' : (metrics.currentPercentage >= 65 ? 'badge-warning' : 'badge-critical'),
    color: metrics.isAboveTarget ? '#059669' : (metrics.currentPercentage >= 65 ? '#d97706' : '#dc2626'),
    bgColor: metrics.isAboveTarget ? '#ecfdf5' : (metrics.currentPercentage >= 65 ? '#fffbeb' : '#fef2f2'),
    borderColor: metrics.isAboveTarget ? '#a7f3d0' : (metrics.currentPercentage >= 65 ? '#fde68a' : '#fecaca'),
    icon: metrics.isAboveTarget ? '🛡️' : (metrics.currentPercentage >= 65 ? '⚠️' : '🚨'),
    hallTicketStatus: metrics.isAboveTarget ? 'Approved & Cleared' : (metrics.currentPercentage >= 65 ? 'Conditional / Dean Review' : 'Withheld / Not Cleared'),
    actionRequired: metrics.isAboveTarget ? 'None. Good standing.' : 'Submit Medical/OD application.'
  };

  // Next Class display details
  const nextSubject = nextClass ? nextClass.subject_name : 'No more classes today';
  const nextFaculty = nextClass ? (nextClass.faculty || 'Faculty') : '—';
  const nextRoom = nextClass ? (nextClass.room || 'TBD') : '—';
  const nextBuilding = nextClass ? (nextClass.building || 'Campus') : '—';
  const nextTime = nextClass ? `${formatTime12(nextClass.start_time)} – ${formatTime12(nextClass.end_time)}` : 'Completed';
  const nextStartsIn = nextClass ? nextClass.starts_in_minutes : 0;

  const html = `
    <!-- Top Greeting & Action Banner -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 16px;">
      <div>
        <h2 style="font-size: 22px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em;">
          Welcome back, ${student.name} 👋
        </h2>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
          ${student.department} • ${student.year || 'I Year'} • Section ${student.section} (Roll: ${student.student_id})
        </p>
      </div>

      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <!-- Can I Bunk Trigger Button -->
        <button id="btn-quick-bunk-calc" class="btn btn-sm" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; font-weight: 700; border-radius: var(--radius-full); box-shadow: 0 2px 8px rgba(217, 119, 6, 0.25);">
          🤔 Can I Bunk?
        </button>

        <!-- Official Certificate Trigger -->
        <button id="btn-quick-view-cert" class="btn btn-secondary btn-sm" style="border-radius: var(--radius-full);">
          📄 Hall Ticket Certificate
        </button>

        <button id="btn-quick-scan-sim" class="btn btn-primary btn-sm" style="border-radius: var(--radius-full);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
          Simulate RFID
        </button>
      </div>
    </div>

    <!-- Exam Eligibility Compliance Banner -->
    <div style="background: ${exam.bgColor}; border: 1px solid ${exam.borderColor}; border-left: 5px solid ${exam.color}; border-radius: var(--radius-lg); padding: 14px 18px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 14px;">
        <span style="font-size: 26px; line-height: 1;">${exam.icon}</span>
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="font-size: 14px; color: ${exam.color}; text-transform: uppercase; letter-spacing: 0.04em;">
              End-Semester Exam Status: ${exam.label}
            </strong>
            <span class="badge ${exam.badgeClass}">${exam.hallTicketStatus}</span>
          </div>
          <div style="font-size: 12px; color: #475569; margin-top: 2px;">
            Mandatory threshold is <strong>75%</strong> • 28 academic days remaining in term • ${exam.actionRequired}
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 8px;">
        <button id="btn-open-leaves-page" class="btn btn-outline btn-sm" style="background: white; font-size: 11.5px;">
          Apply for Leave / OD →
        </button>
      </div>
    </div>

    <!-- Attendance Overview 4-Stat Grid -->
    <div class="grid-4">
      <!-- Overall Percentage Card -->
      <div class="card stat-card" style="border-top: 4px solid ${metrics.status === 'CRITICAL' ? 'var(--critical-color)' : (metrics.status === 'WARNING' ? 'var(--warning-color)' : 'var(--primary)')};">
        <div class="stat-card-header">
          <span class="stat-label">Overall Attendance</span>
          <span class="badge ${statusBadgeClass}">${statusText}</span>
        </div>
        <div class="stat-value" style="color: ${metrics.status === 'CRITICAL' ? 'var(--critical-color)' : (metrics.status === 'WARNING' ? 'var(--warning-color)' : 'var(--primary)')};">
          ${metrics.formattedPercentage}
        </div>
        <div class="progress-container">
          <div class="progress-bar ${progressBarClass}" style="width: ${Math.min(100, metrics.currentPercentage)}%;"></div>
        </div>
        <div class="stat-subtext">
          <span>Target Requirement: <strong>${metrics.targetPercentage}%</strong></span>
          <span style="margin-left: auto;">${metrics.isAboveTarget ? '✓ Qualified' : '⚠ Below Target'}</span>
        </div>
      </div>

      <!-- Classes Attended -->
      <div class="card stat-card">
        <div class="stat-card-header">
          <span class="stat-label">Classes Attended</span>
          <div class="stat-icon" style="background: #ecfdf5; color: #059669;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
        <div class="stat-value">${metrics.classesAttended}</div>
        <div class="stat-subtext">
          <span>Out of <strong>${metrics.totalClasses}</strong> conducted</span>
        </div>
      </div>

      <!-- Classes Missed -->
      <div class="card stat-card">
        <div class="stat-card-header">
          <span class="stat-label">Classes Missed</span>
          <div class="stat-icon" style="background: #fef2f2; color: #dc2626;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
        </div>
        <div class="stat-value">${metrics.classesMissed}</div>
        <div class="stat-subtext">
          <span>Absence Rate: <strong>${((metrics.classesMissed / (metrics.totalClasses || 1)) * 100).toFixed(1)}%</strong></span>
        </div>
      </div>

      <!-- Semester Remaining -->
      <div class="card stat-card">
        <div class="stat-card-header">
          <span class="stat-label">Classes Remaining</span>
          <div class="stat-icon" style="background: #f1f5f9; color: #475569;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
        </div>
        <div class="stat-value">34</div>
        <div class="stat-subtext">
          <span>In Current Semester (Term 6)</span>
        </div>
      </div>
    </div>

    <!-- Middle Split: Next Class + Intelligent Attendance Calculator -->
    <div class="grid-2-1">
      <!-- Next Class Prominent Card -->
      <div class="card next-class-card">
        <div class="next-class-header">
          <div class="next-class-tag">
            <span class="pulse-dot"></span>
            NEXT SCHEDULED CLASS
          </div>
          <button id="btn-view-timetable-link" class="btn btn-sm" style="background: rgba(255, 255, 255, 0.15); color: white; border: none;">
            View Timetable →
          </button>
        </div>

        <div class="next-class-subject">${nextSubject}</div>

        <div class="next-class-meta">
          <div class="meta-item">
            <span class="meta-item-label">Faculty</span>
            <span class="meta-item-value">${nextFaculty}</span>
          </div>
          <div class="meta-item">
            <span class="meta-item-label">Scheduled Time</span>
            <span class="meta-item-value">${nextTime}</span>
          </div>
          <div class="meta-item">
            <span class="meta-item-label">Location & Room</span>
            <span class="meta-item-value">${nextRoom} (${nextBuilding})</span>
          </div>
          <div class="meta-item">
            <span class="meta-item-label">Attendance Policy</span>
            <span class="meta-item-value">Mandatory (${rules.minimum_percentage || 75}%)</span>
          </div>
        </div>

        <div class="countdown-box">
          <div class="countdown-text">
            <span>Class Countdown:</span>
          </div>
          <div class="countdown-timer" id="live-class-countdown">
            ${nextClass ? (nextStartsIn > 0 ? `Starts in ~${nextStartsIn} mins` : 'Class in session') : 'No upcoming classes'}
          </div>
        </div>
      </div>

      <!-- Intelligent Attendance Calculator -->
      <div class="card">
        <div class="card-header" style="margin-bottom: 8px;">
          <div>
            <div class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--primary);"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
              Target Calculator
            </div>
            <div class="card-subtitle">Dynamic mathematically exact analysis</div>
          </div>
          <div style="font-size: 11px; background: var(--bg-subtle); padding: 3px 8px; border-radius: var(--radius-sm); font-weight: 600; color: var(--text-secondary);">
            Target: <span id="calc-current-target-label">${metrics.targetPercentage}%</span>
          </div>
        </div>

        <!-- Target slider for dynamic target tweaking -->
        <div style="margin: 10px 0 14px;">
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-muted); margin-bottom: 4px;">
            <span>Adjust Target Threshold:</span>
            <strong id="target-slider-val" style="color: var(--primary);">${metrics.targetPercentage}%</strong>
          </div>
          <input type="range" id="target-threshold-slider" min="70" max="85" step="1" value="${metrics.targetPercentage}" style="width: 100%; cursor: pointer;">
        </div>

        <div id="calculator-insights-container">
          ${renderCalculatorInsights(metrics)}
        </div>
      </div>
    </div>

    <!-- Live RFID Attendance Status & Today's Classes -->
    <div class="grid-2">
      <!-- Live RFID Status Panel -->
      <div class="card rfid-status-panel">
        <div class="card-header">
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--primary);"><path d="M2 10s3-3 3-8"/><path d="M22 10s-3-3-3-8"/><path d="M10 2c0 4.4-3.6 8-8 8"/><path d="M14 2c0 4.4 3.6 8 8 8"/><path d="M2 18a10 10 0 0 0 20 0"/></svg>
            Live RFID Reader Status
          </div>
          <span class="badge badge-safe">Online</span>
        </div>

        <div id="live-rfid-display-box" style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 18px; text-align: center; border: 1px dashed var(--border-subtle); margin-bottom: 16px;">
          <div class="rfid-pulse-visual pulse">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
          </div>
          <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;" id="rfid-status-title">
            Waiting for RFID Tap...
          </div>
          <div style="font-size: 12px; color: var(--text-muted);" id="rfid-status-detail">
            Reader CSE-LAB-02 is ready. Tap your student ID card at the classroom entrance.
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <button id="btn-quick-tap-ontime" class="btn btn-secondary btn-sm" style="flex: 1; font-size: 11px;">
            Tap (On Time)
          </button>
          <button id="btn-quick-tap-late" class="btn btn-secondary btn-sm" style="flex: 1; font-size: 11px;">
            Tap (Late)
          </button>
          <button id="btn-quick-tap-verylate" class="btn btn-secondary btn-sm" style="flex: 1; font-size: 11px;">
            Tap (Very Late)
          </button>
        </div>
      </div>

      <!-- Today's Schedule Overview -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--primary);"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            Today's Classes (Thursday)
          </div>
          <button id="btn-view-all-classes" class="btn btn-outline btn-sm">Full Schedule</button>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Subject</th>
                <th>Room</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${todaySchedule.map(cls => renderScheduleRow(cls, recentRecords)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Start live countdown timer
  startCountdown(nextClass);

  return html;
}

/**
 * Dynamic calculation helper for target insight cards
 */
function renderCalculatorInsights(metrics) {
  const target = metrics.targetPercentage;
  const needed = metrics.classesNeededToReachTarget;
  const safeToMiss = metrics.safeToMissClasses;

  return `
    <!-- Consecutive Needed Card -->
    <div class="calc-insight-card need">
      <div style="font-size: 20px; line-height: 1;">🎯</div>
      <div>
        <div class="calc-insight-title">Target Goal (${target}%)</div>
        <div class="calc-insight-desc">
          ${needed > 0
            ? `You need to attend <strong>${needed} consecutive class${needed > 1 ? 'es' : ''}</strong> to reach your ${target}% target.`
            : `Great job! Your current attendance is at or above ${target}%.`}
        </div>
      </div>
    </div>

    <!-- Safe to Miss Card -->
    <div class="calc-insight-card safe">
      <div style="font-size: 20px; line-height: 1;">🛡️</div>
      <div>
        <div class="calc-insight-title">Safe Absence Allowance</div>
        <div class="calc-insight-desc">
          ${safeToMiss > 0
            ? `You can safely miss <strong>${safeToMiss} upcoming class${safeToMiss > 1 ? 'es' : ''}</strong> and still remain at or above ${target}%.`
            : `You cannot safely miss any classes right now without dropping below ${target}%.`}
        </div>
      </div>
    </div>
  `;
}

function renderScheduleRow(cls, recentRecords) {
  // Check if student has attendance record for this class today
  const rec = recentRecords.find(r => r.subject_id === cls.subject_id && r.date === '2026-09-17');

  let statusBadge = `<span class="badge badge-absent">Upcoming</span>`;
  if (rec) {
    if (rec.status === 'ON TIME') statusBadge = `<span class="badge badge-ontime">Present (On Time)</span>`;
    else if (rec.status === 'LATE') statusBadge = `<span class="badge badge-late">Late (${rec.rfid_punch_time.substring(0, 5)})</span>`;
    else if (rec.status === 'VERY LATE') statusBadge = `<span class="badge badge-verylate">Very Late</span>`;
    else if (rec.status === 'ABSENT') statusBadge = `<span class="badge badge-critical">Absent</span>`;
  } else if (cls.start_time === '09:00' || cls.start_time === '10:00') {
    // In progress or just finished
    statusBadge = `<span class="badge badge-ontime">Present</span>`;
  }

  return `
    <tr>
      <td style="font-weight: 600; font-feature-settings: 'tnum'; white-space: nowrap;">
        ${formatTime12(cls.start_time)} – ${formatTime12(cls.end_time)}
      </td>
      <td>
        <div style="font-weight: 600; color: var(--text-primary);">${cls.subject_name}</div>
        <div style="font-size: 11px; color: var(--text-muted);">${cls.faculty} ${cls.consecutive ? '• Multi-Period Lab' : ''}</div>
      </td>
      <td>${cls.room}</td>
      <td>${statusBadge}</td>
    </tr>
  `;
}

function startCountdown(nextClass) {
  if (countdownInterval) clearInterval(countdownInterval);
  if (!nextClass) return;

  const timerEl = document.getElementById('live-class-countdown');
  if (!timerEl) return;

  let remainingMinutes = nextClass.starts_in_minutes || 18;
  let remainingSeconds = remainingMinutes * 60;

  countdownInterval = setInterval(() => {
    remainingSeconds--;
    if (remainingSeconds <= 0) {
      clearInterval(countdownInterval);
      const el = document.getElementById('live-class-countdown');
      if (el) el.textContent = 'Class is now starting!';
      return;
    }

    const m = Math.floor(remainingSeconds / 60);
    const s = remainingSeconds % 60;
    const el = document.getElementById('live-class-countdown');
    if (el) {
      el.textContent = `Starts in ${m}m ${String(s).padStart(2, '0')}s`;
    }
  }, 1000);
}

function formatTime12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function maskCardId(cardId) {
  if (!cardId) return '••••••••';
  if (cardId.length <= 4) return cardId;
  return '••••' + cardId.slice(-4);
}
