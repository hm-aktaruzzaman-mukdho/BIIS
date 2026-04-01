import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <header className="biis-header">
        <div className="header-main">
            <div className="header-logo">🏛️</div>  {/*needs fixing*/}
            <div className="header-text">
            <div className="bangla">বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়</div>
            <div className="english">BUET Institutional Information System</div>
            </div>
        </div>
      </header>

      <nav className="biis-nav">
        <a href="/">BIIS Home</a>
      </nav>

      <div className="auth-content">
        <div className="auth-sidebar">
          <a href="#" className="sidebar-webmail" style={{ marginTop: 0 }}>
            📧 BUET WebMail
          </a>
        </div>
        <div className="auth-main">
          <div className="auth-card">
            <div className="auth-title">BIIS Login</div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="auth-card form-row">
                <label htmlFor="email">UserID :</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="auth-card form-row">
                <label htmlFor="password">Password :</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="auth-hint">
                If your password contains capital letters and digits,<br/>
                they must be typed the same way every time you log in.
              </div>
              <div className="auth-buttons">
                <button type="submit" className="btn" disabled={loading}>
                  {loading ? 'Logging in...' : 'L o g i n'}
                </button>
                <button type="reset" className="btn" onClick={() => { setEmail(''); setPassword(''); }}>
                  R e s e t
                </button>
              </div>
            </form>
            <div className="auth-footer">
              <Link to="/register">(New) Create Account? Click Here.</Link>
            </div>

            <div className="auth-support">
              For any technical issue, please email to support@iict.buet.ac.bd
            </div>

            <div style={{ marginTop: '16px', padding: '10px', background: '#f9f6f0', border: '1px solid #ddd', fontSize: '0.78rem', color: '#666' }}>
              <strong style={{ color: '#333' }}>Demo accounts:</strong><br/>
              Provost: <br/>
              Student: 
            </div>
          </div>
        </div>
      </div>
      <footer className="biis-footer">
        Bangladesh University of Engineering & Technology (BUET), Dhaka-1000, Bangladesh. Tel: (880 2) 9665650 Fax: (880 2) 8613046. © All rights reserved, BUET
      </footer>
    </div>
  );
}