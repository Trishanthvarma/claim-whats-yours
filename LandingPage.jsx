// Landing page: two entry cards (Government Admin and Citizen Portal), a disclaimer and short steps.
import { Link } from 'react-router-dom';
import { PublicLayout } from '../components/Layout.jsx';
import { Icon } from '../components/Icon.jsx';

export default function LandingPage() {
  return (
    <PublicLayout>
      <section aria-labelledby="landing-title" style={{ marginTop: 16 }}>
        <h1 id="landing-title">SchemeSaathi</h1>
        <p style={{ fontSize: '1.1rem' }}>
          Helping students and families in Telangana find government schemes they may qualify for.
        </p>

        <div className="notice notice-demo" role="note">
          This is an independent prototype with SAMPLE data. It is not an official government portal.
        </div>

        <div className="grid grid-2">
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="row" style={{ gap: 12 }}>
              <Icon name="shield" size={40} />
              <h2 style={{ margin: 0 }}>Government Admin</h2>
            </div>
            <p>Manage scheme listings, see registered users in aggregate, and view reports. For authorised officers.</p>
            <Link className="btn btn-primary" to="/admin/login">
              Government Login
            </Link>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="row" style={{ gap: 12 }}>
              <Icon name="family" size={40} />
              <h2 style={{ margin: 0 }}>Citizen / User Portal</h2>
            </div>
            <p>Add your family details and see schemes you may be eligible for, with the documents you need.</p>
            <Link className="btn btn-primary" to="/citizen/login">
              Get Started
            </Link>
          </div>
        </div>

        <section aria-labelledby="how-title" style={{ marginTop: 24 }}>
          <h2 id="how-title">How it works</h2>
          <ol>
            <li>Add your family members and their basic details.</li>
            <li>See which schemes you are likely to qualify for, and what information is still missing.</li>
            <li>Check the official portal and documents list, then apply on the official website.</li>
          </ol>
        </section>
      </section>
    </PublicLayout>
  );
}
