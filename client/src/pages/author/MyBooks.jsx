import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { usePolling } from '../../usePolling.js';
import { inr, date, STAGES } from '../../format.js';

function Stage({ status }) {
  const name = status.replace(/^In Production\s*-\s*/i, '');
  const idx = STAGES.findIndex((s) => s.toLowerCase() === name.toLowerCase());
  return (
    <div className="stage">
      <div className="stage-bar">{STAGES.map((s, i) => <i key={s} className={i <= idx ? 'on' : ''} title={s} />)}</div>
      <span className="small muted">Currently at <b>{name}</b>. Royalties start once the book is live.</span>
    </div>
  );
}

export default function MyBooks() {
  const { data, error, loading } = usePolling(() => api('/books'), 60000);
  if (loading) return <p className="muted">Loading your books…</p>;
  if (error) return <div className="alert error">{error}</div>;
  const books = data.books;
  if (!books.length) return <div className="empty"><h3>No books yet</h3><p>Once BookLeaf starts producing your book it will show up here.</p></div>;

  const sum = (k) => books.reduce((n, b) => n + (b[k] || 0), 0);
  return (
    <>
      <h2>My books</h2>
      <div className="tiles">
        <div className="tile"><div className="muted small">Total royalty earned</div><b>{inr(sum('totalRoyaltyEarned'))}</b></div>
        <div className="tile"><div className="muted small">Paid out</div><b>{inr(sum('royaltyPaid'))}</b></div>
        <div className="tile"><div className="muted small">Pending</div><b>{inr(sum('royaltyPending'))}</b></div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>ISBN</th><th>Genre</th><th>Published</th><th>Status</th><th className="num">MRP</th><th className="num">Copies sold</th><th className="num">Earned</th><th className="num">Paid</th><th className="num">Pending</th></tr></thead>
          <tbody>
            {books.map((b) => (
              <tr key={b.id}>
                <td><b>{b.title}</b><div className="small muted">{b.availableOn.join(' · ') || 'Not listed yet'}</div></td>
                <td className="small">{b.isbn}</td>
                <td>{b.genre}</td>
                <td>{date(b.publicationDate)}</td>
                <td>{b.inProduction ? <Stage status={b.status} /> : <span className="badge st-Resolved">{b.status}</span>}</td>
                <td className="num">{inr(b.mrp)}</td>
                <td className="num">{b.inProduction ? '—' : b.totalCopiesSold}</td>
                <td className="num">{b.inProduction ? '—' : inr(b.totalRoyaltyEarned)}</td>
                <td className="num">{b.inProduction ? '—' : inr(b.royaltyPaid)}</td>
                <td className="num">{b.inProduction ? '—' : <span className={b.royaltyPending > 0 ? 'warn' : ''}>{inr(b.royaltyPending)}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">Royalties are calculated quarterly and paid within 45 days of quarter end (minimum payout ₹1,000). Something look off? <Link to="/tickets/new">Raise a query</Link>.</p>
    </>
  );
}
