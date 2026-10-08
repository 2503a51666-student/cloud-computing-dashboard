/**
 * SmartAttend - Notification Center Component
 */

export function renderNotificationCenter(notifications, onMarkRead, onMarkAllRead) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return `
    <div style="margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
      <div>
        <h2 style="font-size: 22px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em;">
          Notification & Alert Center
        </h2>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
          Live reminders, RFID swipe notifications, threshold alerts, and timetable updates.
        </p>
      </div>

      <div style="display: flex; gap: 10px;">
        ${unreadCount > 0 ? `
          <button id="btn-mark-all-read-page" class="btn btn-secondary btn-sm">
            ✓ Mark All (${unreadCount}) as Read
          </button>
        ` : ''}
        <button id="btn-send-test-reminder" class="btn btn-outline btn-sm">
          🔔 Trigger Class Reminder
        </button>
      </div>
    </div>

    <!-- Notification Cards List -->
    <div class="card" style="padding: 0; overflow: hidden;">
      <div style="padding: 14px 20px; background: var(--bg-subtle); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 12.5px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em;">
          All System Notifications (${notifications.length})
        </span>
        <span style="font-size: 11.5px; color: var(--text-muted);">
          Connected to AWS SNS Event Dispatcher
        </span>
      </div>

      <div style="display: flex; flex-direction: column;">
        ${notifications.length === 0 ? `
          <div style="padding: 40px; text-align: center; color: var(--text-muted); font-size: 13px;">
            No notifications at this time.
          </div>
        ` : notifications.map(n => renderNotificationItem(n)).join('')}
      </div>
    </div>
  `;
}

function renderNotificationItem(n) {
  let icon = '🔔';
  let badgeColor = 'var(--primary)';
  let bgHighlight = n.read ? 'transparent' : 'rgba(37, 99, 235, 0.03)';

  if (n.type.includes('SUCCESS') || n.severity === 'success') {
    icon = '✅';
    badgeColor = '#059669';
  } else if (n.type.includes('WARNING') || n.severity === 'warning') {
    icon = '⚠️';
    badgeColor = '#d97706';
  } else if (n.type.includes('REMINDER')) {
    icon = '⏰';
    badgeColor = '#4f46e5';
  } else if (n.severity === 'critical') {
    icon = '🚨';
    badgeColor = '#dc2626';
  }

  const timeFormatted = new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateFormatted = new Date(n.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });

  return `
    <div class="notification-item" style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); background: ${bgHighlight}; display: flex; align-items: flex-start; gap: 14px; transition: var(--transition);" data-id="${n.id}">
      <div style="font-size: 20px; line-height: 1; flex-shrink: 0; padding-top: 2px;">
        ${icon}
      </div>

      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
          <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            <span>${n.title}</span>
            ${!n.read ? `<span style="width: 7px; height: 7px; border-radius: 50%; background: var(--primary); display: inline-block;"></span>` : ''}
          </div>
          <span style="font-size: 11.5px; color: var(--text-muted); font-feature-settings: 'tnum';">
            ${dateFormatted} at ${timeFormatted}
          </span>
        </div>
        <div style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.4;">
          ${n.message}
        </div>
      </div>

      ${!n.read ? `
        <button class="btn btn-outline btn-sm btn-mark-one-read" data-id="${n.id}" style="padding: 4px 8px; font-size: 11px;">
          Mark Read
        </button>
      ` : ''}
    </div>
  `;
}
