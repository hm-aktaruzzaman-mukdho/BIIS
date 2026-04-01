import { useState, useEffect } from 'react';
import api from '../../api';

export default function SeatChanges() {
  const [seatChanges, setSeatChanges] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadSeatChanges();
  }, []);

  async function loadSeatChanges() {
    setLoading(true);
    try {
      const res = await api.get('/seat-changes');
      setSeatChanges(res.data.seatChanges);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id, status) {
    setProcessing(true);
    try {
      await api.patch(`/seat-changes/${id}`, { status, feedback });
      setActionModal(null);
      setFeedback('');
      loadSeatChanges();
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    } finally {
      setProcessing(false);
    }
  }

  const display = filter
    ? seatChanges.filter(sc => sc.status === filter)
    : seatChanges;

  const pending = seatChanges.filter(sc => sc.status === 'pending').length;

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Seat Change Requests</h1>
        <p>Review and manage seat change requests from residents</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon yellow">⏳</div>
          <div className="stat-info">
            <h3>{pending}</h3>
            <p>Pending Requests</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">🔄</div>
          <div className="stat-info">
            <h3>{seatChanges.length}</h3>
            <p>Total Requests</p>
          </div>
        </div>
      </div>

      <div className="filters-bar">
        {['', 'pending', 'approved', 'denied'].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter(f)}
          >
            {f === '' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {display.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🔄</div>
          <h3>No seat change requests</h3>
          <p>No requests match the current filter</p>
        </div>
      ) : (
        display.map(sc => (
          <div key={sc.id} className="application-card">
            <div className="application-header">
              <div className="applicant-info">
                <h3>{sc.student_name}</h3>
                <p>
                  {sc.student_roll} · {sc.student_email}
                  {' · '}
                  {new Date(sc.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <span className={`badge badge-${sc.status}`}>
                {sc.status.toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '24px', marginTop: '12px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              {sc.current_room && (
                <span>
                  📍 Current: <strong style={{ color: 'var(--text-primary)' }}>Room {sc.current_room}</strong> (Seat {sc.current_seat_number}, Floor {sc.current_floor})
                </span>
              )}
              {sc.preferred_room && (
                <span>
                  Preferred: <strong style={{ color: 'var(--text-primary)' }}>Room {sc.preferred_room}</strong> (Floor {sc.preferred_floor})
                </span>
              )}
            </div>

            <div className="reason-text">{sc.reason}</div>

            {sc.feedback && (
              <div className="feedback-section">
                <label>Your Feedback</label>
                <p>{sc.feedback}</p>
              </div>
            )}

            {sc.status === 'pending' && (
              <div className="btn-group" style={{ marginTop: '16px' }}>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => { setActionModal({ id: sc.id, action: 'approved', name: sc.student_name }); setFeedback(''); }}
                >
                 ✅ Approve
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => { setActionModal({ id: sc.id, action: 'denied', name: sc.student_name }); setFeedback(''); }}
                >
                  ❌ Deny
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {actionModal && (
        <div className="modal-overlay" onClick={() => setActionModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>
              {actionModal.action === 'approved' ? '✅ Approve' : '❌ Deny'} Seat Change
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {actionModal.action === 'approved'
                ? `Approve ${actionModal.name}'s seat change? The student will be moved to the new seat.`
                : `Deny ${actionModal.name}'s seat change request?`
              }
            </p>

            <div className="form-group">
              <label htmlFor="sc-feedback">Feedback to Student</label>
              <textarea
                id="sc-feedback"
                className="form-control"
                placeholder="Provide feedback (optional)..."
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setActionModal(null)}>Cancel</button>
              <button
                className={`btn ${actionModal.action === 'approved' ? 'btn-success' : 'btn-danger'}`}
                onClick={() => handleAction(actionModal.id, actionModal.action)}
                disabled={processing}
              >
                {processing ? 'Processing...' : (actionModal.action === 'approved' ? 'Approve' : 'Deny')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}