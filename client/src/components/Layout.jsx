import { Outlet } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-layout">
      {/* Header Banner */}
      <header className="biis-header">
        <div className="header-main">
          <div className="header-logo">🏛️</div>
          <div className="header-text">
            <div className="bangla">বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়</div>
            <div className="english">BUET Institutional Information System</div>
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="biis-nav">
        <NavLink to="/">BIIS Home</NavLink>
        {user?.role === 'student' && (
          <>
            <NavLink to="/seats">Seat Availability</NavLink>
            <NavLink to="/apply">Apply for Seat</NavLink>
            <NavLink to="/change-seat">Change Seat</NavLink>
            <NavLink to="/my-applications">My Applications</NavLink>
          </>
        )}
        {user?.role === 'provost' && (
          <>
            <NavLink to="/provost/applications">Applications</NavLink>
            <NavLink to="/provost/seat-changes">Seat Changes</NavLink>
            <NavLink to="/provost/residents">Residents</NavLink>
          </>
        )}
        <button className="nav-right" onClick={logout}>Logout</button>
      </nav>

      {/* Content Area */}
      <div className="content-wrapper">
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {/* Footer */}
      <footer className="biis-footer">
        Bangladesh University of Engineering & Technology (BUET), Dhaka-1000, Bangladesh. Tel: (880 2) 9665650 Fax: (880 2) 8613046. © All rights reserved, BUET
      </footer>
    </div>
  );
}
