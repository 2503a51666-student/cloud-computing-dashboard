/**
 * SmartAttend - Master Application Controller
 * Manages dual roles, state, routing, real-time SSE stream, and UI lifecycle.
 */

import { api } from './services/api.js';
import { renderStudentDashboard } from './components/studentDashboard.js';
import { renderTimetable } from './components/timetable.js';
import { renderAttendanceHistory } from './components/attendanceHistory.js';
import { renderSubjectWiseAttendance } from './components/subjectWise.js';
import { renderAttendancePlanner } from './components/attendancePlanner.js';
import { renderNotificationCenter } from './components/notifications.js';
import { renderProfile } from './components/profile.js';
import { renderLiveMonitor } from './components/liveMonitor.js';
import { renderAdminDashboard } from './components/adminDashboard.js';
import { renderRfidSimulatorModal, playRfidChime } from './components/rfidSimulator.js';
import { renderBunkCalculatorModal } from './components/bunkCalculator.js';
import { renderLeaveManagementPage } from './components/leaveManagement.js';
import { renderParentAlertSimulatorModal } from './components/parentAlertSimulator.js';
import { renderAttendanceCertificatePage } from './components/attendanceCertificate.js';

class SmartAttendApp {
  constructor() {
    // Persistent Session State
    this.currentRole = localStorage.getItem('smartattend_role') || 'STUDENT';
    this.currentStudentId = localStorage.getItem('smartattend_student_id') || '23CS01042';
    this.currentView = localStorage.getItem('smartattend_view') || (this.currentRole === 'ADMIN' ? 'admin' : 'dashboard');
    this.adminTab = 'rules';
    this.timetableMode = 'weekly';

    // In-memory data cache
    this.studentData = null;
    this.adminData = {};
    this.notifications = [];
    this.historyFilters = { status: 'ALL', search: '', subject_id: '', date: '' };

    // Real-Time Connection
    this.liveStream = null;
    this.clockInterval = null;
  }

  async init() {
    this.initClock();
    this.setupGlobalEventListeners();
    await this.loadInitialData();
    this.initRealTimeStream();
    this.render();
  }

  initClock() {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const clockEl = document.getElementById('live-clock-text');
      if (clockEl) clockEl.textContent = timeStr;

      const podiumClock = document.getElementById('podium-live-clock');
      if (podiumClock) podiumClock.textContent = timeStr;
    };
    updateTime();
    this.clockInterval = setInterval(updateTime, 1000);
  }

  async loadInitialData() {
    try {
      // Fetch Student Data
      this.studentData = await api.getStudentData(this.currentStudentId);

      // Fetch Notifications
      const notifRes = await api.getNotifications(this.currentStudentId);
      this.notifications = notifRes.notifications || [];

      // Fetch Admin Data
      const [rulesRes, studentsRes, subjectsRes, readersRes, timetableRes, leavesRes] = await Promise.all([
        api.getRules(),
        api.getStudents(),
        api.getSubjects(),
        api.getReaders(),
        api.getAllTimetable(),
        api.getLeaves()
      ]);

      this.adminData = {
        rules: rulesRes.rules,
        students: studentsRes.students,
        subjects: subjectsRes.subjects,
        readers: readersRes.readers,
        timetable: timetableRes.timetable,
        leaveRequests: leavesRes?.leaves || [],
        parentAlerts: this.studentData?.parentAlerts || []
      };

      if (!this.studentData.allTimetable && timetableRes.timetable) {
        this.studentData.allTimetable = timetableRes.timetable;
      }

      this.updateHeaderProfile();
    } catch (err) {
      console.error('Failed to load initial data:', err);
      this.showToast('Connection Warning', 'Using cached offline data.', 'warning');
    }
  }

  initRealTimeStream() {
    this.liveStream = api.connectLiveStream(
      (eventType, payload) => this.handleLiveEvent(eventType, payload),
      err => console.warn('SSE connection warning:', err)
    );
  }

  async handleLiveEvent(eventType, payload) {
    if (eventType === 'RFID_SCAN') {
      const res = payload.scanResult;

      // Play sound chime
      playRfidChime(res.status_label || (res.success ? 'success' : 'error'));

      // Show toast
      if (res.success) {
        this.showToast(
          `RFID Tap: ${res.status_label}`,
          `${res.student?.name || 'Student'} marked for ${res.subject?.name} (${res.classes_credited} period credited).`,
          res.status_label === 'ON TIME' ? 'success' : (res.status_label === 'LATE' ? 'warning' : 'critical')
        );
      } else {
        this.showToast(
          `Scan Warning: ${res.status_label || res.state}`,
          res.message || 'Scan rejected.',
          'critical'
        );
      }

      // Reload data and refresh views immediately
      await this.loadInitialData();
      this.render();
    } else if (eventType === 'RULES_UPDATED') {
      this.showToast('Rules Updated', 'Institutional attendance policy updated by Admin.', 'info');
      await this.loadInitialData();
      this.render();
    } else if (eventType === 'LEAVE_REQUESTED') {
      this.showToast('Leave Applied', `Request submitted by ${payload.leave?.student_name || 'Student'}.`, 'info');
      await this.loadInitialData();
      this.render();
    } else if (eventType === 'LEAVE_STATUS_UPDATED') {
      this.showToast('Leave Updated', `Status changed to ${payload.leave?.status}.`, 'info');
      await this.loadInitialData();
      this.render();
    }
  }

  updateHeaderProfile() {
    const student = this.studentData?.student;
    const nameEl = document.getElementById('header-user-name');
    const roleEl = document.getElementById('header-user-role');
    const avatarEl = document.getElementById('header-user-avatar');
    const notifBadgeEl = document.getElementById('header-notif-count');

    if (this.currentRole === 'ADMIN') {
      if (nameEl) nameEl.textContent = 'Dr. Ramesh Sharma';
      if (roleEl) roleEl.textContent = 'Admin / Faculty';
      if (avatarEl) {
        avatarEl.textContent = 'R';
        avatarEl.className = 'user-avatar admin';
      }
    } else if (student) {
      if (nameEl) nameEl.textContent = student.name;
      if (roleEl) roleEl.textContent = `${student.student_id} • ${student.department}`;
      if (avatarEl) {
        avatarEl.textContent = student.avatar || student.name.charAt(0);
        avatarEl.className = 'user-avatar';
      }
    }

    const unreadCount = this.notifications.filter(n => !n.read).length;
    if (notifBadgeEl) {
      notifBadgeEl.textContent = unreadCount;
      notifBadgeEl.style.display = unreadCount > 0 ? 'flex' : 'none';
    }

    // Role switcher dropdown sync
    const switcher = document.getElementById('header-role-switcher');
    if (switcher) {
      switcher.value = this.currentRole === 'ADMIN' ? 'ADMIN' : this.currentStudentId;
    }
  }

  navigateTo(view) {
    this.currentView = view;
    localStorage.setItem('smartattend_view', view);
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  switchIdentity(val) {
    if (val === 'ADMIN') {
      this.currentRole = 'ADMIN';
      this.currentView = 'admin';
    } else {
      this.currentRole = 'STUDENT';
      this.currentStudentId = val;
      this.currentView = 'dashboard';
    }
    localStorage.setItem('smartattend_role', this.currentRole);
    localStorage.setItem('smartattend_student_id', this.currentStudentId);
    localStorage.setItem('smartattend_view', this.currentView);

    this.loadInitialData().then(() => this.render());
  }

  render() {
    const contentArea = document.getElementById('main-content-container');
    if (!contentArea) return;

    this.updateSidebarNav();
    this.updateHeaderProfile();

    switch (this.currentView) {
      case 'dashboard':
        contentArea.innerHTML = renderStudentDashboard(
          this.studentData,
          view => this.navigateTo(view),
          () => this.openRfidSimulator()
        );
        this.attachDashboardHandlers();
        break;

      case 'timetable':
        contentArea.innerHTML = renderTimetable(
          this.studentData,
          (reader, time) => this.openRfidSimulator({ reader, time }),
          this.timetableMode
        );
        this.attachTimetableHandlers();
        break;

      case 'leaves':
        contentArea.innerHTML = renderLeaveManagementPage(
          this.studentData.student,
          this.currentRole === 'ADMIN' ? (this.adminData.leaveRequests || []) : (this.studentData.leaveRequests || []),
          this.studentData.subjects || [],
          this.currentRole === 'ADMIN'
        );
        this.attachLeavesHandlers();
        break;

      case 'certificate':
        contentArea.innerHTML = renderAttendanceCertificatePage(this.studentData);
        this.attachCertificateHandlers();
        break;

      case 'history':
        contentArea.innerHTML = renderAttendanceHistory(
          this.studentData.recentRecords,
          this.studentData.subjects,
          this.historyFilters
        );
        this.attachHistoryHandlers();
        break;

      case 'subjects':
        contentArea.innerHTML = renderSubjectWiseAttendance(
          this.studentData.subjects,
          this.studentData.rules.minimum_percentage || 75
        );
        this.attachSubjectWiseHandlers();
        break;

      case 'planner':
        contentArea.innerHTML = renderAttendancePlanner(this.studentData);
        this.attachPlannerHandlers();
        break;

      case 'notifications':
        contentArea.innerHTML = renderNotificationCenter(
          this.notifications,
          id => this.markNotificationAsRead(id),
          () => this.markAllNotificationsAsRead()
        );
        this.attachNotificationHandlers();
        break;

      case 'profile':
        contentArea.innerHTML = renderProfile(this.studentData.student, this.studentData.rules);
        this.attachProfileHandlers();
        break;

      case 'live-monitor':
        contentArea.innerHTML = renderLiveMonitor(this.studentData);
        this.attachLiveMonitorHandlers();
        break;

      case 'admin':
        contentArea.innerHTML = renderAdminDashboard(this.adminData, this.adminTab);
        this.attachAdminHandlers();
        break;

      default:
        this.navigateTo('dashboard');
    }
  }

  updateSidebarNav() {
    const links = document.querySelectorAll('.nav-link');
    links.forEach(l => {
      const v = l.getAttribute('data-view');
      if (v === this.currentView) {
        l.classList.add('active');
      } else {
        l.classList.remove('active');
      }
    });

    // Hide/Show Admin link based on permissions
    const adminLink = document.getElementById('nav-link-admin');
    if (adminLink) {
      adminLink.style.display = this.currentRole === 'ADMIN' ? 'flex' : 'none';
    }
  }

  // -------------------------------------------------------------
  // EVENT LISTENERS & INTERACTIVITY
  // -------------------------------------------------------------

  setupGlobalEventListeners() {
    // Nav link clicks
    document.addEventListener('click', e => {
      const navLink = e.target.closest('.nav-link');
      if (navLink) {
        e.preventDefault();
        const view = navLink.getAttribute('data-view');
        if (view) this.navigateTo(view);
      }
    });

    // Role Switcher
    const roleSwitcher = document.getElementById('header-role-switcher');
    if (roleSwitcher) {
      roleSwitcher.addEventListener('change', e => {
        this.switchIdentity(e.target.value);
      });
    }

    // Top Simulator Button
    const topSimBtn = document.getElementById('btn-top-open-simulator');
    if (topSimBtn) {
      topSimBtn.addEventListener('click', () => this.openRfidSimulator());
    }

    // Notification Bell Click
    const notifBell = document.getElementById('btn-header-notif-bell');
    if (notifBell) {
      notifBell.addEventListener('click', () => this.navigateTo('notifications'));
    }

    // User Profile Pill Click
    const userPill = document.getElementById('header-user-profile-pill');
    if (userPill) {
      userPill.addEventListener('click', () => {
        if (this.currentRole === 'ADMIN') this.navigateTo('admin');
        else this.navigateTo('profile');
      });
    }

    // Mobile Menu Toggle
    const mobileBtn = document.getElementById('btn-mobile-menu');
    const sidebar = document.getElementById('app-sidebar');
    if (mobileBtn && sidebar) {
      mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }
  }

  attachDashboardHandlers() {
    // Quick Simulator button in greeting
    const quickBtn = document.getElementById('btn-quick-scan-sim');
    if (quickBtn) quickBtn.addEventListener('click', () => this.openRfidSimulator());

    // View Timetable link
    const ttLink = document.getElementById('btn-view-timetable-link');
    if (ttLink) ttLink.addEventListener('click', () => this.navigateTo('timetable'));

    const fullClasses = document.getElementById('btn-view-all-classes');
    if (fullClasses) fullClasses.addEventListener('click', () => this.navigateTo('timetable'));

    // Quick Tap buttons on Live Status panel
    const tapOnTime = document.getElementById('btn-quick-tap-ontime');
    if (tapOnTime) {
      tapOnTime.addEventListener('click', () => this.triggerDirectScan('10:57', 'READER-LAB-02'));
    }
    const tapLate = document.getElementById('btn-quick-tap-late');
    if (tapLate) {
      tapLate.addEventListener('click', () => this.triggerDirectScan('11:09', 'READER-LAB-02'));
    }
    const tapVeryLate = document.getElementById('btn-quick-tap-verylate');
    if (tapVeryLate) {
      tapVeryLate.addEventListener('click', () => this.triggerDirectScan('11:22', 'READER-LAB-02'));
    }

    // Dynamic Target Threshold Slider
    const slider = document.getElementById('target-threshold-slider');
    const sliderVal = document.getElementById('target-slider-val');
    const targetLabel = document.getElementById('calc-current-target-label');
    const insightsContainer = document.getElementById('calculator-insights-container');

    if (slider && sliderVal && insightsContainer) {
      slider.addEventListener('input', e => {
        const val = parseInt(e.target.value, 10);
        sliderVal.textContent = `${val}%`;
        if (targetLabel) targetLabel.textContent = `${val}%`;

        // Dynamically recalculate
        const dynMetrics = this.calculateLocalMetrics(
          this.studentData.aggregates.attended,
          this.studentData.aggregates.total_conducted,
          val
        );

        insightsContainer.innerHTML = `
          <!-- Consecutive Needed Card -->
          <div class="calc-insight-card need">
            <div style="font-size: 20px; line-height: 1;">🎯</div>
            <div>
              <div class="calc-insight-title">Target Goal (${val}%)</div>
              <div class="calc-insight-desc">
                ${dynMetrics.classesNeededToReachTarget > 0
                  ? `You need to attend <strong>${dynMetrics.classesNeededToReachTarget} consecutive class${dynMetrics.classesNeededToReachTarget > 1 ? 'es' : ''}</strong> to reach your ${val}% target.`
                  : `Great job! Your current attendance is at or above ${val}%.`}
              </div>
            </div>
          </div>

          <!-- Safe to Miss Card -->
          <div class="calc-insight-card safe">
            <div style="font-size: 20px; line-height: 1;">🛡️</div>
            <div>
              <div class="calc-insight-title">Safe Absence Allowance</div>
              <div class="calc-insight-desc">
                ${dynMetrics.safeToMissClasses > 0
                  ? `You can safely miss <strong>${dynMetrics.safeToMissClasses} upcoming class${dynMetrics.safeToMissClasses > 1 ? 'es' : ''}</strong> and still remain at or above ${val}%.`
                  : `You cannot safely miss any classes right now without dropping below ${val}%.`}
              </div>
            </div>
          </div>
        `;
      });
    }

    // Quick Can I Bunk Calculator Modal Trigger
    const bunkBtn = document.getElementById('btn-quick-bunk-calc');
    if (bunkBtn) {
      bunkBtn.addEventListener('click', () => this.openBunkCalculator());
    }

    // Official Certificate Trigger
    const certBtn = document.getElementById('btn-quick-view-cert');
    if (certBtn) {
      certBtn.addEventListener('click', () => this.navigateTo('certificate'));
    }

    // Leave & OD Page Trigger
    const leaveBtn = document.getElementById('btn-open-leaves-page');
    if (leaveBtn) {
      leaveBtn.addEventListener('click', () => this.navigateTo('leaves'));
    }
  }

  attachTimetableHandlers() {
    const tabWeekly = document.getElementById('btn-tab-weekly');
    const tabToday = document.getElementById('btn-tab-today');
    if (tabWeekly) {
      tabWeekly.addEventListener('click', () => {
        this.timetableMode = 'weekly';
        this.render();
      });
    }
    if (tabToday) {
      tabToday.addEventListener('click', () => {
        this.timetableMode = 'today';
        this.render();
      });
    }

    const tapBtns = document.querySelectorAll('.btn-simulate-this-class');
    tapBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const reader = btn.getAttribute('data-reader');
        const time = btn.getAttribute('data-time');
        this.openRfidSimulator({ reader, time });
      });
    });
  }

  attachHistoryHandlers() {
    // Search input
    const searchInput = document.getElementById('history-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        this.historyFilters.search = e.target.value;
        this.refreshHistoryTable();
      });
    }

    // Subject select
    const subjSelect = document.getElementById('history-subject-select');
    if (subjSelect) {
      subjSelect.addEventListener('change', e => {
        this.historyFilters.subject_id = e.target.value;
        this.refreshHistoryTable();
      });
    }

    // Status select
    const statusSelect = document.getElementById('history-status-select');
    if (statusSelect) {
      statusSelect.addEventListener('change', e => {
        this.historyFilters.status = e.target.value;
        this.refreshHistoryTable();
      });
    }

    // Date input
    const dateInput = document.getElementById('history-date-input');
    if (dateInput) {
      dateInput.addEventListener('change', e => {
        this.historyFilters.date = e.target.value;
        this.refreshHistoryTable();
      });
    }

    // Reset button
    const resetBtn = document.getElementById('btn-reset-history-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.historyFilters = { status: 'ALL', search: '', subject_id: '', date: '' };
        this.navigateTo('history');
      });
    }

    // Details button modal
    document.querySelectorAll('.btn-view-audit').forEach(btn => {
      btn.addEventListener('click', () => {
        try {
          const rec = JSON.parse(btn.getAttribute('data-record'));
          this.showRecordAuditModal(rec);
        } catch (e) {
          console.error(e);
        }
      });
    });
  }

  async refreshHistoryTable() {
    try {
      const res = await api.getAttendanceRecords({
        student_id: this.currentStudentId,
        ...this.historyFilters
      });
      this.studentData.recentRecords = res.records;
      const content = document.getElementById('main-content-container');
      if (content && this.currentView === 'history') {
        content.innerHTML = renderAttendanceHistory(
          res.records,
          this.studentData.subjects,
          this.historyFilters
        );
        this.attachHistoryHandlers();
      }
    } catch (e) {
      console.error(e);
    }
  }

  showRecordAuditModal(rec) {
    const modal = document.getElementById('record-details-modal');
    if (!modal) return;

    modal.innerHTML = `
      <div class="modal-backdrop" id="audit-modal-backdrop">
        <div class="modal-content">
          <div class="modal-header">
            <h3 style="font-size: 16px; font-weight: 700;">RFID Attendance Record Audit</h3>
            <button id="btn-close-audit-modal" style="background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
          </div>
          <div class="modal-body" style="font-size: 13px;">
            <div style="background: var(--bg-subtle); padding: 14px; border-radius: var(--radius-md); margin-bottom: 16px;">
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Record ID</div>
              <div style="font-family: monospace; font-weight: 700; color: var(--primary);">${rec.attendance_id}</div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
              <div><strong>Student:</strong> ${rec.student_name} (${rec.student_id})</div>
              <div><strong>Subject:</strong> ${rec.subject_name} (${rec.subject_id})</div>
              <div><strong>Date:</strong> ${rec.date}</div>
              <div><strong>Status:</strong> ${rec.status}</div>
              <div><strong>Scheduled Slot:</strong> ${rec.scheduled_start} – ${rec.scheduled_end}</div>
              <div><strong>RFID Punch:</strong> ${rec.rfid_punch_time || 'No scan'}</div>
              <div><strong>Classroom:</strong> ${rec.room}</div>
              <div><strong>Reader ID:</strong> ${rec.reader_id || 'N/A'}</div>
              <div><strong>Credited Periods:</strong> ${rec.classes_credited ?? 1}</div>
              <div><strong>AWS Ingestion:</strong> Amazon API Gateway / IoT</div>
            </div>

            <div style="border-top: 1px solid var(--border-color); padding-top: 12px;">
              <div style="font-size: 12px; font-weight: 700; margin-bottom: 4px;">Evaluation Audit Remarks:</div>
              <p style="color: var(--text-secondary);">${rec.remarks || 'Standard verified swipe'}</p>
            </div>
          </div>
          <div class="modal-footer">
            <button id="btn-close-audit-modal-2" class="btn btn-secondary btn-sm">Close</button>
          </div>
        </div>
      </div>
    `;
    modal.style.display = 'block';

    const close = () => { modal.style.display = 'none'; };
    const btn1 = document.getElementById('btn-close-audit-modal');
    const btn2 = document.getElementById('btn-close-audit-modal-2');
    const backdrop = document.getElementById('audit-modal-backdrop');
    if (btn1) btn1.onclick = close;
    if (btn2) btn2.onclick = close;
    if (backdrop) backdrop.onclick = e => { if (e.target === backdrop) close(); };
  }

  attachSubjectWiseHandlers() {
    document.querySelectorAll('.btn-simulate-this-subject').forEach(btn => {
      btn.addEventListener('click', () => {
        this.navigateTo('planner');
      });
    });
  }

  attachPlannerHandlers() {
    const sliderAttend = document.getElementById('slider-attend');
    const sliderMiss = document.getElementById('slider-miss');
    const displayAttend = document.getElementById('slider-attend-display');
    const displayMiss = document.getElementById('slider-miss-display');
    const projPercent = document.getElementById('proj-percentage-val');
    const projDelta = document.getElementById('proj-delta-val');
    const projBadge = document.getElementById('proj-status-badge');
    const projBar = document.getElementById('proj-progress-bar');
    const projAttended = document.getElementById('proj-attended-count');
    const projTotal = document.getElementById('proj-total-count');
    const summaryAlert = document.getElementById('proj-summary-alert');
    const scopeSelect = document.getElementById('sim-scope-select');

    const updateProjection = () => {
      if (!sliderAttend || !sliderMiss) return;

      const attendCount = parseInt(sliderAttend.value, 10);
      const missCount = parseInt(sliderMiss.value, 10);

      displayAttend.textContent = `+${attendCount} class${attendCount !== 1 ? 'es' : ''}`;
      displayMiss.textContent = `+${missCount} class${missCount !== 1 ? 'es' : ''}`;

      let baseAttended = this.studentData.metrics.classesAttended;
      let baseTotal = this.studentData.metrics.totalClasses;
      let targetReq = this.studentData.metrics.targetPercentage;

      const scope = scopeSelect ? scopeSelect.value : 'OVERALL';
      if (scope !== 'OVERALL') {
        const subj = this.studentData.subjects.find(s => s.subject_id === scope);
        if (subj) {
          baseAttended = subj.stats.attended;
          baseTotal = subj.stats.conducted;
          targetReq = subj.attendance_requirement || targetReq;
        }
      }

      const simAttended = baseAttended + attendCount;
      const simTotal = baseTotal + attendCount + missCount;
      const currentPct = (baseAttended / (baseTotal || 1)) * 100;
      const simPct = (simAttended / (simTotal || 1)) * 100;
      const delta = simPct - currentPct;

      projPercent.textContent = simPct.toFixed(1) + '%';
      projAttended.textContent = `${simAttended} classes`;
      projTotal.textContent = `${simTotal} classes`;

      if (delta >= 0) {
        projDelta.textContent = `+${delta.toFixed(1)}% improvement`;
        projDelta.style.color = '#059669';
      } else {
        projDelta.textContent = `${delta.toFixed(1)}% drop`;
        projDelta.style.color = '#dc2626';
      }

      projBar.style.width = `${Math.min(100, simPct)}%`;

      if (simPct >= targetReq) {
        projBadge.className = 'badge badge-safe';
        projBadge.textContent = 'Safe';
        projBar.className = 'progress-bar safe';
        summaryAlert.className = 'calc-insight-card safe';
        summaryAlert.innerHTML = `✅ <strong>Goal Reached!</strong> Under this simulation, your attendance will be <strong>${simPct.toFixed(1)}%</strong>, comfortably above the required ${targetReq}%.`;
      } else if (simPct >= targetReq - 5) {
        projBadge.className = 'badge badge-warning';
        projBadge.textContent = 'Warning';
        projBar.className = 'progress-bar warning';
        summaryAlert.className = 'calc-insight-card need';
        summaryAlert.innerHTML = `⚠️ <strong>Warning Zone!</strong> At <strong>${simPct.toFixed(1)}%</strong>, you are close to but below the required ${targetReq}%.`;
      } else {
        projBadge.className = 'badge badge-critical';
        projBadge.textContent = 'Critical';
        projBar.className = 'progress-bar critical';
        summaryAlert.style.background = '#fef2f2';
        summaryAlert.style.borderColor = '#fecaca';
        summaryAlert.style.color = '#991b1b';
        summaryAlert.innerHTML = `🚨 <strong>Critical Risk!</strong> At <strong>${simPct.toFixed(1)}%</strong>, you will face debarment or penalty under institutional policy.`;
      }
    };

    if (sliderAttend) sliderAttend.addEventListener('input', updateProjection);
    if (sliderMiss) sliderMiss.addEventListener('input', updateProjection);
    if (scopeSelect) scopeSelect.addEventListener('change', updateProjection);

    const btnSim1 = document.getElementById('btn-quick-sim-1');
    if (btnSim1) btnSim1.onclick = () => { sliderAttend.value = 3; sliderMiss.value = 0; updateProjection(); };

    const btnSim2 = document.getElementById('btn-quick-sim-2');
    if (btnSim2) btnSim2.onclick = () => { sliderAttend.value = 10; sliderMiss.value = 0; updateProjection(); };

    const btnSim3 = document.getElementById('btn-quick-sim-3');
    if (btnSim3) btnSim3.onclick = () => { sliderAttend.value = 0; sliderMiss.value = 2; updateProjection(); };

    const btnReset = document.getElementById('btn-quick-sim-reset');
    if (btnReset) btnReset.onclick = () => { sliderAttend.value = 5; sliderMiss.value = 0; updateProjection(); };

    updateProjection();
  }

  attachNotificationHandlers() {
    document.querySelectorAll('.btn-mark-one-read').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await api.markNotificationRead(id);
        await this.loadInitialData();
        this.render();
      });
    });

    const markAllBtn = document.getElementById('btn-mark-all-read-page');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', async () => {
        await api.markAllNotificationsRead(this.currentStudentId);
        await this.loadInitialData();
        this.render();
      });
    }

    const testReminder = document.getElementById('btn-send-test-reminder');
    if (testReminder) {
      testReminder.addEventListener('click', () => {
        this.showToast(
          '⏰ Class Reminder (15m)',
          'Your next class is Computer Networks at 11:00 AM in CSE Lab 2.',
          'info'
        );
        playRfidChime('warning');
      });
    }
  }

  attachProfileHandlers() {
    const savePrefsBtn = document.getElementById('btn-save-prefs');
    if (savePrefsBtn) {
      savePrefsBtn.addEventListener('click', () => {
        this.showToast('Preferences Saved', 'Class reminder alerts updated successfully.', 'success');
      });
    }
  }

  attachLiveMonitorHandlers() {
    const scanBtn = document.getElementById('btn-podium-scan-card');
    if (scanBtn) scanBtn.addEventListener('click', () => this.openRfidSimulator());
  }

  attachAdminHandlers() {
    // Admin Tab Navigation
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.adminTab = btn.getAttribute('data-tab');
        this.render();
      });
    });

    // Attendance Rules Form Submit
    const rulesForm = document.getElementById('admin-rules-form');
    if (rulesForm) {
      rulesForm.addEventListener('submit', async e => {
        e.preventDefault();
        const minPercent = parseInt(document.getElementById('rule-min-percent').value, 10);
        const grace = parseInt(document.getElementById('rule-grace-period').value, 10);
        const late = parseInt(document.getElementById('rule-late-thresh').value, 10);
        const veryLate = parseInt(document.getElementById('rule-verylate-thresh').value, 10);
        const cutoff = parseInt(document.getElementById('rule-cutoff-mins').value, 10);
        const dupWindow = parseInt(document.getElementById('rule-dup-window').value, 10);
        const consecutivePolicy = document.getElementById('rule-consecutive-policy').value;

        await api.updateRules({
          minimum_percentage: minPercent,
          grace_period_minutes: grace,
          late_threshold_minutes: late,
          very_late_threshold_minutes: veryLate,
          cutoff_minutes: cutoff,
          duplicate_scan_window_seconds: dupWindow,
          consecutive_period_policy: consecutivePolicy
        });

        this.showToast('Rules Applied', 'AWS Lambda attendance engine thresholds updated.', 'success');
        await this.loadInitialData();
        this.render();
      });
    }

    // Add Student Button
    const addStudentBtn = document.getElementById('btn-admin-add-student');
    if (addStudentBtn) {
      addStudentBtn.addEventListener('click', () => this.showAddStudentModal());
    }

    // Delete Student Buttons
    document.querySelectorAll('.btn-delete-student').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm(`Deactivate/Delete student ${id}?`)) {
          await api.deleteStudent(id);
          this.showToast('Student Removed', `Student ${id} removed from roster.`, 'info');
          await this.loadInitialData();
          this.render();
        }
      });
    });

    // Delete Timetable Slot
    document.querySelectorAll('.btn-delete-timetable').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm(`Remove this timetable session?`)) {
          await api.deleteTimetable(id);
          this.showToast('Timetable Updated', 'Class slot removed.', 'info');
          await this.loadInitialData();
          this.render();
        }
      });
    });

    // Parent Alert SNS Simulator buttons
    const adminSnsBtn = document.getElementById('btn-admin-open-sns-sim');
    if (adminSnsBtn) {
      adminSnsBtn.addEventListener('click', () => this.openParentAlertSimulator());
    }

    document.querySelectorAll('.btn-admin-trigger-sns').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.openParentAlertSimulator(id);
      });
    });

    // Leave & OD approval buttons in Admin tab
    this.bindLeaveActionButtons();
  }

  showAddStudentModal() {
    const modalContainer = document.getElementById('admin-modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-backdrop" id="add-student-backdrop">
        <div class="modal-content">
          <div class="modal-header">
            <h3 style="font-size: 16px; font-weight: 700;">Enroll New Student</h3>
            <button id="btn-close-add-stud" style="background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
          </div>
          <form id="form-enroll-student">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Student Roll ID</label>
                <input type="text" id="add-stud-id" class="form-control" required placeholder="e.g. 23CS01060">
              </div>
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" id="add-stud-name" class="form-control" required placeholder="e.g. Aditya Sharma">
              </div>
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" id="add-stud-email" class="form-control" required placeholder="e.g. aditya@college.edu">
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label">Department</label>
                  <input type="text" id="add-stud-dept" class="form-control" value="Computer Science & Engineering">
                </div>
                <div class="form-group">
                  <label class="form-label">Section</label>
                  <input type="text" id="add-stud-sec" class="form-control" value="A">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">RFID Smart Tag ID</label>
                <input type="text" id="add-stud-rfid" class="form-control" required placeholder="e.g. RFID1060">
                <small style="font-size: 11px; color: var(--text-muted);">Unique card tag scanned from reader.</small>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" id="btn-cancel-add-stud" class="btn btn-secondary btn-sm">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm">Save Student</button>
            </div>
          </form>
        </div>
      </div>
    `;
    modalContainer.style.display = 'block';

    const close = () => { modalContainer.style.display = 'none'; };
    document.getElementById('btn-close-add-stud').onclick = close;
    document.getElementById('btn-cancel-add-stud').onclick = close;

    document.getElementById('form-enroll-student').onsubmit = async e => {
      e.preventDefault();
      const newStudent = {
        student_id: document.getElementById('add-stud-id').value.trim(),
        name: document.getElementById('add-stud-name').value.trim(),
        email: document.getElementById('add-stud-email').value.trim(),
        department: document.getElementById('add-stud-dept').value.trim(),
        year: '3rd Year',
        semester: 'Semester 6',
        section: document.getElementById('add-stud-sec').value.trim(),
        rfid_card_id: document.getElementById('add-stud-rfid').value.trim(),
        status: 'Active'
      };

      await api.saveStudent(newStudent);
      close();
      this.showToast('Student Enrolled', `${newStudent.name} registered with tag ${newStudent.rfid_card_id}`, 'success');
      await this.loadInitialData();
      this.render();
    };
  }

  // -------------------------------------------------------------
  // RFID HARDWARE SIMULATOR CONTROLS
  // -------------------------------------------------------------

  openRfidSimulator(options = {}) {
    let simModal = document.getElementById('rfid-simulator-modal-container');
    if (!simModal) {
      simModal = document.createElement('div');
      simModal.id = 'rfid-simulator-modal-container';
      document.body.appendChild(simModal);
    }

    simModal.innerHTML = renderRfidSimulatorModal(
      this.adminData.students || [],
      this.adminData.readers || [],
      this.currentStudentId
    );
    simModal.style.display = 'block';

    const backdrop = document.getElementById('rfid-sim-modal-backdrop');
    const closeBtn = document.getElementById('btn-close-sim-modal');
    const cancelBtn = document.getElementById('btn-cancel-sim');
    const triggerBtn = document.getElementById('btn-trigger-rfid-tap');
    const scenarioSelect = document.getElementById('sim-scenario-select');
    const customTimeGroup = document.getElementById('sim-custom-time-group');
    const resultBox = document.getElementById('sim-result-box');

    // Pre-select if passed in options
    if (options.reader) {
      const rSel = document.getElementById('sim-reader-select');
      if (rSel) rSel.value = options.reader;
    }

    // Toggle custom time input
    if (scenarioSelect && customTimeGroup) {
      scenarioSelect.addEventListener('change', () => {
        customTimeGroup.style.display = scenarioSelect.value === 'CUSTOM' ? 'block' : 'none';
      });
    }

    const closeModal = () => { simModal.style.display = 'none'; };
    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;
    if (backdrop) backdrop.onclick = e => { if (e.target === backdrop) closeModal(); };

    // Trigger Tap Event
    if (triggerBtn) {
      triggerBtn.onclick = async () => {
        const studentCardId = document.getElementById('sim-student-select').value;
        const readerId = document.getElementById('sim-reader-select').value;
        const scenario = scenarioSelect.value;

        let punchTime = '10:57';
        if (scenario === 'ON_TIME') punchTime = '10:57';
        else if (scenario === 'LATE') punchTime = '11:09';
        else if (scenario === 'VERY_LATE') punchTime = '11:22';
        else if (scenario === 'CUTOFF') punchTime = '11:48';
        else if (scenario === 'CONSECUTIVE_LAB') punchTime = '12:58';
        else if (scenario === 'CUSTOM') {
          punchTime = document.getElementById('sim-custom-time-input').value || '10:58';
        }

        // Show processing state
        resultBox.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--primary); font-weight: 600;">
            <div class="pulse-dot"></div> Processing RFID Tap in AWS Lambda...
          </div>
        `;

        try {
          const res = await api.scanRfid({
            rfid_card_id: studentCardId,
            reader_id: readerId,
            custom_time: punchTime,
            timestamp: `2026-09-17T${punchTime}:00Z`
          });

          // Show result in modal
          resultBox.innerHTML = `
            <div style="background: ${res.success ? '#ecfdf5' : '#fef2f2'}; border: 1px solid ${res.success ? '#a7f3d0' : '#fecaca'}; border-radius: var(--radius-md); padding: 12px; text-align: left;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <strong style="color: ${res.success ? '#059669' : '#dc2626'}; font-size: 13.5px;">
                  ${res.status_label || res.state}
                </strong>
                <span style="font-size: 11px; font-weight: 700; color: var(--text-muted);">${res.scan_time || punchTime}</span>
              </div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">
                ${res.remarks || res.message}
              </div>
              ${res.period_breakdown ? `
                <div style="font-size: 11px; color: var(--text-muted); border-top: 1px dashed var(--border-color); padding-top: 6px; margin-top: 4px;">
                  Multi-Period Crediting: <strong>${res.classes_credited} period(s) credited</strong>
                </div>
              ` : ''}
            </div>
          `;
        } catch (err) {
          resultBox.innerHTML = `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius-md); padding: 12px; color: #991b1b; font-size: 12px; text-align: left;">
              <strong>Tap Failed:</strong> ${err.message || 'Error processing scan.'}
            </div>
          `;
        }
      };
    }
  }

  async triggerDirectScan(time, readerId = 'READER-LAB-02') {
    try {
      const student = this.studentData.student;
      await api.scanRfid({
        rfid_card_id: student.rfid_card_id,
        reader_id: readerId,
        custom_time: time,
        timestamp: `2026-09-17T${time}:00Z`
      });
    } catch (e) {
      console.error(e);
    }
  }

  showToast(title, message, severity = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';

    let iconBg = '#eff6ff';
    let iconColor = '#2563eb';
    let iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>';

    if (severity === 'success') {
      iconBg = '#ecfdf5';
      iconColor = '#059669';
      iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (severity === 'warning') {
      iconBg = '#fffbeb';
      iconColor = '#d97706';
      iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>';
    } else if (severity === 'critical') {
      iconBg = '#fef2f2';
      iconColor = '#dc2626';
      iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>';
    }

    toast.innerHTML = `
      <div class="toast-icon" style="background: ${iconBg}; color: ${iconColor};">
        ${iconSvg}
      </div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  calculateLocalMetrics(attended, total, target) {
    const A = Number(attended) || 0;
    const T = Number(total) || 0;
    const P = Number(target) || 75;

    const currentPercentage = T > 0 ? (A / T) * 100 : 100;
    let needed = 0;
    let safeToMiss = 0;

    if (currentPercentage >= P) {
      needed = 0;
      safeToMiss = Math.max(0, Math.floor((100 * A - P * T) / P));
    } else {
      safeToMiss = 0;
      needed = Math.max(0, Math.ceil((P * T - 100 * A) / (100 - P)));
    }

    return {
      currentPercentage,
      classesNeededToReachTarget: needed,
      safeToMissClasses: safeToMiss
    };
  }

  // -------------------------------------------------------------
  // CAN I BUNK? CALCULATOR MODAL
  // -------------------------------------------------------------
  openBunkCalculator(defaultSubjectId = '') {
    let modal = document.getElementById('bunk-calculator-modal-container');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bunk-calculator-modal-container';
      document.body.appendChild(modal);
    }

    modal.innerHTML = renderBunkCalculatorModal(this.studentData, defaultSubjectId);
    modal.style.display = 'block';

    const closeModal = () => { modal.style.display = 'none'; };
    const closeBtn1 = document.getElementById('btn-close-bunk-modal');
    const closeBtn2 = document.getElementById('btn-close-bunk-footer');
    const backdrop = document.getElementById('bunk-modal-backdrop');
    if (closeBtn1) closeBtn1.onclick = closeModal;
    if (closeBtn2) closeBtn2.onclick = closeModal;
    if (backdrop) backdrop.onclick = e => { if (e.target === backdrop) closeModal(); };

    const leaveShortcut = document.getElementById('btn-apply-leave-shortcut');
    if (leaveShortcut) {
      leaveShortcut.onclick = () => {
        closeModal();
        this.navigateTo('leaves');
      };
    }

    const slider = document.getElementById('bunk-slider');
    const countLabel = document.getElementById('bunk-count-label');
    const subjSelect = document.getElementById('bunk-subject-select');
    const verdictCard = document.getElementById('bunk-verdict-card');
    const verdictBadge = document.getElementById('bunk-verdict-badge');
    const projectedPct = document.getElementById('bunk-projected-pct');
    const deltaVal = document.getElementById('bunk-delta-val');
    const adviceText = document.getElementById('bunk-advice-text');

    const updateBunkCalculation = async () => {
      if (!slider) return;
      const count = parseInt(slider.value, 10);
      if (countLabel) countLabel.textContent = `${count} class${count > 1 ? 'es' : ''}`;
      const subjId = subjSelect && subjSelect.value !== 'OVERALL' ? subjSelect.value : null;

      try {
        const res = await api.calculateBunkImpact({
          student_id: this.currentStudentId,
          classes_to_bunk: count,
          subject_id: subjId
        });

        if (projectedPct) projectedPct.textContent = `${res.projectedPercentage.toFixed(1)}%`;
        if (deltaVal) deltaVal.textContent = `-${res.impactDropPercentage.toFixed(1)}% drop`;

        if (res.safeToBunk) {
          if (verdictBadge) {
            verdictBadge.className = 'badge badge-safe';
            verdictBadge.textContent = 'SAFE TO BUNK';
            verdictBadge.style.background = '#d1fae5';
            verdictBadge.style.color = '#065f46';
          }
          if (verdictCard) {
            verdictCard.style.background = '#ecfdf5';
            verdictCard.style.borderColor = '#a7f3d0';
          }
          if (projectedPct) projectedPct.style.color = '#065f46';
          if (adviceText) {
            adviceText.style.color = '#065f46';
            adviceText.textContent = res.advice || `Safe to bunk ${count} class(es). Projected attendance stays above target with +${res.bufferRemaining} buffer remaining.`;
          }
        } else {
          if (verdictBadge) {
            verdictBadge.className = 'badge badge-critical';
            verdictBadge.textContent = 'RISK / NOT RECOMMENDED';
            verdictBadge.style.background = '#fee2e2';
            verdictBadge.style.color = '#991b1b';
          }
          if (verdictCard) {
            verdictCard.style.background = '#fef2f2';
            verdictCard.style.borderColor = '#fecaca';
          }
          if (projectedPct) projectedPct.style.color = '#dc2626';
          if (adviceText) {
            adviceText.style.color = '#991b1b';
            adviceText.textContent = res.advice || `Warning: Missing ${count} class(es) drops your attendance to ${res.projectedPercentage.toFixed(1)}%, breaching the 75% limit. Attend ${res.classesNeededToRecover || 1} classes to recover.`;
          }
        }
      } catch (err) {
        console.error('Error calculating bunk impact:', err);
      }
    };

    if (slider) slider.oninput = updateBunkCalculation;
    if (subjSelect) subjSelect.onchange = updateBunkCalculation;

    const btnPreset1 = document.getElementById('btn-preset-skip-1');
    if (btnPreset1) btnPreset1.onclick = () => { slider.value = 1; updateBunkCalculation(); };

    const btnPreset2 = document.getElementById('btn-preset-skip-2');
    if (btnPreset2) btnPreset2.onclick = () => { slider.value = 2; updateBunkCalculation(); };

    const btnPresetToday = document.getElementById('btn-preset-skip-today');
    if (btnPresetToday) {
      btnPresetToday.onclick = () => {
        slider.value = Math.min(6, Math.max(1, (this.studentData.todaySchedule || []).length || 3));
        updateBunkCalculation();
      };
    }

    updateBunkCalculation();
  }

  // -------------------------------------------------------------
  // LEAVE & OD MANAGEMENT HANDLERS
  // -------------------------------------------------------------
  attachLeavesHandlers() {
    const form = document.getElementById('form-submit-leave');
    if (form) {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const type = document.getElementById('leave-type-select').value;
        const dateFrom = document.getElementById('leave-date-from').value;
        const dateTo = document.getElementById('leave-date-to').value;
        const subjSelect = document.getElementById('leave-subjects-select');
        const selectedSubjects = Array.from(subjSelect.selectedOptions).map(o => o.value);
        const reason = document.getElementById('leave-reason').value.trim();
        const docRef = document.getElementById('leave-doc-ref').value.trim();

        try {
          await api.createLeave({
            student_id: this.currentStudentId,
            type,
            date_from: dateFrom,
            date_to: dateTo,
            subjects_affected: selectedSubjects,
            reason,
            document_ref: docRef
          });

          this.showToast('Application Submitted', 'Your leave request has been submitted for Dean review.', 'success');
          await this.loadInitialData();
          this.render();
        } catch (err) {
          this.showToast('Submission Failed', err.message || 'Could not submit request.', 'critical');
        }
      });
    }

    this.bindLeaveActionButtons();
  }

  bindLeaveActionButtons() {
    document.querySelectorAll('.btn-admin-approve-leave').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        try {
          await api.updateLeaveStatus(id, 'APPROVED', 'Approved by Dean / HOD', 'Dr. Ramesh Sharma');
          this.showToast('Leave Approved', '+2 Attendance condonation credits granted.', 'success');
          await this.loadInitialData();
          this.render();
        } catch (err) {
          this.showToast('Approval Failed', err.message, 'critical');
        }
      };
    });

    document.querySelectorAll('.btn-admin-reject-leave').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        try {
          await api.updateLeaveStatus(id, 'REJECTED', 'Insufficient verification document', 'Dr. Ramesh Sharma');
          this.showToast('Leave Rejected', 'Request rejected.', 'info');
          await this.loadInitialData();
          this.render();
        } catch (err) {
          this.showToast('Action Failed', err.message, 'critical');
        }
      };
    });
  }

  // -------------------------------------------------------------
  // CERTIFICATE HANDLERS
  // -------------------------------------------------------------
  attachCertificateHandlers() {
    const printBtn = document.getElementById('btn-print-certificate');
    if (printBtn) {
      printBtn.onclick = () => {
        window.print();
      };
    }
  }

  // -------------------------------------------------------------
  // AUTOMATED PARENT ALERT SIMULATOR (AMAZON SNS)
  // -------------------------------------------------------------
  openParentAlertSimulator(defaultStudentId = '23CS01048') {
    let modal = document.getElementById('parent-alert-modal-container');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'parent-alert-modal-container';
      document.body.appendChild(modal);
    }

    const students = this.adminData.students || [];
    modal.innerHTML = renderParentAlertSimulatorModal(students, defaultStudentId);
    modal.style.display = 'block';

    const closeModal = () => { modal.style.display = 'none'; };
    const closeBtn1 = document.getElementById('btn-close-parent-alert-modal');
    const closeBtn2 = document.getElementById('btn-close-parent-alert-footer');
    const backdrop = document.getElementById('parent-alert-modal-backdrop');
    if (closeBtn1) closeBtn1.onclick = closeModal;
    if (closeBtn2) closeBtn2.onclick = closeModal;
    if (backdrop) backdrop.onclick = e => { if (e.target === backdrop) closeModal(); };

    const studSelect = document.getElementById('parent-alert-student-select');
    const reasonSelect = document.getElementById('parent-alert-trigger-reason');
    const previewPhone = document.getElementById('preview-parent-phone');
    const previewText = document.getElementById('preview-sms-text');
    const dispatchStatus = document.getElementById('parent-dispatch-status');
    const sendBtn = document.getElementById('btn-send-sns-alert-now');

    const updatePreview = () => {
      const selectedId = studSelect ? studSelect.value : defaultStudentId;
      const stud = students.find(s => s.student_id === selectedId) || students[0];
      if (stud && previewPhone) {
        previewPhone.textContent = stud.parent_phone || '+91 94403 45678';
      }

      const reason = reasonSelect ? reasonSelect.value : 'CRITICAL_SHORTAGE';
      let msg = `URGENT: SmartAttend Campus Alert. Your ward ${stud.name} (Roll: ${stud.student_id}) has overall attendance below mandatory 75% requirement. End-semester hall ticket clearance is at risk. Please contact the Department Coordinator.`;
      if (reason === 'CONSECUTIVE_ABSENCE') {
        msg = `NOTICE: SmartAttend Alert. Student ${stud.name} (Roll: ${stud.student_id}) has been absent for 3 consecutive lectures without sanctioned leave. Attendance records updated.`;
      } else if (reason === 'LAB_BUNK') {
        msg = `WARNING: SmartAttend Lab Alert. Student ${stud.name} (Roll: ${stud.student_id}) missed today's mandatory practical laboratory session. Practical credits affected.`;
      } else if (reason === 'EXAM_CONDONATION') {
        msg = `OFFICIAL NOTICE: SmartAttend Clearance. Student ${stud.name} (Roll: ${stud.student_id}) attendance requires formal Dean Condonation approval before semester exam hall ticket generation.`;
      }

      if (previewText) previewText.textContent = msg;
    };

    if (studSelect) studSelect.onchange = updatePreview;
    if (reasonSelect) reasonSelect.onchange = updatePreview;

    if (sendBtn) {
      sendBtn.onclick = async () => {
        const studentId = studSelect.value;
        const reason = reasonSelect.value;
        const customMessage = previewText ? previewText.textContent : '';

        sendBtn.disabled = true;
        sendBtn.innerHTML = `
          <div class="pulse-dot"></div> Dispatching via AWS SNS Topic...
        `;

        try {
          const res = await api.sendParentAlert({
            student_id: studentId,
            reason,
            custom_message: customMessage
          });

          dispatchStatus.innerHTML = `
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: var(--radius-md); padding: 12px; color: #065f46; font-size: 12px;">
              <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 700; margin-bottom: 4px;">
                <span>✅ AWS SNS DISPATCH CONFIRMED</span>
                <span style="font-family: monospace;">${res.alert?.message_id || 'sns-msg-9481'}</span>
              </div>
              <div>SMS delivered to parent phone <strong>${res.alert?.parent_phone}</strong>. Event logged into AWS CloudWatch & SmartAttend Audit trail.</div>
            </div>
          `;

          playRfidChime('success');
          this.showToast('Parent SNS Dispatched', `SMS alert delivered to ${res.alert?.parent_name} (${res.alert?.parent_phone}).`, 'critical');
          sendBtn.innerHTML = `✓ ALERT DISPATCHED SUCCESSFULLY`;
          await this.loadInitialData();
        } catch (err) {
          sendBtn.disabled = false;
          sendBtn.textContent = 'DISPATCH AWS SNS ALERT NOW';
          dispatchStatus.innerHTML = `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius-md); padding: 12px; color: #991b1b; font-size: 12px;">
              Dispatch error: ${err.message || 'Failed to dispatch SNS alert.'}
            </div>
          `;
        }
      };
    }
  }
}

// Instantiate and start app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new SmartAttendApp();
  window.smartAttendApp = app;
  app.init();
});
