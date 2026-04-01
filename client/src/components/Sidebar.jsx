import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user } = useAuth();

  const studentSections = [
    {
      title: 'SEAT MANAGEMENT',
      links: [
        { to: '/seats', label: 'Seat Availability' },
        { to: '/apply', label: 'Apply for Seat' },
        { to: '/change-seat', label: 'Change Seat' },
      ]
    },
    {
      title: 'APPLICATION',
      links: [
        { to: '/my-applications', label: 'My Applications' },
      ]
    },
  ];

  const provostSections = [
    {
      title: 'MANAGEMENT',
      links: [
        { to: '/provost/applications', label: 'Seat Applications' },
        { to: '/provost/seat-changes', label: 'Seat Change Requests' },
        { to: '/provost/residents', label: 'Hall Residents' },
      ]
    },
  ];

  const sections = user?.role === 'provost' ? provostSections : studentSections;

  return (
    <aside className="sidebar">
      {sections.map((section, i) => (
        <div key={i} className="sidebar-section">
          <div className="sidebar-section-title">
            <span className="toggle">[+]</span>
            {section.title}
          </div>
          {section.links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      ))}

      <div className="sidebar-section" style={{ marginTop: '12px' }}>
        <div className="sidebar-section-title">
          <span className="toggle">[+]</span>
          INFO
        </div>
        <NavLink to="/" className="sidebar-link">
          Hall Supervisors
        </NavLink>
      </div>

      <a href="#" className="sidebar-webmail">
        📧 BUET WebMail
      </a>
    </aside>
  );
}
