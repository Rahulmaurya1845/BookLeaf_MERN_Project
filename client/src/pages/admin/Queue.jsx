import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { usePolling } from '../../usePolling.js';
import { PriorityBadge, StatusBadge, SourceTag } from '../../components/Badges.jsx';
import { age, CATEGORIES, PRIORITIES, STATUSES } from '../../format.js';

const EMPTY = { status: '', category: '', priority: '', assigned: '', from: '', to: '', q: '', sort: 'urgency' };

export default function Queue() {
  const nav = useNavigate();
  const [f, setF] = useState(EMPTY);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const list = usePolling(() => api('/admin/tickets', { params: { ...f, limit: 100 } }), 10000, [JSON.stringify(f)]);
  const stats = usePolling(() => api('/admin/stats'), 10000);
  const s = stats.data?.stats;
  const tickets = list.data?.tickets || [];

  return (
    <>
      <h2>Ticket queue</h2>
      <div className="tiles">
        <div className="tile"><div className="muted small">Open</div><b>{s?.open ?? '–'}</b></div>
        <div className="tile"><div className="muted small">In progress</div><b>{s?.inProgress ?? '–'}</b></div>
        <div className="tile"><div className="muted small">Critical + High (active)</div><b>{s ? s.critical + s.high : '–'}</b></div>
        <div className={`tile ${s?.overdue ? 'tile-alert' : ''}`}><div className="muted small">Past response target</div><b>{s?.overdue ?? '–'}</b></div>
      </div>

      <div className="card filters">
        <input placeholder="Search subject or BL-number" value={f.q} onChange={set('q')} />
        <select value={f.status} onChange={set('status')}><option value="">All statuses</option>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
        <select value={f.category} onChange={set('category')}><option value="">All categories</option>{CATEGORIES.map((x) => <option key={x}>{x}</option>)}</select>
        <select value={f.priority} onChange={set('priority')}><option value="">All priorities</option>{PRIORITIES.map((x) => <option key={x}>{x}</option>)}</select>
        <select value={f.assigned} onChange={set('assigned')}><option value="">Anyone</option><option value="me">Assigned to me</option><option value="unassigned">Unassigned</option></select>
        <label className="inline small">From <input type="date" value={f.from} onChange={set('from')} /></label>
        <label className="inline small">To <input type="date" value={f.to} onChange={set('to')} /></label>
        <select value={f.sort} onChange={set('sort')}><option value="urgency">Most urgent first</option><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select>
        <button className="btn ghost" onClick={() => setF(EMPTY)}>Clear</button>
      </div>

      {list.error && <div className="alert error">{list.error}</div>}
      {list.loading && !list.data ? <p className="muted">Loading…</p> : !tickets.length ? (
        <div className="empty"><h3>No tickets match</h3><p>Try clearing a filter.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="clickable">
            <thead><tr><th>Priority</th><th>Ticket</th><th>Author</th><th>Category</th><th>Status</th><th>Age</th><th>Assignee</th></tr></thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className={t.overdue ? 'overdue' : ''} onClick={() => nav(`/admin/tickets/${t.id}`)}>
                  <td><PriorityBadge value={t.priority} /> <SourceTag source={t.prioritySource} /></td>
                  <td><b>{t.subject}</b><div className="small muted">{t.ticketNumber}{t.book ? ` · ${t.book.title}` : ''}</div></td>
                  <td>{t.author?.name}</td>
                  <td>{t.category} <SourceTag source={t.categorySource} /></td>
                  <td><StatusBadge value={t.status} /></td>
                  <td className={t.overdue ? 'warn' : ''}>{age(t.ageHours)}{t.overdue ? ' · overdue' : ''}</td>
                  <td>{t.assignedTo?.name || <span className="muted">Unassigned</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
