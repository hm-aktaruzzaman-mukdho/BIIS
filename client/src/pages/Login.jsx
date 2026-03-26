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
            <div className="english">BUET Institutional Information System</div>
        </div>
      </header>

      <nav className="biis-nav">
        <a href="/">BIIS Home</a>
      </nav>

      <div className="auth-content">
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
              <div className="auth-buttons">
                <button type="submit" className="btn" disabled={loading}>
                  {loading ? 'Logging in...' : 'L o g i n'}
                </button>
                <button type="reset" className="btn" onClick={() => { setEmail(''); setPassword(''); }}>
                  R e s e t
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}