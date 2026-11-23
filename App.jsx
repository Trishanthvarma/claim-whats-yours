// App routes. Admin pages need an admin session. Citizen pages need a citizen session,
// and most of them also need a finished profile.
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from './lib/store.jsx';
import LandingPage from './pages/LandingPage.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import AdminSchemesPage from './pages/AdminSchemesPage.jsx';
import CreateSchemePage from './pages/CreateSchemePage.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage.jsx';
import AdminSettingsPage from './pages/AdminSettingsPage.jsx';
import CitizenLoginPage from './pages/CitizenLoginPage.jsx';
import ProfileSetupPage from './pages/ProfileSetupPage.jsx';
import CitizenDashboardPage from './pages/CitizenDashboardPage.jsx';
import FamilyPage from './pages/FamilyPage.jsx';
import MatchesPage from './pages/MatchesPage.jsx';
import SchemeDetailsPage from './pages/SchemeDetailsPage.jsx';
import DocumentsPage from './pages/DocumentsPage.jsx';
import AssistantPage from './pages/AssistantPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import ApplicationsPage from './pages/ApplicationsPage.jsx';
import CitizenSettingsPage from './pages/CitizenSettingsPage.jsx';

/**
 * Wraps a page. Sends the user to the right login page if the session does not match.
 * role: 'admin' or 'citizen'. requireProfile: citizen must have finished profile setup.
 */
function ProtectedRoute({ role, requireProfile = false, children }) {
  const { state } = useStore();
  const { session, citizens } = state;

  if (role === 'admin') {
    if (session.role !== 'admin') return <Navigate to="/admin/login" replace />;
    return children;
  }

  if (session.role !== 'citizen' || !session.phone) {
    return <Navigate to="/citizen/login" replace />;
  }
  if (requireProfile && !citizens[session.phone]?.profile?.fullName) {
    return <Navigate to="/citizen/profile-setup" replace />;
  }
  return children;
}

// Shown for any address that does not match a route.
function NotFoundPage() {
  return (
    <main className="container">
      <div className="card">
        <h1>Page not found</h1>
        <p>The page you asked for does not exist.</p>
        <Link className="btn btn-primary" to="/">Go to home</Link>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      {/* Admin portal */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<Navigate to="/admin/schemes" replace />} />
      <Route path="/admin/schemes" element={<ProtectedRoute role="admin"><AdminSchemesPage /></ProtectedRoute>} />
      <Route path="/admin/create-scheme" element={<ProtectedRoute role="admin"><CreateSchemePage /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute role="admin"><AdminUsersPage /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute role="admin"><AdminAnalyticsPage /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute role="admin"><AdminSettingsPage /></ProtectedRoute>} />

      {/* Citizen portal. Login and profile setup do not need a finished profile. */}
      <Route path="/citizen/login" element={<CitizenLoginPage />} />
      <Route path="/citizen/profile-setup" element={<ProtectedRoute role="citizen"><ProfileSetupPage /></ProtectedRoute>} />
      <Route path="/citizen/dashboard" element={<ProtectedRoute role="citizen" requireProfile><CitizenDashboardPage /></ProtectedRoute>} />
      <Route path="/citizen/family" element={<ProtectedRoute role="citizen" requireProfile><FamilyPage /></ProtectedRoute>} />
      <Route path="/citizen/matches" element={<ProtectedRoute role="citizen" requireProfile><MatchesPage /></ProtectedRoute>} />
      <Route path="/citizen/schemes/:schemeId" element={<ProtectedRoute role="citizen" requireProfile><SchemeDetailsPage /></ProtectedRoute>} />
      <Route path="/citizen/documents" element={<ProtectedRoute role="citizen" requireProfile><DocumentsPage /></ProtectedRoute>} />
      <Route path="/citizen/assistant" element={<ProtectedRoute role="citizen" requireProfile><AssistantPage /></ProtectedRoute>} />
      <Route path="/citizen/notifications" element={<ProtectedRoute role="citizen" requireProfile><NotificationsPage /></ProtectedRoute>} />
      <Route path="/citizen/applications" element={<ProtectedRoute role="citizen" requireProfile><ApplicationsPage /></ProtectedRoute>} />
      <Route path="/citizen/settings" element={<ProtectedRoute role="citizen" requireProfile><CitizenSettingsPage /></ProtectedRoute>} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
