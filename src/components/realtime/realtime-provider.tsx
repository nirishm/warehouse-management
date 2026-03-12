"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

/**
 * A lightweight pub/sub for realtime invalidation.
 * Components register for table-level change notifications,
 * and the provider broadcasts when Supabase Realtime fires.
 */

type Listener = () => void;

interface RealtimeContextValue {
  /** Subscribe to changes for a table. Returns unsubscribe function. */
  subscribe: (table: string, listener: Listener) => () => void;
  /** Notify all subscribers of a table change */
  notify: (table: string) => void;
}

const RealtimeCtx = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const listenersRef = useRef<Map<string, Set<Listener>>>(new Map());

  const subscribe = useCallback((table: string, listener: Listener) => {
    if (!listenersRef.current.has(table)) {
      listenersRef.current.set(table, new Set());
    }
    listenersRef.current.get(table)!.add(listener);

    return () => {
      listenersRef.current.get(table)?.delete(listener);
    };
  }, []);

  const notify = useCallback((table: string) => {
    listenersRef.current.get(table)?.forEach((fn) => fn());
  }, []);

  return (
    <RealtimeCtx.Provider value={{ subscribe, notify }}>
      {children}
    </RealtimeCtx.Provider>
  );
}

export function useRealtimeContext(): RealtimeContextValue {
  const ctx = useContext(RealtimeCtx);
  if (!ctx) throw new Error("useRealtimeContext must be used within RealtimeProvider");
  return ctx;
}
