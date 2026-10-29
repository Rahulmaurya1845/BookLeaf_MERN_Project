import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { usePolling } from '../../usePolling.js';
import { PriorityBadge, StatusBadge, SourceTag } from '../../components/Badges.jsx';
import { dateTime, inr, date, CATEGORIES, PRIORITIES, STATUSES } from '../../format.js';

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, error, refresh } = usePolling(() => api(`/admin/tickets/${id}`), 8000, [id]);
  const t = data?.ticket;

  const [draft, setDraft] = useState('');
  const [meta, setMeta] = useState(null);       // { source, generatedAt }
  const [dirty, setDirty] = useState(false);    // admin edited the draft
  const [drafting, setDrafting] = useState(false);
  const [sendStatus, setSendStatus] = useState('In Progress');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const requested = useRef(false);

  const loadDraft = async (regenerate = false) => {
    setDrafting(true);
    try {
      const r = await api(`/admin/tickets/${id}/draft`, { method: 'POST', body: { regenerate } });
      setDraft(r.draft.text); setMeta(r.draft); setDirty(false);
    } catch (e) { setMsg({ type: 'error', text: `Could not load a draft: ${e.message}. You can write a reply manually.` }); }
    finally { setDrafting(false); }
  };

  useEffect(() => { requested.current = false; setDraft(''); setMeta(null); setDirty(false); }, [id]);
  useEffect(() => {
    if (!t || requested.current) return;
    requested.current = true;
    if (t.aiDraft?.text) { setDraft(t.aiDraft.text); setMeta(t.aiDraft); }
    else if (t.status !== 'Closed') loadDraft(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 4000); };
  const patch = async (body) => {
    try {
      await api(`/admin/tickets/${id}`, { method: 'PATCH', body });
      await refresh();
      if (body.category && !dirty) loadDraft(true); // draft was written for the old category
    } catch (e) { flash('error', e.message); }
  };
  const send = async () => {
    try {
      await api(`/admin/tickets/${id}/respond`, { method: 'POST', body: { message: draft, status: sendStatus, fromDraft: !!meta } });
      setDraft(''); setMeta(null); setDirty(false);
      await refresh();
      flash('ok', 'Response sent. The author can see it now.');
    } catch (e) { flash('error', e.message); }
  };
  const addNote = async () => {
    if (!note.trim()) return;
    try { await api(`/admin/tickets/${id}/notes`, { method: 'POST', body: { text: note } }); setNote(''); refresh(); }
    catch (e) { flash('error', e.message); }
  };

  if (error && !t) return <div className="alert error">{error}</div>;
  if (!t) return <p className="muted">Loading ticket…</p>;
  const b = t.bookDetails;

  return (
    <>
      <Link to="/admin" className="small">← Back to queue</Link>
      <div className="row between wrap">
        <h2>{t.subject}</h2>
        <div className="row"><PriorityBadge value={t.priority} /><StatusBadge value={t.status} /></div>
      </div>
      <p className="muted small">{t.ticketNumber} · {t.author?.name} ({t.author?.email}) · {dateTime(t.createdAt)}{t.overdue ? ' · past response target' : ''}</p>
      {msg.text && <div className={`alert ${msg.type}`}>{msg.text}</div>}

      <div className="split">
        <div>
          <div className="card">
            <h4>Conversation</h4>
            <div className="msg author"><div className="small muted">{t.author?.name} · {dateTime(t.createdAt)}</div><p>{t.description}</p>{t.attachmentName && <div className="small muted">📎 {t.attachmentName}</div>}</div>
            {t.responses.map((r) => (
              <div key={r.id} className="msg team"><div className="small muted">{r.authorName} · {dateTime(r.createdAt)}{r.aiAssisted ? ' · AI-assisted draft' : ''}</div><p>{r.message}</p></div>
            ))}
          </div>

          <div className="card">
            <div className="row between wrap">
              <h4>Reply to author</h4>
              <div className="row">
                {meta && <span className={`src ${meta.source === 'ai' ? 'src-ai' : 'src-rules'}`}>{meta.source === 'ai' ? 'AI draft' : 'Template draft (AI offline)'}</span>}
                <button className="btn ghost" disabled={drafting} onClick={() => loadDraft(true)}>{drafting ? 'Drafting…' : 'Regenerate draft'}</button>
              </div>
            </div>
            <textarea rows={12} value={drafting ? '' : draft} placeholder={drafting ? 'Drafting a reply from the knowledge base…' : 'Write your reply…'} onChange={(e) => { setDraft(e.target.value); setDirty(true); }} />
            <div className="row between wrap">
              <label className="inline small">After sending, set status to
                <select value={sendStatus} onChange={(e) => setSendStatus(e.target.value)}>{STATUSES.filter((s) => s !== 'Open').map((s) => <option key={s}>{s}</option>)}</select>
              </label>
              <button className="btn primary" disabled={drafting || draft.trim().length < 5} onClick={send}>Send to author</button>
            </div>
            <p className="small muted">Review before sending: AI drafts use the BookLeaf knowledge base and this author's account data.</p>
          </div>
        </div>

        <aside>
          <div className="card stack">
            <h4>Manage</h4>
            <label>Status<select value={t.status} onChange={(e) => patch({ status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label>Category <SourceTag source={t.categorySource} /><select value={t.category} onChange={(e) => patch({ category: e.target.value })}>{CATEGORIES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label>Priority <SourceTag source={t.prioritySource} /><select value={t.priority} onChange={(e) => patch({ priority: e.target.value })}>{PRIORITIES.map((s) => <option key={s}>{s}</option>)}</select></label>
            {t.aiReasoning && <p className="small muted">Why: {t.aiReasoning}</p>}
            <div className="small">Assigned to: <b>{t.assignedTo?.name || 'Nobody'}</b></div>
            {t.assignedTo?.id === user.id
              ? <button className="btn ghost" onClick={() => patch({ assignedTo: null })}>Unassign me</button>
              : <button className="btn" onClick={() => patch({ assignedTo: 'me' })}>Assign to me</button>}
          </div>

          {b && (
            <div className="card">
              <h4>Book on this ticket</h4>
              <p><b>{b.title}</b><br /><span className="small muted">{b.status}</span></p>
              <dl className="facts">
                <dt>ISBN</dt><dd>{b.isbn}</dd>
                <dt>Published</dt><dd>{date(b.publicationDate)}</dd>
                <dt>Copies sold</dt><dd>{b.totalCopiesSold}</dd>
                <dt>Earned / paid</dt><dd>{inr(b.totalRoyaltyEarned)} / {inr(b.royaltyPaid)}</dd>
                <dt>Pending</dt><dd>{inr(b.royaltyPending)}</dd>
                <dt>Last payout</dt><dd>{date(b.lastRoyaltyPayoutDate)}</dd>
                <dt>Listed on</dt><dd>{b.availableOn.join(', ') || '—'}</dd>
              </dl>
            </div>
          )}

          <div className="card">
            <h4>Internal notes <span className="small muted">(hidden from author)</span></h4>
            {t.internalNotes.length === 0 && <p className="small muted">No notes yet.</p>}
            {t.internalNotes.map((n) => <div key={n.id} className="note"><div className="small muted">{n.adminName} · {dateTime(n.createdAt)}</div>{n.text}</div>)}
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the team" />
            <button className="btn" onClick={addNote}>Add note</button>
          </div>
        </aside>
      </div>
    </>
  );
}
