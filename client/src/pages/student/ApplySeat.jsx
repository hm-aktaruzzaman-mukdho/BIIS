import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function ApplySeat() {
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState({ preferred_room_id: '', reason: '' });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [residentInfo, setResidentInfo] = useState(null);
  const [checkingResident, setCheckingResident] = useState(true);
  const [hallName, setHallName] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    checkResident();
    loadRooms();
    loadHallName();
  }, []);

  async function checkResident() {
    try {
      const res = await api.get('/applications/resident-check');
      if (res.data.isResident) {
        setResidentInfo(res.data.resident);
      }
    } catch (err) { console.error(err); }
    finally { setCheckingResident(false); }
  }

  async function loadHallName() {
    try {
      const res = await api.get('/seats/halls');
      const myHall = res.data.halls.find(h => h.id === user?.hall_id);
      if (myHall) setHallName(myHall.name);
    } catch (err) { console.error(err); }
  }

  async function loadRooms() {
    try {
      // Backend auto-filters by student's hall
      const res = await api.get('/seats');
      setRooms(res.data.rooms.filter(r => parseInt(r.available_seats) > 0));
    } catch (err) { console.error(err); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('reason', form.reason);
      if (form.preferred_room_id) formData.append('preferred_room_id', form.preferred_room_id);
      if (file) formData.append('document', file);

      await api.post('/applications', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess('Application submitted successfully! You can track its status in My Applications.');
      setTimeout(() => navigate('/my-applications'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Apply for Seat</h1>
        <p>Submit a seat allocation request with your reason and supporting documents</p>
      </div>

      {checkingResident ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : residentInfo ? (
        <div className="card" style={{ maxWidth: '640px' }}>
          <div style={{
            padding: '24px', textAlign: 'center',
            background: '#FFF3E0', border: '2px solid #FFB74D', borderRadius: '6px'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🏠</div>
            <h3 style={{ color: '#E65100', margin: '0 0 8px' }}>You Are Already a Hall Resident</h3>
            <p style={{ color: '#555', margin: '0 0 12px' }}>
              You are currently assigned to <strong>{residentInfo.hall_name}</strong>,
              Room <strong>{residentInfo.room_number}</strong>, Seat <strong>{residentInfo.seat_number}</strong>.
            </p>
            <p style={{ color: '#777', fontSize: '0.88rem' }}>
              Current residents cannot apply for a new seat. If you need a different room, use the <strong>Change Seat</strong> option instead.
            </p>
          </div>
        </div>
      ) : (
      <div className="card" style={{ maxWidth: '640px', animation: 'slideUp 0.5s ease' }}>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {hallName && (
          <div style={{
            padding: '10px 14px', marginBottom: '16px',
            background: '#f0ebe0', border: '1px solid #d5cfc0', fontSize: '0.9rem'
          }}>
            🏛️ Applying for: <strong>{hallName}</strong>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {rooms.length > 0 && (
            <div className="form-group">
              <label htmlFor="room">Preferred Room (Optional)</label>
              <select
                id="room"
                className="form-control"
                value={form.preferred_room_id}
                onChange={e => setForm(f => ({ ...f, preferred_room_id: e.target.value }))}
              >
                <option value="">No preference</option>
                {rooms.map(r => (
                  <option key={r.room_id} value={r.room_id}>
                    Room {r.room_number} (Floor {r.floor}) — {r.available_seats} seats available
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="reason">Reason for Application *</label>
            <textarea
              id="reason"
              className="form-control"
              placeholder="Explain why you need hall accommodation. Include details about your financial situation, distance from university, medical conditions, or any other relevant information..."
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              required
              rows={5}
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              A detailed reason with supporting keywords will improve your AI recommendation score
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="document">Supporting Document (Optional)</label>
            <input
              id="document"
              type="file"
              className="form-control"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={e => setFile(e.target.files[0])}
              style={{ padding: '10px' }}
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              PDF, images, or Word documents (max 5MB). Attaching documents strengthens your application.
            </p>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Submitting...' : '📝 Submit Application'}
          </button>
        </form>
      </div>
      )}
    </div>
  );
}
