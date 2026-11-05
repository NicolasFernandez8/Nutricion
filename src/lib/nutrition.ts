import type { Entry, FoodEntry, Macros, Profile, Targets } from './types';
import { ageFrom } from './date';

/** Mifflin-St Jeor */
export function bmr(p: Profile): number {
  const age = ageFrom(p.birthDate);
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * age;
  return p.sex === 'male' ? base + 5 : base - 161;
}

export function activityFactor(w: Profile['workoutsPerWeek']): number {
  return w === 0 ? 1.375 : w === 3 ? 1.55 : 1.725;
}

export function tdee(p: Profile): number {
  return bmr(p) * activityFactor(p.workoutsPerWeek);
}

/** Calcula el plan diario recomendado (calorías + macros). */
export function computeTargets(p: Profile): Targets {
  const maintenance = tdee(p);
  // 1 kg de grasa ≈ 7700 kcal
  const daily = (p.speedKgPerWeek * 7700) / 7;
  let calories = maintenance;
  if (p.goal === 'lose') calories = maintenance - daily;
  if (p.goal === 'gain') calories = maintenance + daily;
  const floor = p.sex === 'male' ? 1500 : 1200;
  calories = Math.round(Math.max(floor, calories) / 10) * 10;

  const proteinPerKg = p.goal === 'maintain' ? 1.6 : p.goal === 'lose' ? 2.0 : 1.8;
  let protein = Math.round(p.weightKg * proteinPerKg);
  let fatPct = p.diet === 'keto' ? 0.7 : 0.27;
  let fat = Math.round((calories * fatPct) / 9);
  let carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  if (p.diet === 'keto') carbs = Math.min(carbs, 30);
  if (carbs < 0) {
    carbs = 0;
    fat = Math.round((calories - protein * 4) / 9);
  }
  if (protein * 4 > calories * 0.45) protein = Math.round((calories * 0.35) / 4);

  return {
    calories,
    protein,
    carbs,
    fat,
    fiber: Math.round((calories / 1000) * 14),
    sugar: Math.round((calories * 0.1) / 4),
    sodium: 2300,
  };
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiLabel(v: number): { label: string; color: string } {
  if (v < 18.5) return { label: 'Bajo peso', color: '#4aa8ff' };
  if (v < 25) return { label: 'Saludable', color: '#3ddc84' };
  if (v < 30) return { label: 'Sobrepeso', color: '#f5b335' };
  return { label: 'Obesidad', color: '#ff5d5d' };
}

export const zero = (): Required<Macros> => ({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });

export function entryMacros(e: FoodEntry): Required<Macros> {
  const s = e.servings;
  return {
    calories: e.per.calories * s,
    protein: e.per.protein * s,
    carbs: e.per.carbs * s,
    fat: e.per.fat * s,
    fiber: (e.per.fiber || 0) * s,
    sugar: (e.per.sugar || 0) * s,
    sodium: (e.per.sodium || 0) * s,
  };
}

export function dayTotals(entries: Entry[], date: string) {
  const eaten = zero();
  let burned = 0;
  for (const e of entries) {
    if (e.date !== date) continue;
    if (e.kind === 'exercise') {
      burned += e.calories;
      continue;
    }
    const m = entryMacros(e);
    (Object.keys(eaten) as (keyof typeof eaten)[]).forEach((k) => (eaten[k] += m[k]));
  }
  return { eaten, burned };
}

/** MET aproximados por tipo e intensidad */
export function exerciseCalories(type: 'run' | 'weights' | 'other', intensity: 'low' | 'medium' | 'high', minutes: number, weightKg: number, met?: number): number {
  const table = {
    run: { low: 6, medium: 9.8, high: 12.3 },
    weights: { low: 3.5, medium: 5, high: 6 },
    other: { low: 3, medium: 5, high: 8 },
  } as const;
  const m = met ?? table[type][intensity];
  return Math.round((m * 3.5 * weightKg * minutes) / 200);
}

/** Puntaje simple de salud 1..10 cuando la IA no lo da */
export function healthScore(m: Macros): number {
  if (!m.calories) return 5;
  const pDens = (m.protein * 4) / m.calories;
  const fiber = m.fiber || 0;
  const sugar = m.sugar || 0;
  let s = 5 + pDens * 10 + Math.min(fiber, 10) * 0.3 - (sugar / Math.max(1, m.calories / 100)) * 0.4;
  if ((m.sodium || 0) > 800) s -= 1;
  return Math.max(1, Math.min(10, Math.round(s)));
}

export const r0 = (n: number) => Math.round(n);
export const r1 = (n: number) => Math.round(n * 10) / 10;
