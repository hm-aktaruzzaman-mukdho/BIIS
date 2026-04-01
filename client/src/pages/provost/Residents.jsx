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

      <div>
        {filtered.length} resident(s) found
      </div>
    </div>
  );
}