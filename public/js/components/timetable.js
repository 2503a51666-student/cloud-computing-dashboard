/**
 * SmartAttend - Timetable & Class Schedule Component
 * Faithfully mirrors the user's uploaded Weekly Timetable (Monday–Friday, 09:30–17:30).
 */

export function renderTimetable(data, onTriggerScan, activeMode = 'weekly') {
  const todaySchedule = data.todaySchedule || [];
  const allTimetable = data.allTimetable || [];
  const recentRecords = data.recentRecords || [];

  return `
    <div style="margin-bottom: 20px;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 24px;">🗓️</span>
            <h2 style="font-size: 22px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em;">
              My Weekly Timetable
            </h2>
          </div>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
            Computer Science & Engineering | I Year (Semester 2)
          </p>
        </div>

        <!-- Mode Toggle & Legend -->
        <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 12px; font-size: 12px; font-weight: 600; background: var(--bg-card); padding: 6px 14px; border-radius: var(--radius-full); border: 1px solid var(--border-color);">
            <span style="display: flex; align-items: center; gap: 6px; color: #2563eb;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #2563eb; display: inline-block;"></span>
              L - Lecture
            </span>
            <span style="display: flex; align-items: center; gap: 6px; color: #059669;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #059669; display: inline-block;"></span>
              P - Practical
            </span>
          </div>

          <div style="display: flex; gap: 6px;">
            <button class="btn btn-sm ${activeMode === 'weekly' ? 'btn-primary' : 'btn-outline'}" id="btn-tab-weekly">
              Weekly Grid View
            </button>
            <button class="btn btn-sm ${activeMode === 'today' ? 'btn-primary' : 'btn-outline'}" id="btn-tab-today">
              Today's Classes
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Active View Display -->
    <div id="timetable-view-container">
      ${activeMode === 'weekly' ? renderWeeklyGridView(allTimetable) : renderTodayScheduleCards(todaySchedule, recentRecords, onTriggerScan)}
    </div>
  `;
}

/**
 * 5-Day Weekly Grid View directly modeled from the uploaded image
 */
function renderWeeklyGridView(timetable) {
  const timeSlots = [
    { label: '09:30', time: '09:30' },
    { label: '10:30', time: '10:30' },
    { label: '11:30', time: '11:30' },
    { label: '13:30', time: '13:30' },
    { label: '14:30', time: '14:30' },
    { label: '15:30', time: '15:30' },
    { label: '16:30', time: '16:30' }
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return `
    <div class="card" style="padding: 0; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: var(--shadow-md);">
      <div class="table-responsive">
        <table style="width: 100%; border-collapse: collapse; min-width: 900px; font-size: 12.5px;">
          <thead>
            <tr style="background: linear-gradient(135deg, #1d4ed8, #2563eb); color: white; text-align: center;">
              <th style="padding: 14px 10px; width: 85px; border-right: 1px solid rgba(255, 255, 255, 0.2); font-weight: 700;">Time</th>
              <th style="padding: 14px 10px; border-right: 1px solid rgba(255, 255, 255, 0.2); width: 18%;">Monday</th>
              <th style="padding: 14px 10px; border-right: 1px solid rgba(255, 255, 255, 0.2); width: 18%;">Tuesday</th>
              <th style="padding: 14px 10px; border-right: 1px solid rgba(255, 255, 255, 0.2); width: 18%;">Wednesday</th>
              <th style="padding: 14px 10px; border-right: 1px solid rgba(255, 255, 255, 0.2); width: 18%;">Thursday</th>
              <th style="padding: 14px 10px; width: 18%;">Friday</th>
            </tr>
          </thead>
          <tbody>
            ${timeSlots.map((slot, sIdx) => `
              <tr style="border-bottom: 1px solid #e2e8f0; background: ${sIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 14px 10px; font-weight: 800; text-align: center; color: var(--primary); font-feature-settings: 'tnum'; border-right: 1px solid #e2e8f0; background: #f1f5f9;">
                  ${slot.label}
                </td>
                ${days.map(day => {
                  const entry = timetable.find(t => t.day.toLowerCase() === day.toLowerCase() && t.start_time === slot.time);
                  return renderGridCell(entry);
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderGridCell(entry) {
  if (!entry) {
    return `<td style="padding: 10px; border-right: 1px solid #e2e8f0; background: rgba(241, 245, 249, 0.3);"></td>`;
  }

  const isLecture = entry.type === 'LECTURE' || entry.type_label?.includes('Lecture');
  const accentColor = isLecture ? '#2563eb' : '#059669';
  const bgColor = isLecture ? '#eff6ff' : '#ecfdf5';
  const borderColor = isLecture ? '#bfdbfe' : '#a7f3d0';
  const typeText = isLecture ? 'LECTURE' : 'PRACTICAL';
  const dotColor = isLecture ? '#2563eb' : '#10b981';

  return `
    <td style="padding: 8px 10px; border-right: 1px solid #e2e8f0; vertical-align: top;">
      <div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-left: 4px solid ${accentColor}; border-radius: var(--radius-sm); padding: 8px 10px; height: 100%; transition: var(--transition);" class="hover-shadow">
        <div style="font-weight: 800; color: #0f172a; font-size: 13px; line-height: 1.2;">
          ${entry.subject_name}
        </div>
        <div style="display: flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: ${accentColor}; margin: 3px 0;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: ${dotColor}; display: inline-block;"></span>
          ${typeText}
        </div>
        <div style="font-size: 11px; color: #475569; display: flex; align-items: center; gap: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          👨‍🏫 ${entry.faculty}
        </div>
      </div>
    </td>
  `;
}

function renderTodayScheduleCards(todaySchedule, recentRecords, onTriggerScan) {
  return `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      ${todaySchedule.map(cls => renderScheduleDetailCard(cls, recentRecords, onTriggerScan)).join('')}
    </div>
  `;
}

function renderScheduleDetailCard(cls, recentRecords, onTriggerScan) {
  const isLecture = cls.type === 'LECTURE';
  const badgeType = isLecture
    ? `<span style="font-size: 11px; font-weight: 700; background: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: var(--radius-full);">L - Lecture</span>`
    : `<span style="font-size: 11px; font-weight: 700; background: #ecfdf5; color: #059669; padding: 2px 8px; border-radius: var(--radius-full);">P - Practical</span>`;

  const rec = recentRecords.find(r => r.subject_id === cls.subject_id && r.date === '2026-10-08');

  let statusBadge = `<span class="badge badge-absent">Upcoming</span>`;
  let statusColor = '#64748b';
  if (rec) {
    if (rec.status === 'ON TIME') {
      statusBadge = `<span class="badge badge-ontime">Punched: ON TIME (${rec.rfid_punch_time.substring(0, 5)})</span>`;
      statusColor = '#059669';
    } else if (rec.status === 'LATE') {
      statusBadge = `<span class="badge badge-late">Punched: LATE (${rec.rfid_punch_time.substring(0, 5)})</span>`;
      statusColor = '#d97706';
    } else if (rec.status === 'VERY LATE') {
      statusBadge = `<span class="badge badge-verylate">Punched: VERY LATE</span>`;
      statusColor = '#dc2626';
    }
  }

  return `
    <div class="card" style="border-left: 5px solid ${isLecture ? '#2563eb' : '#059669'};">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
        <div style="flex: 1; min-width: 260px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <span style="font-size: 14px; font-weight: 700; color: var(--primary); font-feature-settings: 'tnum';">
              ${formatTime12(cls.start_time)} – ${formatTime12(cls.end_time)}
            </span>
            ${badgeType}
            ${cls.consecutive ? `<span style="font-size: 10.5px; background: #fef3c7; color: #92400e; padding: 2px 7px; border-radius: var(--radius-full); font-weight: 700;">2-Hour Block</span>` : ''}
            ${statusBadge}
          </div>

          <h3 style="font-size: 17px; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">
            ${cls.subject_name}
          </h3>

          <div style="font-size: 12.5px; color: var(--text-secondary); display: flex; flex-wrap: wrap; gap: 16px; margin-top: 6px;">
            <span>👨‍🏫 Faculty: <strong>${cls.faculty}</strong></span>
            <span>📍 Room: <strong>${cls.room}</strong> (${cls.building || 'Campus'})</span>
            <span>📡 RFID Reader: <strong>${cls.reader_id}</strong></span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
          <button class="btn btn-outline btn-sm btn-simulate-this-class" data-reader="${cls.reader_id}" data-subject="${cls.subject_id}" data-time="${cls.start_time}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            Simulate Tap Here
          </button>
        </div>
      </div>
    </div>
  `;
}

function formatTime12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}
