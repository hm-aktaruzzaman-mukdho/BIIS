import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'student',
    student_id: '', department: '', year: '', hall_id: ''
  });
  const [halls, setHalls] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadHalls();
  }, []);

  async function loadHalls() {
    try {
      const res = await api.get('/seats/halls');
      setHalls(res.data.halls);
    } catch (err) { /* halls list may fail before login, ignore */ }
  }

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        ...form,
        year: form.year ? parseInt(form.year) : null,
        hall_id: form.hall_id ? parseInt(form.hall_id) : null
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* Header */}
      <header className="biis-header">
        <div className="header-main">
          <div className="header-logo">🏛️</div>
          <div className="header-text">
            <div className="bangla">বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়</div>
            <div className="english">BUET Institutional Information System</div>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="biis-nav">
        <a href="/">BIIS Home</a>
      </nav>

      {/* Content */}
      <div className="auth-content">
        <div className="auth-sidebar">
          <a href="#" className="sidebar-webmail" style={{ marginTop: 0 }}>
            📧 BUET WebMail
          </a>
        </div>
        <div className="auth-main">
          <div className="auth-card" style={{ maxWidth: '480px' }}>
            <div className="auth-title">BIIS Registration</div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="role-selector">
                <button type="button" className={`role-btn ${form.role === 'student' ? 'active' : ''}`}
                  onClick={() => updateField('role', 'student')}>🎓 Student</button>
                <button type="button" className={`role-btn ${form.role === 'provost' ? 'active' : ''}`}
                  onClick={() => updateField('role', 'provost')}>🏛️ Provost</button>
              </div>

              <div className="auth-card form-row">
                <label htmlFor="name">Full Name :</label>
                <input id="name" type="text" value={form.name}
                  onChange={e => updateField('name', e.target.value)} required />
              </div>

              <div className="auth-card form-row">
                <label htmlFor="reg-email">Email :</label>
                <input id="reg-email" type="email" value={form.email}
                  onChange={e => updateField('email', e.target.value)} required />
              </div>

              <div className="auth-card form-row">
                <label htmlFor="reg-password">Password :</label>
                <input id="reg-password" type="password" value={form.password}
                  onChange={e => updateField('password', e.target.value)} required minLength={6} />
              </div>

              {form.role === 'student' && (
                <>
                  <div className="auth-card form-row">
                    <label htmlFor="student-id">Student No :</label>
                    <input id="student-id" type="text" value={form.student_id}
                      onChange={e => updateField('student_id', e.target.value)} placeholder="e.g. 2105067" />
                  </div>

                  <div className="auth-card form-row">
                    <label htmlFor="department">Department :</label>
                    <select id="department" value={form.department} onChange={e => updateField('department', e.target.value)}>
                      <option value="">Select</option>
                      <option value="CSE">CSE</option>
                      <option value="EEE">EEE</option>
                      <option value="ME">ME</option>
                      <option value="IPE">IPE</option>
                      <option value="BME">BME</option>
                      <option value="CE">CE</option>
                      <option value="NCE">NCE</option>
                    </select>
                  </div>

                  <div className="auth-card form-row">
                    <label htmlFor="year">Level :</label>
                    <select id="year" value={form.year} onChange={e => updateField('year', e.target.value)}>
                      <option value="">Select</option>
                      <option value="1">Level 1</option>
                      <option value="2">Level 2</option>
                      <option value="3">Level 3</option>
                      <option value="4">Level 4</option>
                      <option value="5">Level 5</option>
                    </select>
                  </div>

                  <div className="auth-card form-row">
                    <label htmlFor="hall">Hall :</label>
                    <select id="hall" value={form.hall_id} onChange={e => updateField('hall_id', e.target.value)} required>
                      <option value="">Select Hall</option>
                      {halls.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="auth-buttons">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Register'}
                </button>
                <button type="reset" className="btn" onClick={() => setForm({
                  name: '', email: '', password: '', role: 'student',
                  student_id: '', department: '', year: '', hall_id: ''
                })}>
                  Reset
                </button>
              </div>
            </form>

            <div className="auth-footer">
              Already have an account? <Link to="/login">Sign In Here.</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="biis-footer">
        Bangladesh University of Engineering & Technology (BUET), Dhaka-1000, Bangladesh. Tel: (880 2) 9665650 Fax: (880 2) 8613046. © All rights reserved, BUET
      </footer>
    </div>
  );
}
