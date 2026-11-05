export type Sex = 'male' | 'female';
export type Goal = 'lose' | 'maintain' | 'gain';
export type Diet = 'classic' | 'vegetarian' | 'vegan' | 'pescatarian' | 'keto';

export interface Profile {
  name: string;
  sex: Sex;
  birthDate: string; // YYYY-MM-DD
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  workoutsPerWeek: 0 | 3 | 6; // 0-2, 3-5, 6+
  goal: Goal;
  speedKgPerWeek: number; // 0.1 .. 1.5
  diet: Diet;
}

export interface Targets {
  calories: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber: number; // g
  sugar: number; // g
  sodium: number; // mg
}

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface Ingredient extends Macros {
  name: string;
  amount: string; // "120 g", "1 taza"
}

export type FoodSource = 'ai' | 'barcode' | 'database' | 'manual' | 'saved';

export interface FoodEntry {
  id: string;
  kind: 'food';
  date: string; // YYYY-MM-DD
  time: string; // ISO timestamp
  name: string;
  servings: number;
  per: Macros; // por porción
  ingredients?: Ingredient[];
  healthScore?: number; // 1..10
  imageId?: string;
  source: FoodSource;
  barcode?: string;
  note?: string;
}

export interface ExerciseEntry {
  id: string;
  kind: 'exercise';
  date: string;
  time: string;
  name: string;
  type: 'run' | 'weights' | 'other';
  intensity: 'low' | 'medium' | 'high';
  minutes: number;
  calories: number;
}

export type Entry = FoodEntry | ExerciseEntry;

export interface WeightLog {
  date: string;
  kg: number;
}

export interface SavedFood {
  id: string;
  name: string;
  per: Macros;
  ingredients?: Ingredient[];
  imageId?: string;
  barcode?: string;
}

export type AiProvider = 'none' | 'gemini' | 'openai';

export interface Settings {
  aiProvider: AiProvider;
  geminiKey: string;
  geminiModel: string;
  openaiBaseUrl: string; // compatible OpenAI: Ollama, Groq, OpenRouter, LM Studio…
  openaiKey: string;
  openaiModel: string;
  addBurnedCalories: boolean;
  rolloverCalories: boolean;
  theme: 'system' | 'light' | 'dark';
}

export interface AppState {
  version: 1;
  onboarded: boolean;
  profile: Profile;
  targets: Targets;
  entries: Entry[];
  weights: WeightLog[];
  saved: SavedFood[];
  settings: Settings;
}
