import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AppState, Entry, Profile, SavedFood, Settings, Targets } from './types';
import { computeTargets } from './nutrition';
import { todayKey } from './date';

const KEY = 'nutricion.state.v1';

export const defaultProfile: Profile = {
  name: '',
  sex: 'male',
  birthDate: '1995-01-01',
  heightCm: 175,
  weightKg: 75,
  targetWeightKg: 70,
  workoutsPerWeek: 3,
  goal: 'lose',
  speedKgPerWeek: 0.5,
  diet: 'classic',
};

export const defaultSettings: Settings = {
  aiProvider: 'none',
  geminiKey: '',
  geminiModel: 'gemini-2.5-flash',
  openaiBaseUrl: 'http://localhost:11434/v1',
  openaiKey: '',
  openaiModel: 'llava',
  addBurnedCalories: false,
  rolloverCalories: false,
  theme: 'system',
};

function initial(): AppState {
  return {
    version: 1,
    onboarded: false,
    profile: defaultProfile,
    targets: computeTargets(defaultProfile),
    entries: [],
    weights: [],
    saved: [],
    settings: defaultSettings,
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial();
    const s = JSON.parse(raw) as AppState;
    return { ...initial(), ...s, settings: { ...defaultSettings, ...s.settings } };
  } catch {
    return initial();
  }
}

interface Api {
  state: AppState;
  set: (fn: (s: AppState) => AppState) => void;
  addEntry: (e: Entry) => void;
  updateEntry: (e: Entry) => void;
  removeEntry: (id: string) => void;
  setProfile: (p: Profile, recompute?: boolean) => void;
  setTargets: (t: Targets) => void;
  setSettings: (p: Partial<Settings>) => void;
  logWeight: (kg: number, date?: string) => void;
  saveFood: (f: SavedFood) => void;
  unsaveFood: (id: string) => void;
  replaceAll: (s: AppState) => void;
  reset: () => void;
}

const Ctx = createContext<Api | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error('No se pudo guardar', e);
    }
  }, [state]);

  const api = useMemo<Api>(() => {
    const set = (fn: (s: AppState) => AppState) => setState((s) => fn(s));
    return {
      state,
      set,
      addEntry: (e) => set((s) => ({ ...s, entries: [...s.entries, e] })),
      updateEntry: (e) => set((s) => ({ ...s, entries: s.entries.map((x) => (x.id === e.id ? e : x)) })),
      removeEntry: (id) => set((s) => ({ ...s, entries: s.entries.filter((x) => x.id !== id) })),
      setProfile: (p, recompute = false) =>
        set((s) => ({ ...s, profile: p, targets: recompute ? computeTargets(p) : s.targets })),
      setTargets: (t) => set((s) => ({ ...s, targets: t })),
      setSettings: (p) => set((s) => ({ ...s, settings: { ...s.settings, ...p } })),
      logWeight: (kg, date = todayKey()) =>
        set((s) => {
          const weights = [...s.weights.filter((w) => w.date !== date), { date, kg }].sort((a, b) =>
            a.date.localeCompare(b.date)
          );
          const latest = weights[weights.length - 1];
          return { ...s, weights, profile: { ...s.profile, weightKg: latest.kg } };
        }),
      saveFood: (f) => set((s) => ({ ...s, saved: [f, ...s.saved.filter((x) => x.id !== f.id)] })),
      unsaveFood: (id) => set((s) => ({ ...s, saved: s.saved.filter((x) => x.id !== id) })),
      replaceAll: (n) => setState({ ...initial(), ...n, settings: { ...defaultSettings, ...n.settings } }),
      reset: () => setState(initial()),
    };
  }, [state]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore(): Api {
  const c = useContext(Ctx);
  if (!c) throw new Error('StoreProvider missing');
  return c;
}

/** Racha: días consecutivos (hasta hoy o ayer) con al menos un alimento registrado */
export function streak(entries: Entry[]): number {
  const days = new Set(entries.filter((e) => e.kind === 'food').map((e) => e.date));
  const d = new Date();
  if (!days.has(todayKey())) d.setDate(d.getDate() - 1);
  let n = 0;
  for (;;) {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!days.has(k)) break;
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
