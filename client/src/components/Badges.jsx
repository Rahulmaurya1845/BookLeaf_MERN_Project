export const PriorityBadge = ({ value }) => <span className={`badge pri-${value}`}>{value}</span>;
export const StatusBadge = ({ value }) => <span className={`badge st-${value.replace(' ', '')}`}>{value}</span>;
// Shows who decided: AI, keyword rules (AI offline) or an admin override.
export const SourceTag = ({ source }) => {
  const map = { ai: ['AI', 'src-ai'], rules: ['Auto (rules)', 'src-rules'], admin: ['Edited by admin', 'src-admin'] };
  const m = map[source];
  return m ? <span className={`src ${m[1]}`}>{m[0]}</span> : null;
};
