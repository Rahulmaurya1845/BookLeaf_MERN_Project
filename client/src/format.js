export const inr = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);
export const date = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const dateTime = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const age = (h) => (h < 1 ? '<1h' : h < 48 ? `${h}h` : `${Math.floor(h / 24)}d`);

export const CATEGORIES = ['Royalty & Payments', 'ISBN & Metadata Issues', 'Printing & Quality', 'Distribution & Availability', 'Book Status & Production Updates', 'General Inquiry'];
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
export const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];
export const STAGES = ['Manuscript Received', 'Editing', 'Cover Design', 'Typesetting', 'Proofreading', 'ISBN Assignment', 'Printing', 'Distribution Setup', 'Published & Live'];
