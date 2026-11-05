import type { FoodEntry } from './lib/types';

export type Route =
  | { name: 'food'; entry: FoodEntry; isNew?: boolean }
  | { name: 'camera'; mode: 'food' | 'barcode' }
  | { name: 'search'; imageDataUrl?: string }
  | { name: 'describe' }
  | { name: 'manual' }
  | { name: 'exercise' }
  | { name: 'saved' }
  | { name: 'targets' }
  | { name: 'profile' }
  | { name: 'ai' };

export interface Pending {
  id: string;
  date: string;
  imageDataUrl: string;
  hint?: string;
  status: 'working' | 'error';
  error?: string;
  progress: number;
}

export interface Nav {
  push: (r: Route) => void;
  pop: () => void;
  replace: (r: Route) => void;
  date: string;
  setDate: (d: string) => void;
  toast: (m: string) => void;
  analyzePhoto: (imageDataUrl: string, hint?: string) => void;
}
