"use client";

import { useState, useEffect, useCallback } from "react";
import type { AgentStats, MessagesResponse } from "./types";

const DEFAULT_AGENT = "testmaya";

function getAgentId(): string {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    return params.get("agent") || DEFAULT_AGENT;
  }
  return DEFAULT_AGENT;
}

export function useAgentStats(pollIntervalMs = 0) {
  const [data, setData] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const agentId = getAgentId();
      const res = await fetch(`/api/agent/${agentId}/stats`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    if (pollIntervalMs > 0) {
      const id = setInterval(fetchStats, pollIntervalMs);
      return () => clearInterval(id);
    }
  }, [fetchStats, pollIntervalMs]);

  return { data, loading, error, refetch: fetchStats };
}

export function useAgentMessages(opts: {
  page?: number;
  pageSize?: number;
  search?: string;
} = {}) {
  const [data, setData] = useState<MessagesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { page = 1, pageSize = 20, search = "" } = opts;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const agentId = getAgentId();
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (search) params.set("search", search);
        const res = await fetch(`/api/agent/${agentId}/messages?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [page, pageSize, search]);

  return { data, loading, error };
}
