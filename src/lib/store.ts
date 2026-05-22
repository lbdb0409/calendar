"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppState, Entry, Settings, UniBlock } from "./types";
import { getSupabase } from "./supabase";

const STORAGE_KEY = "hours-for-dad:v1";

function defaultSettings(): Settings {
  return {
    hourlyRate: 40,
    weeklyTarget: 25,
    shareToken: crypto.randomUUID().replace(/-/g, "").slice(0, 24),
  };
}

function emptyState(): AppState {
  return { settings: defaultSettings(), entries: [], uniBlocks: [] };
}

function readLocal(): AppState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      settings: { ...defaultSettings(), ...(parsed.settings ?? {}) },
      entries: parsed.entries ?? [],
      uniBlocks: parsed.uniBlocks ?? [],
    };
  } catch {
    return emptyState();
  }
}

function writeLocal(state: AppState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------- cloud (Supabase) ----------

async function cloudLoad(): Promise<AppState | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const [settingsRes, entriesRes, uniRes] = await Promise.all([
    sb.from("settings").select("*").eq("id", 1).single(),
    sb.from("entries").select("*").order("date", { ascending: false }),
    sb.from("uni_blocks").select("*"),
  ]);

  if (settingsRes.error || entriesRes.error || uniRes.error) {
    console.warn("Supabase load failed; using local data", {
      settings: settingsRes.error,
      entries: entriesRes.error,
      uni: uniRes.error,
    });
    return null;
  }

  const s = settingsRes.data;
  return {
    settings: {
      hourlyRate: Number(s.hourly_rate),
      weeklyTarget: Number(s.weekly_target),
      dadEmail: s.dad_email ?? undefined,
      dadName: s.dad_name ?? undefined,
      myName: s.my_name ?? undefined,
      shareToken: s.share_token,
    },
    entries: (entriesRes.data ?? []).map((row): Entry => ({
      id: row.id,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      notes: row.notes ?? undefined,
      status: row.status,
      createdAt: row.created_at,
    })),
    uniBlocks: (uniRes.data ?? []).map((row): UniBlock => ({
      id: row.id,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      label: row.label ?? undefined,
    })),
  };
}

async function cloudUpsertSettings(s: Settings) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("settings").upsert({
    id: 1,
    hourly_rate: s.hourlyRate,
    weekly_target: s.weeklyTarget,
    dad_email: s.dadEmail ?? null,
    dad_name: s.dadName ?? null,
    my_name: s.myName ?? null,
    share_token: s.shareToken,
    updated_at: new Date().toISOString(),
  });
}

async function cloudUpsertEntry(e: Entry) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("entries").upsert({
    id: e.id,
    date: e.date,
    start_time: e.startTime,
    end_time: e.endTime,
    notes: e.notes ?? null,
    status: e.status,
    created_at: e.createdAt,
  });
}

async function cloudDeleteEntry(id: string) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("entries").delete().eq("id", id);
}

async function cloudUpsertUni(u: UniBlock) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("uni_blocks").upsert({
    id: u.id,
    date: u.date,
    start_time: u.startTime,
    end_time: u.endTime,
    label: u.label ?? null,
  });
}

async function cloudDeleteUni(id: string) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("uni_blocks").delete().eq("id", id);
}

// ---------- React hook ----------

export type Store = ReturnType<typeof useStore>;

export function useStore() {
  const [state, setState] = useState<AppState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [cloud, setCloud] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = readLocal();
      const fromCloud = await cloudLoad();
      if (cancelled) return;

      if (fromCloud) {
        // First-time migration: if cloud has nothing but local has stuff, push it up.
        if (
          fromCloud.entries.length === 0 &&
          fromCloud.uniBlocks.length === 0 &&
          (local.entries.length > 0 || local.uniBlocks.length > 0)
        ) {
          await Promise.all([
            cloudUpsertSettings(local.settings),
            ...local.entries.map(cloudUpsertEntry),
            ...local.uniBlocks.map(cloudUpsertUni),
          ]);
          setState(local);
        } else {
          setState(fromCloud);
        }
        setCloud(true);
      } else {
        setState(local);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep local in sync always (cheap backup).
  useEffect(() => {
    if (loaded) writeLocal(state);
  }, [state, loaded]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => {
      const next = { ...s, settings: { ...s.settings, ...patch } };
      cloudUpsertSettings(next.settings);
      return next;
    });
  }, []);

  const addEntry = useCallback((e: Omit<Entry, "id" | "createdAt">) => {
    const full: Entry = {
      ...e,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setState((s) => ({ ...s, entries: [full, ...s.entries] }));
    cloudUpsertEntry(full);
    return full;
  }, []);

  const updateEntry = useCallback((id: string, patch: Partial<Entry>) => {
    setState((s) => {
      const next = s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e));
      const updated = next.find((e) => e.id === id);
      if (updated) cloudUpsertEntry(updated);
      return { ...s, entries: next };
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));
    cloudDeleteEntry(id);
  }, []);

  const addUni = useCallback((u: Omit<UniBlock, "id">) => {
    const full: UniBlock = { ...u, id: crypto.randomUUID() };
    setState((s) => ({ ...s, uniBlocks: [...s.uniBlocks, full] }));
    cloudUpsertUni(full);
    return full;
  }, []);

  const removeUni = useCallback((id: string) => {
    setState((s) => ({ ...s, uniBlocks: s.uniBlocks.filter((u) => u.id !== id) }));
    cloudDeleteUni(id);
  }, []);

  return {
    state,
    loaded,
    cloud,
    updateSettings,
    addEntry,
    updateEntry,
    removeEntry,
    addUni,
    removeUni,
  };
}

// ---------- context wrapper so all /me pages share one store ----------

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  return createElement(StoreContext.Provider, { value: store }, children);
}

export function useStoreContext(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStoreContext must be inside <StoreProvider>");
  return ctx;
}

