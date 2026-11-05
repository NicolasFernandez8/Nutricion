// Open Food Facts: base abierta y gratuita de productos (API oficial, sin clave).
import type { Macros } from './types';

export interface Product {
  barcode?: string;
  name: string;
  brand?: string;
  image?: string;
  servingLabel: string; // ej. "30 g" o "100 g"
  servingGrams: number;
  per100: Required<Macros>;
}

const BASE = 'https://world.openfoodfacts.org';

function toProduct(p: any): Product | null {
  const n = p?.nutriments;
  if (!n) return null;
  const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : undefined);
  if (kcal == null) return null;
  const sg = parseFloat(p.serving_quantity);
  const grams = Number.isFinite(sg) && sg > 0 ? sg : 100;
  return {
    barcode: p.code,
    name: p.product_name_es || p.product_name || p.generic_name || 'Producto',
    brand: p.brands?.split(',')[0]?.trim(),
    image: p.image_front_small_url || p.image_small_url || p.image_url,
    servingLabel: p.serving_size || `${grams} g`,
    servingGrams: grams,
    per100: {
      calories: Math.round(kcal),
      protein: +(n.proteins_100g ?? 0),
      carbs: +(n.carbohydrates_100g ?? 0),
      fat: +(n.fat_100g ?? 0),
      fiber: +(n.fiber_100g ?? 0),
      sugar: +(n.sugars_100g ?? 0),
      sodium: Math.round(+(n.sodium_100g ?? 0) * 1000),
    },
  };
}

export async function productByBarcode(code: string): Promise<Product | null> {
  const res = await fetch(
    `${BASE}/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,product_name_es,generic_name,brands,nutriments,serving_size,serving_quantity,image_front_small_url,image_small_url,image_url`
  );
  if (!res.ok) return null;
  const j = await res.json();
  if (j.status !== 1) return null;
  return toProduct(j.product);
}

export async function searchProducts(q: string): Promise<Product[]> {
  const url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(
    q
  )}&search_simple=1&action=process&json=1&page_size=20&fields=code,product_name,product_name_es,generic_name,brands,nutriments,serving_size,serving_quantity,image_front_small_url`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const j = await res.json();
  return (j.products || []).map(toProduct).filter(Boolean) as Product[];
}

export function scale(per100: Required<Macros>, grams: number): Required<Macros> {
  const f = grams / 100;
  const r = (v: number) => Math.round(v * f * 10) / 10;
  return {
    calories: Math.round(per100.calories * f),
    protein: r(per100.protein),
    carbs: r(per100.carbs),
    fat: r(per100.fat),
    fiber: r(per100.fiber),
    sugar: r(per100.sugar),
    sodium: Math.round(per100.sodium * f),
  };
}
