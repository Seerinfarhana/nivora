export default function Status({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <p className="py-16 text-center text-sm text-muted">Loading your data…</p>;
  return <div className="card p-6 text-center text-sm text-muted">{error || "Nothing to show yet."}</div>;
}
