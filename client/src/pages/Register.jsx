import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'student',
    student_id: '', department: '', year: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

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
        year: form.year ? parseInt(form.year) : null
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
      <header className="biis-header">
        <div className="header-main">
          <div className="header-text">
            <div className="english">BUET Institutional Information System</div>
          </div>
        </div>
      </header>

      <nav className="biis-nav">
        <a href="/">BIIS Home</a>
      </nav>

      <div className="auth-content">
        <div className="auth-main">
          <div className="auth-card" style={{ maxWidth: '480px' }}>
            <div className="auth-title">BIIS Registration</div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="role-selector">
                <button type="button" className={`role-btn ${form.role === 'student' ? 'active' : ''}`}
                  onClick={() => updateField('role', 'student')}>Student</button>
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
                  student_id: '', department: '', year: ''
                })}>
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}