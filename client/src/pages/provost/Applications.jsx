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
                <span className={`badge badge-${app.status}`}>
                  {app.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="reason-text">{app.reason}</div>

            {app.document_url && (
              <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                📎 <a href={app.document_url} target="_blank" rel="noopener noreferrer">View document</a>
              </p>
            )}

            {/* AI Score & Factor Breakdown */}
            {(app.ai_score || app.ai_summary) && (
              <div className="ai-section" style={{ marginTop: '12px' }}>
                <div className="ai-label">🤖 AI Priority Analysis</div>

                {app.ai_score && (
                  <div style={{ margin: '8px 0 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: app.ai_score >= 7 ? '#2E7D32' : app.ai_score >= 4 ? '#E65100' : '#C62828' }}>
                        Priority: {app.ai_score}/10
                      </span>
                    </div>
                    {/* Score bar */}
                    <div style={{ height: '8px', background: '#eee', width: '100%', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${app.ai_score * 10}%`, borderRadius: '4px',
                        background: app.ai_score >= 7 ? '#4CAF50' : app.ai_score >= 4 ? '#FF9800' : '#F44336',
                        transition: 'width 0.3s'
                      }}></div>
                    </div>
                  </div>
                )}

                {/* Factor breakdown */}
                {(() => {
                  let factors = app.ai_reasons;
                  if (typeof factors === 'string') {
                    try { factors = JSON.parse(factors); } catch { factors = []; }
                  }
                  if (Array.isArray(factors) && factors.length > 0) {
                    return (
                      <div style={{ marginTop: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                          <thead>
                            <tr style={{ background: '#f5f0e5' }}>
                              <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #ddd', fontWeight: 700 }}>Factor</th>
                              <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #ddd', fontWeight: 700 }}>Assessment</th>
                              <th style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid #ddd', fontWeight: 700, width: '70px' }}>Impact</th>
                            </tr>
                          </thead>
                          <tbody>
                            {factors.map((f, i) => (
                              <tr key={i}>
                                <td style={{ padding: '6px 10px', borderBottom: '1px solid #eee', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                  {f.factor}
                                </td>
                                <td style={{ padding: '6px 10px', borderBottom: '1px solid #eee', color: '#555' }}>
                                  {f.detail}
                                  {f.points !== undefined && <span style={{ marginLeft: '6px', fontWeight: 700, color: '#8B0000' }}>({f.points} pts)</span>}
                                </td>
                                <td style={{ padding: '6px 10px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '1px 8px', fontSize: '0.72rem', fontWeight: 700,
                                    background: f.impact === 'high' ? '#FFEBEE' : f.impact === 'medium' ? '#FFF8E1' : '#F5F5F5',
                                    color: f.impact === 'high' ? '#C62828' : f.impact === 'medium' ? '#E65100' : '#777',
                                    border: `1px solid ${f.impact === 'high' ? '#EF9A9A' : f.impact === 'medium' ? '#FFE082' : '#ddd'}`
                                  }}>
                                    {(f.impact || 'low').toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }
                  return null;
                })()}

                {app.ai_summary && (
                  <p style={{ marginTop: '8px', fontSize: '0.85rem', color: '#555', fontStyle: 'italic' }}>{app.ai_summary}</p>
                )}
              </div>
            )}

            {app.feedback && (
              <div className="feedback-section">
                <label>Your Feedback</label>
                <p>{app.feedback}</p>
              </div>
            )}

            {app.status === 'pending' && (
              <div className="btn-group" style={{ marginTop: '16px' }}>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => { setActionModal({ id: app.id, action: 'approved', name: app.student_name }); setFeedback(''); }}
                >
                  ✅ Approve
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => { setActionModal({ id: app.id, action: 'denied', name: app.student_name }); setFeedback(''); }}
                >
                  ❌ Deny
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}