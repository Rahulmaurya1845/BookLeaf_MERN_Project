import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import MyBooks from './pages/author/MyBooks.jsx';
import NewTicket from './pages/author/NewTicket.jsx';
import MyTickets from './pages/author/MyTickets.jsx';
import Queue from './pages/admin/Queue.jsx';
import TicketDetail from './pages/admin/TicketDetail.jsx';

function Protected({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/books'} replace />;
  return children;
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center muted">Loading…</div>;
  return <Navigate to={!user ? '/login' : user.role === 'admin' ? '/admin' : '/books'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route element={<Protected role="author"><Layout /></Protected>}>
        <Route path="/books" element={<MyBooks />} />
        <Route path="/tickets" element={<MyTickets />} />
        <Route path="/tickets/new" element={<NewTicket />} />
      </Route>
      <Route element={<Protected role="admin"><Layout /></Protected>}>
        <Route path="/admin" element={<Queue />} />
        <Route path="/admin/tickets/:id" element={<TicketDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
