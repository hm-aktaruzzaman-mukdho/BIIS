import { useState, useEffect, useCallback } from 'react';
import api from '../../api';

function CountdownTimer({ deadline }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    function update() {
      const now = new Date();
      const end = new Date(deadline);
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft('EXPIRED');
        setIsUrgent(true);
        return;
      }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${hrs}h ${mins}m ${secs}s`);
      setIsUrgent(hrs < 2);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <span style={{
      fontWeight: 700, fontSize: '0.95rem',
      color: isUrgent ? '#C62828' : '#E65100',
      background: isUrgent ? '#FFEBEE' : '#FFF3E0',
      padding: '2px 10px', border: `1px solid ${isUrgent ? '#EF9A9A' : '#FFCC80'}`
    }}>
      ⏱ {timeLeft}
    </span>
  );
}

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [seatChanges, setSeatChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('applications');
  const [payModal, setPayModal] = useState(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [processing, setProcessing] = useState(false);
  const [cancelModal, setCancelModal] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [appRes, scRes] = await Promise.all([
        api.get('/applications'),
        api.get('/seat-changes')
      ]);
      setApplications(appRes.data.applications);
      setSeatChanges(scRes.data.seatChanges);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handlePay(id) {
    if (!cardNumber || !cardExpiry || !cardCvc) {
      alert('Please fill all card details');
      return;
    }
    setProcessing(true);
    try {
      const res = await api.post(`/applications/${id}/pay`);
      alert(res.data.message || 'Payment successful! Seat assigned.');
      setPayModal(null);
      setCardNumber(''); setCardExpiry(''); setCardCvc('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancel(id) {
    setProcessing(true);
    try {
      const res = await api.post(`/applications/${id}/cancel`);
      alert(res.data.message || 'Application cancelled');
      setCancelModal(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Cancellation failed');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>My Applications</h1>
        <p>Track the status of your seat applications and change requests</p>
      </div>

      <div className="filters-bar">
        <button
          className={`btn ${tab === 'applications' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTab('applications')}
        >
          📝 Seat Applications ({applications.length})
        </button>
        <button
          className={`btn ${tab === 'changes' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTab('changes')}
        >
          🔄 Seat Changes ({seatChanges.length})
        </button>
      </div>

      {tab === 'applications' && (
        <>
          {applications.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📝</div>
              <h3>No applications yet</h3>
              <p>Apply for a seat to see your applications here</p>
            </div>
          ) : (
            applications.map(app => (
              <div key={app.id} className="application-card">
                <div className="application-header">
                  <div className="applicant-info">
                    <h3>{app.hall_name}</h3>
                    <p>
                      {app.room_number ? `Room ${app.room_number} (Floor ${app.floor})` : 'No room preference'}
                      {' · '}
                      {new Date(app.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {app.payment_status === 'pending' && app.payment_deadline && (
                      <CountdownTimer deadline={app.payment_deadline} />
                    )}
                    {app.payment_status === 'paid' && (
                      <span style={{ padding: '2px 10px', fontWeight: 700, fontSize: '0.8rem', background: '#E8F5E9', color: '#2E7D32', border: '1px solid #A5D6A7' }}>
                        💰 PAID
                      </span>
                    )}
                    {app.payment_status === 'pending' && (
                      <span style={{ padding: '2px 10px', fontWeight: 700, fontSize: '0.8rem', background: '#FFF3E0', color: '#E65100', border: '1px solid #FFCC80' }}>
                        💳 AWAITING PAYMENT
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
                    📎 <a href={app.document_url} target="_blank" rel="noopener noreferrer">View attached document</a>
                  </p>
                )}

                {/* Payment required banner */}
                {app.status === 'approved' && app.payment_status === 'pending' && (
                  <div style={{
                    margin: '12px 0', padding: '14px 18px',
                    background: 'linear-gradient(135deg, #FFF8E1, #FFF3E0)',
                    border: '2px solid #FFB74D', borderRadius: '6px'
                  }}>
                    <div style={{ fontWeight: 700, color: '#E65100', marginBottom: '6px', fontSize: '1rem' }}>
                      🎫 Seat Reserved — Payment Required
                    </div>
                    <p style={{ fontSize: '0.88rem', color: '#555', margin: '0 0 10px' }}>
                      Your seat has been reserved. Complete payment of <strong>৳500</strong> within the deadline to confirm your seat.
                      If payment is not completed, the reservation will expire and the seat will be released.
                    </p>
                    <button
                      className="btn btn-success"
                      onClick={() => setPayModal(app)}
                      style={{ fontWeight: 700 }}
                    >
                      💳 Pay ৳500 Now
                    </button>
                  </div>
                )}

                {/* {(app.ai_score || app.ai_recommendation) && (
                  <div className="ai-section">
                    <div className="ai-label">🤖 AI Priority Analysis</div>
                    {app.ai_score && (
                      <div style={{ margin: '6px 0 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem', color: app.ai_score >= 7 ? '#2E7D32' : app.ai_score >= 4 ? '#E65100' : '#C62828' }}>
                            Priority Score: {app.ai_score}/10
                          </span>
                          <span className={`badge badge-${app.ai_recommendation}`}>
                            {app.ai_recommendation?.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ height: '6px', background: '#eee', width: '100%', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${app.ai_score * 10}%`, borderRadius: '3px',
                            background: app.ai_score >= 7 ? '#4CAF50' : app.ai_score >= 4 ? '#FF9800' : '#F44336'
                          }}></div>
                        </div>
                      </div>
                    )}
                    {(() => {
                      let factors = app.ai_reasons;
                      if (typeof factors === 'string') {
                        try { factors = JSON.parse(factors); } catch { factors = []; }
                      }
                      if (Array.isArray(factors) && factors.length > 0) {
                        return (
                          <div style={{ fontSize: '0.82rem', marginTop: '6px' }}>
                            {factors.map((f, i) => (
                              <div key={i} style={{ display: 'flex', gap: '6px', padding: '3px 0', borderBottom: '1px solid #f0ebe0' }}>
                                <strong style={{ minWidth: '160px' }}>{f.factor}:</strong>
                                <span style={{ color: '#555' }}>{f.detail} {f.points !== undefined && <em style={{ color: '#8B0000' }}>({f.points} pts)</em>}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return app.ai_summary ? <p style={{ fontSize: '0.85rem', color: '#555', fontStyle: 'italic' }}>{app.ai_summary}</p> : null;
                    })()}
                  </div>
                )} */}

                {app.feedback && (
                  <div className="feedback-section">
                    <label>Provost Feedback</label>
                    <p>{app.feedback}</p>
                  </div>
                )}

              
              </div>
            ))
          )}
        </>
      )}

     


    
    </div>
  );
}