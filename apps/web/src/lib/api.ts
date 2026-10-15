"use client";

import { createApiClient } from "@moneymania/core";
import { useEffect, useState } from "react";

/** Same-origin API client; the session cookie rides along automatically. */
export const api = createApiClient({ baseUrl: "" });

/** Load data on mount and whenever `deps` change; `reload()` fetches again after a change. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const key = JSON.stringify(deps);

  useEffect(() => {
    let live = true;
    load()
      .then((d) => {
        if (live) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: Error) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
    // `load` is a fresh closure each render; `key` captures what it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);

  return { data, error, reload: () => setVersion((v) => v + 1) };
}
