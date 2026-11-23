// Admin page 5: Settings. Admin profile (demo), the activity log, reset of demo data, and log out.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/Layout.jsx';
import { useStore } from '../lib/store.jsx';
import { adminLogout } from '../services/authService.js';

function fmtDateTime(iso) {
  if (!iso) return 'Not recorded';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not recorded';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminSettingsPage() {
  const navigate = useNavigate();
  const { state, actions } = useStore();
  const [actionFilter, setActionFilter] = useState('all');
  const [message, setMessage] = useState('');

  // Every distinct action name in the log, for the filter box.
  const actionNames = [...new Set(state.adminLog.map((e) => e.action))].sort();
  const shown = state.adminLog.filter((e) => actionFilter === 'all' || e.action === actionFilter);

  // Reset wipes all data and the session, so sign the demo admin back in straight away.
  function resetData() {
    if (!window.confirm('Reset all demo data? Every change you made will be lost and the sample data will come back.')) return;
    actions.resetDemoData();
    actions.adminLogin();
    setMessage('Demo data was reset to the sample data. You are still signed in as the demo admin.');
  }

  async function logOut() {
    await adminLogout();
    navigate('/');
  }

  return (
    <AdminLayout
      title="Settings"
      helpSteps={[
        'The profile card shows the demo admin account. It is a prototype and not verified.',
        'The activity log shows what officers did. Use the filter to see one kind of action.',
        'Reset demo data puts back the sample data and clears your changes. It cannot be undone.',
        'Log out ends this session.',
      ]}
    >
      <section className="card" aria-labelledby="profile-heading">
        <h2 id="profile-heading">Admin profile</h2>
        <dl className="grid grid-2" style={{ gap: '6px 16px' }}>
          <div><dt className="muted">Name</dt><dd>Demo Officer</dd></div>
          <div><dt className="muted">Email</dt><dd>admin.demo@schemesaathi.example</dd></div>
          <div><dt className="muted">Role</dt><dd>Admin (demo)</dd></div>
          <div><dt className="muted">Account status</dt><dd><span className="badge badge-warning">Prototype account - not verified</span></dd></div>
        </dl>
      </section>

      <section className="card" aria-labelledby="activity-heading">
        <h2 id="activity-heading">Activity log</h2>
        <div className="form-group" style={{ maxWidth: 360 }}>
          <label htmlFor="log-filter">Filter by action</label>
          <select id="log-filter" className="select" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="all">All actions</option>
            {actionNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        {shown.length === 0 ? (
          <p>No activity recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Action</th>
                  <th scope="col">Target</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((entry, i) => (
                  <tr key={`${entry.at}-${i}`}>
                    <td>{fmtDateTime(entry.at)}</td>
                    <td>{entry.action}</td>
                    <td>{entry.target || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="data-heading">
        <h2 id="data-heading">Demo data</h2>
        <p>Reset all schemes, citizens and logs back to the sample data.</p>
        {message && <div className="notice notice-success" role="status">{message}</div>}
        <button type="button" className="btn btn-danger" onClick={resetData}>Reset demo data</button>
      </section>

      <section className="card" aria-labelledby="session-heading">
        <h2 id="session-heading">Session</h2>
        <button type="button" className="btn btn-secondary" onClick={logOut}>Log out</button>
      </section>
    </AdminLayout>
  );
}
