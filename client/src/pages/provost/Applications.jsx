import { useEffect, useState } from 'react';
import api from '../../api';

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadApplications();
  }, [filter]);

  async function loadApplications() {
    setLoading(true);
    try {
      const params = filter ? { status: filter } : {};
      const res = await api.get('/applications', { params });
      setApplications(res.data.applications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id, status) {
    setProcessing(true);
    try {
      await api.patch(`/applications/${id}`, { status, feedback });
      setActionModal(null);
      setFeedback('');
      loadApplications();
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    } finally {
      setProcessing(false);
    }
  }

  const pending = applications.filter(a => a.status === 'pending').length;
  const approved = applications.filter(a => a.status === 'approved').length;
  const denied = applications.filter(a => a.status === 'denied').length;

  return (
    <div>
      <div className="page-header">
        <h1>Seat Applications</h1>
        <p>Review and manage seat allocation requests with AI-powered insights</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon yellow">⏳</div>
          <div className="stat-info">
            <h3>{pending}</h3>
            <p>Pending Review</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-info">
            <h3>{approved}</h3>
            <p>Approved</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">❌</div>
          <div className="stat-info">
            <h3>{denied}</h3>
            <p>Denied</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">📊</div>
          <div className="stat-info">
            <h3>{applications.length}</h3>
            <p>Total Applications</p>
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

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : applications.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📨</div>
          <h3>No applications found</h3>
          <p>There are no applications matching your filter</p>
        </div>
      ) : (
        applications.map(app => (
          <div key={app.id} className="application-card">
            <div className="application-header">
              <div className="applicant-info">
                <h3>{app.student_name}</h3>
                <p>
                  {app.student_roll} · {app.department} · Year {app.year}
                  {' · '}
                  {app.room_number ? `Room ${app.room_number} (Floor ${app.floor})` : 'No room preference'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {app.ai_score && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '3px 10px', fontWeight: 700, fontSize: '0.85rem',
                    background: app.ai_score >= 7 ? '#E8F5E9' : app.ai_score >= 4 ? '#FFF3E0' : '#FFEBEE',
                    color: app.ai_score >= 7 ? '#2E7D32' : app.ai_score >= 4 ? '#E65100' : '#C62828',
                    border: `1px solid ${app.ai_score >= 7 ? '#A5D6A7' : app.ai_score >= 4 ? '#FFCC80' : '#EF9A9A'}`
                  }}>
                    ⭐ {app.ai_score}/10
                  </span>
                )}
                {app.ai_recommendation && (
                  <span className={`badge badge-${app.ai_recommendation}`}>
                    {app.ai_recommendation.toUpperCase()}
                  </span>
                )}
                {app.payment_status === 'pending' && (
                  <span style={{ padding: '2px 8px', fontWeight: 700, fontSize: '0.75rem', background: '#FFF3E0', color: '#E65100', border: '1px solid #FFCC80' }}>
                    💳 AWAITING PAYMENT
                  </span>
                )}
                {app.payment_status === 'paid' && (
                  <span style={{ padding: '2px 8px', fontWeight: 700, fontSize: '0.75rem', background: '#E8F5E9', color: '#2E7D32', border: '1px solid #A5D6A7' }}>
                    💰 PAID
                  </span>
                )}
                {app.payment_status === 'expired' && (
                  <span style={{ padding: '2px 8px', fontWeight: 700, fontSize: '0.75rem', background: '#FFEBEE', color: '#C62828', border: '1px solid #EF9A9A' }}>
                    ⏰ PAYMENT EXPIRED
                  </span>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {actionModal && (
        <div className="modal-overlay" onClick={() => setActionModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>
              {actionModal.action === 'approved' ? '✅ Approve' : '❌ Deny'} Application
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {actionModal.action === 'approved'
                ? `Approve ${actionModal.name}'s seat application? A seat will be automatically assigned.`
                : `Deny ${actionModal.name}'s seat application?`
              }
            </p>

            <div className="form-group">
              <label htmlFor="feedback-input">Feedback to Student</label>
              <textarea
                id="feedback-input"
                className="form-control"
                placeholder="Provide feedback to the student (optional but recommended)..."
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setActionModal(null)}>
                Cancel
              </button>
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