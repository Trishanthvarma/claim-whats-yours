// Citizen notifications: lists messages for the signed-in citizen, lets them filter by type,
// mark items as read, and creates deadline reminders for open schemes that close soon.
import { useEffect, useState } from 'react';
import { CitizenLayout } from '../components/Layout.jsx';
import { useStore } from '../lib/store.jsx';

const DAY_MS = 24 * 60 * 60 * 1000;

// Label shown for each notification type. The keys must match the "type" field we store.
const TYPE_LABELS = {
  new_match: 'New matching scheme',
  deadline: 'Deadline reminder',
  missing_document: 'Missing document',
  scheme_update: 'Scheme update',
  application_update: 'Application progress',
};

export default function NotificationsPage() {
  const { state, actions } = useStore();
  const phone = state.session.phone;

  // The notifications for this citizen. Use an empty list if the citizen record is missing.
  const notifications = state.citizens[phone]?.notifications || [];

  // The type chosen in the filter box. "all" shows every type.
  const [filter, setFilter] = useState('all');

  // On first load (and when the phone changes), create deadline reminders.
  // The store skips any reminder whose key already exists, so repeat visits do not add duplicates.
  useEffect(() => {
    if (!phone) return;

    // Schemes can be stored as an array or as an object of schemes. Turn both into an array.
    const schemeList = Array.isArray(state.schemes) ? state.schemes : Object.values(state.schemes || {});
    const now = Date.now();

    for (const scheme of schemeList) {
      // Only published schemes with an end date in the future get reminders.
      if (scheme.status !== 'published') continue;
      const end = Date.parse(scheme.endDate);
      if (Number.isNaN(end) || end <= now) continue;

      // Whole days left, rounded up. For example, 0.4 days left counts as 1 day.
      const remaining = Math.ceil((end - now) / DAY_MS);
      if (remaining > 7) continue;

      // Group the reminder into a threshold so we send one reminder per window (1, 3 or 7 days).
      const threshold = remaining <= 1 ? 1 : remaining <= 3 ? 3 : 7;
      const date = new Date(end).toLocaleDateString();

      actions.addNotification(phone, {
        key: 'deadline:' + scheme.id + ':' + phone + ':' + threshold,
        type: 'deadline',
        title: 'Deadline in ' + remaining + ' day(s): ' + scheme.name,
        message: 'Applications for this scheme close on ' + date + '. Check the official portal.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
    // Run only when the phone changes. The actions object is stable, so it is not listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  // Apply the type filter. "all" keeps every notification.
  const visible = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter);

  return (
    <CitizenLayout
      title="Notifications"
      helpSteps={[
        'Each card is one message about a scheme, a deadline or your application.',
        'Use the filter box to show only one type of message.',
        'Press "Mark as read" on a message once you have seen it.',
        'Press "Mark all as read" to clear all unread messages at once.',
        'Deadline reminders are created automatically for open schemes that close within 7 days.',
      ]}
    >
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div className="form-group">
          <select
            className="select"
            aria-label="Filter notifications by type"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => actions.markAllRead(phone)}
        >
          Mark all as read
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <p>No notifications yet.</p>
        </div>
      ) : (
        visible.map((n) => (
          <div key={n.id} className="card">
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <strong>{n.title}</strong>
              <span className={n.read ? 'badge badge-muted' : 'badge badge-info'}>
                {n.read ? 'Read' : 'Unread'}
              </span>
            </div>
            <p className="muted">
              {TYPE_LABELS[n.type] || 'Notification'} · {new Date(n.createdAt).toLocaleDateString()}
            </p>
            <p>{n.message}</p>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={n.read}
              onClick={() => actions.markNotificationRead(phone, n.id)}
            >
              Mark as read
            </button>
          </div>
        ))
      )}
    </CitizenLayout>
  );
}
