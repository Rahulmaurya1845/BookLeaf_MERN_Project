import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const DEMOS = [
  ['Admin', 'admin@bookleaf.com', 'Admin@123'],
  ['Author · Ananya (no royalty yet)', 'ananya.reddy@email.com', 'Author@123'],
  ['Author · Sneha (book in production)', 'sneha.kulkarni@email.com', 'Author@123'],
  ['Author · Priya', 'priya.sharma@email.com', 'Author@123'],
];

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/books'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const u = await login(email, password);
      nav(u.role === 'admin' ? '/admin' : '/books');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1 className="display">BookLeaf</h1>
        <p className="muted">Sign in to track your books, royalties and support requests.</p>
        <form onSubmit={submit} className="stack">
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {error && <div className="alert error">{error}</div>}
          <button className="btn primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <div className="demo">
          <div className="muted small">Demo accounts (click to fill)</div>
          {DEMOS.map(([label, e, p]) => (
            <button key={e} type="button" className="chip" onClick={() => { setEmail(e); setPassword(p); }}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
