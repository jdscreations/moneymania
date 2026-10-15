import { createApiClient } from "@moneymania/core";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { API_URL, authClient } from "./auth-client";

/** The shared API client, sending the stored session cookie with each request. */
export const api = createApiClient({
  baseUrl: API_URL,
  headers: async () => ({ cookie: await authClient.getCookie() }),
});

/** Load data when `deps` change and whenever the screen comes back into focus. */
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

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useFocusEffect(reload);

  return { data, error, reload };
}
