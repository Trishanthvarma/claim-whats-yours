// Page frames for the three portals: Admin, Citizen and Public (landing and login pages).
// Each frame has a top bar with links, a language picker, and a footer with the sample-data warning.
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { useLanguage, LANGUAGE_OPTIONS } from '../i18n/LanguageContext.jsx';
import { SAMPLE_DATA_BANNER } from '../data/sampleData.js';
import { adminLogout, citizenLogout } from '../services/authService.js';
import { HelpButton } from './HelpPanel.jsx';

// Admin menu. Labels are English because no translation key matches them exactly.
const ADMIN_LINKS = [
  { to: '/admin/schemes', label: 'Existing Schemes' },
  { to: '/admin/users', label: 'Registered Users' },
  { to: '/admin/create-scheme', label: 'Create Scheme' },
  { to: '/admin/analytics', label: 'Analytics' },
  { to: '/admin/settings', label: 'Settings' },
];

// Citizen menu. Labels come from translations where a key exists, otherwise English.
const CITIZEN_LINKS = [
  { to: '/citizen/dashboard', key: 'navDashboard', label: 'Dashboard' },
  { to: '/citizen/family', label: 'My Family' },
  { to: '/citizen/matches', label: 'My Schemes' },
  { to: '/citizen/documents', key: 'navDocuments', label: 'Documents' },
  { to: '/citizen/assistant', label: 'Assistant' },
  { to: '/citizen/notifications', key: 'navNotifications', label: 'Notifications' },
  { to: '/citizen/applications', key: 'navApplications', label: 'My Applications' },
  { to: '/citizen/settings', key: 'navSettings', label: 'Settings' },
];

const DEFAULT_HELP = [
  'Use the menu at the top to move between pages.',
  'Use the language box to change the language.',
  'Everything on this site is sample data for a prototype.',
];

// Language picker. A native select with a label for screen readers.
function LanguageSelector() {
  const { lang, setLang } = useLanguage();
  return (
    <select
      className="select"
      aria-label="Language"
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      style={{ width: 'auto', minHeight: 44 }}
    >
      {LANGUAGE_OPTIONS.map((opt) => (
        <option key={opt.code} value={opt.code}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// Shared frame: top bar + page content + footer. Portal-specific parts come in as props.
function Frame({ brand, links, tools, children, title }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div>
      <header className="top-nav">
        <Link to={links?.[0]?.to ?? '/'} className="brand" style={{ color: '#ffffff' }}>
          {brand}
        </Link>

        {links && (
          <nav
            id="main-menu"
            aria-label="Main menu"
            className={`nav-links${menuOpen ? ' is-open' : ''}`}
          >
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                style={({ isActive }) => ({ textDecoration: isActive ? 'underline' : 'none' })}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="row" style={{ gap: 8 }}>
          {tools}
          {links && (
            <button
              type="button"
              className="hamburger"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="main-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          {title && <h1 className="page-title">{title}</h1>}
          {children}
        </div>
      </main>

      <footer className="container muted">
        <p className="notice notice-demo">{SAMPLE_DATA_BANNER}</p>
        <p>Independent prototype. Not an official government portal.</p>
      </footer>
    </div>
  );
}

// Admin portal frame.
export function AdminLayout({ children, title, helpSteps }) {
  const navigate = useNavigate();
  const steps = helpSteps && helpSteps.length ? helpSteps : DEFAULT_HELP;

  async function handleLogout() {
    await adminLogout();
    navigate('/');
  }

  const tools = (
    <>
      <LanguageSelector />
      <HelpButton steps={steps} />
      <button type="button" className="btn btn-secondary" onClick={handleLogout}>
        Log out
      </button>
    </>
  );

  return (
    <Frame brand="SchemeSaathi Admin" links={ADMIN_LINKS} tools={tools} title={title}>
      {children}
    </Frame>
  );
}

// Citizen portal frame. Shows an unread notification count from the store.
export function CitizenLayout({ children, title, helpSteps }) {
  const navigate = useNavigate();
  const { state } = useStore();
  const { session, citizens } = state;
  const { t } = useLanguage();
  const steps = helpSteps && helpSteps.length ? helpSteps : DEFAULT_HELP;

  const unread = (citizens[session.phone]?.notifications ?? []).filter((n) => !n.read).length;

  async function handleLogout() {
    await citizenLogout();
    navigate('/');
  }

  // Build the links. Translate labels where a key exists; add the unread count to notifications.
  const links = CITIZEN_LINKS.map((link) => {
    const label = link.key ? t(link.key) : link.label;
    if (link.to === '/citizen/notifications' && unread > 0) {
      return { ...link, label: `${label} (${unread} unread)` };
    }
    return { ...link, label };
  });

  const tools = (
    <>
      <LanguageSelector />
      <HelpButton steps={steps} />
      <button type="button" className="btn btn-secondary" onClick={handleLogout}>
        {t('logout')}
      </button>
    </>
  );

  return (
    <Frame brand="SchemeSaathi" links={links} tools={tools} title={title}>
      {children}
    </Frame>
  );
}

// Public frame (landing page, admin login). Language picker only.
export function PublicLayout({ children }) {
  const tools = <LanguageSelector />;
  return (
    <Frame brand="SchemeSaathi" links={null} tools={tools}>
      {children}
    </Frame>
  );
}
