import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const links = user.role === 'admin'
    ? [['/admin', 'Ticket queue']]
    : [['/books', 'My books'], ['/tickets', 'My tickets'], ['/tickets/new', 'New query']];
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">BookLeaf<span>{user.role === 'admin' ? ' Operations' : ' Author Support'}</span></div>
        <nav>
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/tickets' || to === '/admin'}>{label}</NavLink>
          ))}
        </nav>
        <div className="who">
          <span>{user.name}</span>
          <button className="btn ghost" onClick={() => { logout(); nav('/login'); }}>Log out</button>
        </div>
      </header>
      <main className="page"><Outlet /></main>
    </div>
  );
}
