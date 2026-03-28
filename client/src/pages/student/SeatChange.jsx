import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

export default function ChangeSeat() {
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState({ preferred_room_id: '', reason: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResident, setIsResident] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkResident();
  }, []);

  async function checkResident() {
    try {
      const res = await api.get('/seats');
      setRooms(res.data.rooms.filter(r => parseInt(r.available_seats) > 0));
      setIsResident(true);
    } catch (err) {
      console.error(err);
      setIsResident(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.post('/seat-changes', form);
      setSuccess('Seat change request submitted! You can track its status in My Applications');
      setTimeout(() => navigate('/my-applications'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Change Seat</h1>
      </div>

      <div className="card" style={{ maxWidth: '640px', animation: 'slideUp 0.5s ease' }}>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="alert alert-info" style={{ marginBottom: '20px' }}>
          ℹ️ You must be a current hall resident to request a seat change. If you don't have a seat yet, please apply for one first.
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="preferred-room">Preferred Room</label>
            <select
              id="preferred-room"
              className="form-control"
              value={form.preferred_room_id}
              onChange={e => setForm(f => ({ ...f, preferred_room_id: e.target.value }))}
            >
              <option value="">Select room</option>
              {rooms.map(r => (
                <option key={r.room_id} value={r.room_id}>
                  Room {r.room_number} (Floor {r.floor}, {r.hall_name}) — {r.available_seats} seats available
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="change-reason">Reason for Change</label>
            <textarea
              id="change-reason"
              className="form-control"
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              required
              rows={4}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}