import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { usePolling } from '../../usePolling.js';

export default function NewTicket() {
  const nav = useNavigate();
  const { data } = usePolling(() => api('/books'), 120000);
  const [form, setForm] = useState({ bookId: 'general', subject: '', description: '' });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors([]);
    try {
      await api('/tickets', { method: 'POST', body: { ...form, attachmentName: file?.name } });
      nav('/tickets', { state: { created: true } });
    } catch (err) {
      setErrors(err.details?.map((d) => d.message) || [err.message]);
    } finally { setBusy(false); }
  };

  return (
    <div className="narrow">
      <h2>Submit a support query</h2>
      <p className="muted">Tell us what's going on. Our team replies here, usually within 48 hours.</p>
      <form className="card stack" onSubmit={submit}>
        <label>Which book is this about?
          <select value={form.bookId} onChange={set('bookId')}>
            <option value="general">General / Account level</option>
            {data?.books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
        </label>
        <label>Subject<input value={form.subject} onChange={set('subject')} maxLength={150} placeholder="e.g. Royalty for Q2 not received" required /></label>
        <label>Details<textarea rows={7} value={form.description} onChange={set('description')} placeholder="Include dates, platforms or anything else that helps us look into it." required /></label>
        <label>Attachment (optional)
          <input type="file" onChange={(e) => setFile(e.target.files[0] || null)} />
          <span className="small muted">Screenshots or photos help for print or listing issues. (Preview only: the file name is saved, the file itself isn't uploaded yet.)</span>
        </label>
        {errors.length > 0 && <div className="alert error">{errors.map((m) => <div key={m}>{m}</div>)}</div>}
        <div className="row"><button className="btn primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit query'}</button></div>
      </form>
    </div>
  );
}
