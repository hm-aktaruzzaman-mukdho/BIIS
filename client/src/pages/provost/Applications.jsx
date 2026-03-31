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
        applications.map()
      )}
    </div>
  );
}