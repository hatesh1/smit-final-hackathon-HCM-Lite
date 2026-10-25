const STYLES = {
  present: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  late: 'bg-amber-100 text-amber-800 border border-amber-200',
  absent: 'bg-rose-100 text-rose-800 border border-rose-200',
  'half-day': 'bg-orange-100 text-orange-800 border border-orange-200',
  leave: 'bg-sky-100 text-sky-800 border border-sky-200',
  missing_checkout: 'bg-purple-100 text-purple-800 border border-purple-200',
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  approved: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  rejected: 'bg-rose-100 text-rose-800 border border-rose-200',
  cancelled: 'bg-slate-100 text-slate-600 border border-slate-200',
  draft: 'bg-slate-100 text-slate-700 border border-slate-300',
  finalized: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  active: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  probation: 'bg-blue-100 text-blue-800 border border-blue-200',
};

export default function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase().replace(/_/g, '-');
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
        STYLES[normalized] || STYLES[status] || 'bg-slate-100 text-slate-700 border border-slate-200'
      }`}
    >
      {status ? status.replace(/_/g, ' ') : 'N/A'}
    </span>
  );
}
