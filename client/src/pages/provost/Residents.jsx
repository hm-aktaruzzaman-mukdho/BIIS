import { useState, useEffect } from 'react';
import api from '../../api';

export default function Residents() {
  const [residents, setResidents] = useState([]);
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadResidents();
  }, []);

  async function loadResidents() {
    setLoading(true);
    try {
      const res = await api.get('/residents');
      setResidents(res.data.residents);
      setHalls(res.data.halls || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = residents.filter(r =>
    !search ||
    r.student_name.toLowerCase().includes(search.toLowerCase()) ||
    r.student_roll?.toLowerCase().includes(search.toLowerCase()) ||
    r.room_number?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Hall Residents</h1>
        <p>View all current residents with room assignments, dining schedules, and absence records</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">👥</div>
          <div className="stat-info">
            <h3>{residents.length}</h3>
            <p>Total Residents</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">🏛️</div>
          <div className="stat-info">
            <h3>{halls.length}</h3>
            <p>{halls.length === 1 ? 'Hall' : 'Halls'} Managed</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">🍽️</div>
          <div className="stat-info">
            <h3>{residents.reduce((s, r) => s + (r.dining_days?.length || 0), 0)}</h3>
            <p>Total Dining Slots</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">📋</div>
          <div className="stat-info">
            <h3>{residents.reduce((s, r) => s + (r.absence_count || 0), 0)}</h3>
            <p>Total Absences</p>
          </div>
        </div>
      </div>

      <div className="filters-bar">
        <input
          type="text"
          className="form-control"
          placeholder="Search by name, ID, or room number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: '300px' }}
        />
      </div>

      
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🏠</div>
          <h3>No residents found</h3>
          <p>{search ? 'Try a different search term' : 'No residents in your hall yet'}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>ID</th>
                <th>Department</th>
                <th>Room</th>
                <th>Seat</th>
                <th>Dining Days</th>
                <th>Absences</th>
                <th>Assigned</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <div>
                      <strong>{r.student_name}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.student_email}</div>
                    </div>
                  </td>
                  <td>{r.student_roll || '—'}</td>
                  <td>{r.department || '—'}</td>
                  <td>
                    <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                      {r.room_number} (F{r.floor})
                    </span>
                  </td>
                  <td>Seat {r.seat_number}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {r.dining_days?.length > 0 ? r.dining_days.map((d, i) => (
                        <span key={i} style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          background: 'var(--info-bg)',
                          color: 'var(--info)',
                          borderRadius: '50px',
                          whiteSpace: 'nowrap'
                        }}>
                          {d.slice(0, 3)}
                        </span>
                      )) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${r.absence_count > 3 ? 'badge-denied' : r.absence_count > 0 ? 'badge-pending' : 'badge-approved'}`}>
                      {r.absence_count}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {new Date(r.assigned_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}