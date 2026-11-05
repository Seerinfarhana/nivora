import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api<T>(path)
      .then(d => { setData(d); setError(""); })
      .catch(e => setError(e instanceof Error ? e.message : "Could not load data."))
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load };
}
