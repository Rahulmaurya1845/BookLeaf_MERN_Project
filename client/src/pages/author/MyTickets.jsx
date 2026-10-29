import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../api.js';
import { usePolling } from '../../usePolling.js';
import { StatusBadge } from '../../components/Badges.jsx';
import { dateTime } from '../../format.js';

export default function MyTickets() {
  const { state } = useLocation();
  const { data, error, loading, updatedAt } = usePolling(() => api('/tickets'), 5000); // near-real-time
  const [open, setOpen] = useState(null);
  const seen = useRef(null); // reply counts the author has already looked at

  if (loading) return <p className="muted">Loading your tickets…</p>;
  const tickets = data?.tickets || [];
  if (seen.current === null) seen.current = Object.fromEntries(tickets.map((t) => [t.id, t.responses.length]));

  const toggle = (t) => {
    seen.current[t.id] = t.responses.length;
    setOpen(open === t.id ? null : t.id);
  };

  return (
    <>
      <div className="row between">
        <h2>My tickets</h2>
        <span className="small muted">Live · updated {updatedAt?.toLocaleTimeString()}</span>
      </div>
      {state?.created && <div className="alert ok">Your query was submitted. We'll reply here.</div>}
      {error && <div className="alert error">{error}</div>}
      {!tickets.length ? (
        <div className="empty"><h3>No tickets yet</h3><p>Have a question about royalties, your ISBN, printing or a listing?</p><Link className="btn primary" to="/tickets/new">Submit a query</Link></div>
      ) : tickets.map((t) => {
        const isOpen = open === t.id;
        const unread = !isOpen && t.responses.length > (seen.current[t.id] ?? 0);
        return (
          <div key={t.id} className="card ticket">
            <button className="ticket-head" onClick={() => toggle(t)}>
              <div>
                <b>{t.subject}</b> {unread && <span className="badge new">New reply</span>}
                <div className="small muted">{t.ticketNumber} · {t.book ? t.book.title : 'General / Account level'} · {dateTime(t.createdAt)}</div>
              </div>
              <StatusBadge value={t.status} />
            </button>
            {isOpen && (
              <div className="thread">
                <div className="msg author"><div className="small muted">You · {dateTime(t.createdAt)}</div><p>{t.description}</p>{t.attachmentName && <div className="small muted">📎 {t.attachmentName}</div>}</div>
                {t.responses.length === 0 && <p className="muted small">No reply yet. Our team will respond within 48 hours.</p>}
                {t.responses.map((r) => (
                  <div key={r.id} className="msg team"><div className="small muted">{r.authorName || 'BookLeaf Team'} · {dateTime(r.createdAt)}</div><p>{r.message}</p></div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
