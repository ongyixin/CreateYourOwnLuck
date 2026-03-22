"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { SocialConnectionRecord } from "@/lib/types";

interface SocialConnectionsContextValue {
  connections: SocialConnectionRecord[];
  loading: boolean;
  refetch: () => void;
}

const SocialConnectionsContext = createContext<SocialConnectionsContextValue>({
  connections: [],
  loading: true,
  refetch: () => {},
});

export function SocialConnectionsProvider({ children }: { children: React.ReactNode }) {
  const [connections, setConnections] = useState<SocialConnectionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/social/connections");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections ?? []);
      }
    } catch {
      // silently fail — user just won't see publish buttons
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  return (
    <SocialConnectionsContext.Provider
      value={{ connections, loading, refetch: fetchConnections }}
    >
      {children}
    </SocialConnectionsContext.Provider>
  );
}

export function useSocialConnections() {
  return useContext(SocialConnectionsContext);
}
