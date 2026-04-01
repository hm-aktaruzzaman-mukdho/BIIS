import { useState, useEffect } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function SeatAvailability() {
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState([]);
  const [filters, setFilters] = useState({ floor: '', room_number: '' });
  const [loading, setLoading] = useState(true);
  const [hallName, setHallName] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    loadStats();
    loadHallName();
  }, []);

  useEffect(() => {
    loadRooms();
  }, [filters]);

  async function loadHallName() {
    try {
      const res = await api.get('/seats/halls');
      const myHall = res.data.halls.find(h => h.id === user?.hall_id);
      if (myHall) setHallName(myHall.name);
    } catch (err) { console.error(err); }
  }

  async function loadStats() {
    try {
      const res = await api.get('/seats/stats');
      setStats(res.data.stats);
    } catch (err) { console.error(err); }
  }

  async function loadRooms() {
    setLoading(true);
    try {
      const params = {};
      // No hall_id param needed — backend auto-filters by student's hall
      if (filters.floor) params.floor = filters.floor;
      if (filters.room_number) params.room_number = filters.room_number;
      const res = await api.get('/seats', { params });
      setRooms(res.data.rooms);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const totalAvailable = stats.reduce((sum, s) => sum + parseInt(s.available || 0), 0);
  const totalOccupied = stats.reduce((sum, s) => sum + parseInt(s.occupied || 0), 0);
  const totalSeats = stats.reduce((sum, s) => sum + parseInt(s.total_seats || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1>Seat Availability{hallName ? ` — ${hallName}` : ''}</h1>
        <p>Browse available seats and filter by floor or room number</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">🪑</div>
          <div className="stat-info">
            <h3>{totalSeats}</h3>
            <p>Total Seats</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-info">
            <h3>{totalAvailable}</h3>
            <p>Available</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">🔒</div>
          <div className="stat-info">
            <h3>{totalOccupied}</h3>
            <p>Occupied</p>
          </div>
        </div>
      </div>

      <div className="filters-bar">
        <select
          className="form-control"
          value={filters.floor}
          onChange={e => setFilters(f => ({ ...f, floor: e.target.value }))}
        >
          <option value="">All Floors</option>
          {[1, 2, 3, 4, 5].map(f => (
            <option key={f} value={f}>Floor {f}</option>
          ))}
        </select>

        <input
          type="text"
          className="form-control"
          placeholder="Search room number..."
          value={filters.room_number}
          onChange={e => setFilters(f => ({ ...f, room_number: e.target.value }))}
        />
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : rooms.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🏠</div>
          <h3>No rooms found</h3>
          <p>Try adjusting your filters</p>
        </div>
      ) : (
        <div className="room-grid">
          {rooms.map(room => {
            const available = parseInt(room.available_seats);
            const occupied = parseInt(room.occupied_seats);
            const total = parseInt(room.total_seats);

            return (
              <div key={room.room_id} className="room-card">
                <div className="room-card-header">
                  <h3>Room {room.room_number}</h3>
                  <span className="floor-tag">Floor {room.floor}</span>
                </div>

                <div className="seat-dots">
                  {Array.from({ length: total }, (_, i) => (
                    <div
                      key={i}
                      className={`seat-dot ${i < occupied ? 'occupied' : 'available'}`}
                      title={i < occupied ? 'Occupied' : 'Available'}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>

                <div className="room-stats">
                  <span>
                    <span style={{ color: 'var(--success)' }}>●</span> {available} available
                  </span>
                  <span>
                    <span style={{ color: 'var(--danger)' }}>●</span> {occupied} occupied
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
