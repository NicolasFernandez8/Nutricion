import type { Ingredient, Macros, Settings } from './types';

export interface AiFood {
  isFood: boolean;
  name: string;
  per: Required<Macros>;
  ingredients: Ingredient[];
  healthScore: number;
}

const FOOD_SCHEMA_TEXT = `Respondé SOLO con JSON válido con esta forma exacta:
{
  "isFood": boolean,               // false si la imagen/texto no es comida o bebida
  "name": string,                  // nombre corto del plato en español
  "calories": number,              // kcal totales de la porción visible/descrita
  "protein": number,               // gramos
  "carbs": number,                 // gramos
  "fat": number,                   // gramos
  "fiber": number,                 // gramos
  "sugar": number,                 // gramos
  "sodium": number,                // miligramos
  "healthScore": number,           // 1 (poco saludable) a 10 (muy saludable)
  "ingredients": [ { "name": string, "amount": string, "calories": number, "protein": number, "carbs": number, "fat": number } ]
}`;

const SYSTEM = `Sos un nutricionista experto en estimar calorías y macronutrientes a partir de fotos o descripciones de comida.
Estimá el tamaño de la porción con referencias visuales (plato, cubiertos, manos, envases).
Desglosá los ingredientes principales con sus cantidades estimadas. Sé realista, no redondees en exceso.
Los totales deben ser coherentes con la suma de ingredientes. Usá nombres en español rioplatense cuando aplique.
${FOOD_SCHEMA_TEXT}`;

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function parseFood(raw: string): AiFood {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('La IA no devolvió un resultado válido.');
  const j = JSON.parse(m[0]);
  const ingredients: Ingredient[] = Array.isArray(j.ingredients)
    ? j.ingredients.map((i: any) => ({
        name: String(i.name ?? ''),
        amount: String(i.amount ?? ''),
        calories: num(i.calories),
        protein: num(i.protein),
        carbs: num(i.carbs),
        fat: num(i.fat),
      }))
    : [];
  return {
    isFood: j.isFood !== false,
    name: String(j.name || 'Comida'),
    per: {
      calories: Math.round(num(j.calories)),
      protein: Math.round(num(j.protein)),
      carbs: Math.round(num(j.carbs)),
      fat: Math.round(num(j.fat)),
      fiber: Math.round(num(j.fiber)),
      sugar: Math.round(num(j.sugar)),
      sodium: Math.round(num(j.sodium)),
    },
    ingredients,
    healthScore: Math.min(10, Math.max(1, Math.round(num(j.healthScore) || 5))),
  };
}

export function aiReady(s: Settings): boolean {
  if (s.aiProvider === 'gemini') return !!s.geminiKey.trim();
  if (s.aiProvider === 'openai') return !!s.openaiBaseUrl.trim() && !!s.openaiModel.trim();
  return false;
}

async function callModel(s: Settings, prompt: string, imageDataUrl?: string): Promise<string> {
  if (s.aiProvider === 'gemini') {
    const parts: any[] = [{ text: prompt }];
    if (imageDataUrl) {
      const [meta, data] = imageDataUrl.split(',');
      const mime = meta.match(/data:(.*?);/)?.[1] || 'image/jpeg';
      parts.push({ inline_data: { mime_type: mime, data } });
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      s.geminiModel || 'gemini-2.5-flash'
    )}:generateContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': s.geminiKey.trim() },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = j?.error?.message || res.statusText;
      if (res.status === 429) throw new Error('Llegaste al límite gratuito de Gemini por ahora. Probá en un rato.');
      throw new Error(`Gemini: ${msg}`);
    }
    return j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
  }

  if (s.aiProvider === 'openai') {
    const content: any[] = [{ type: 'text', text: prompt }];
    if (imageDataUrl) content.push({ type: 'image_url', image_url: { url: imageDataUrl } });
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (s.openaiKey.trim()) headers.Authorization = `Bearer ${s.openaiKey.trim()}`;
    const res = await fetch(s.openaiBaseUrl.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: s.openaiModel,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: imageDataUrl ? content : prompt },
        ],
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`IA: ${j?.error?.message || res.statusText}`);
    return j?.choices?.[0]?.message?.content ?? '';
  }

  throw new Error('Configurá un proveedor de IA en Ajustes para usar esta función.');
}

export async function analyzeFoodImage(s: Settings, imageDataUrl: string, hint?: string): Promise<AiFood> {
  const prompt =
    'Analizá esta foto de comida y estimá calorías y macronutrientes de lo que se ve.' +
    (hint ? ` Contexto del usuario: "${hint}".` : '');
  return parseFood(await callModel(s, prompt, imageDataUrl));
}

export async function analyzeFoodText(s: Settings, description: string): Promise<AiFood> {
  return parseFood(await callModel(s, `Estimá calorías y macronutrientes de: "${description}".`));
}

export async function fixFood(s: Settings, current: AiFood, correction: string, imageDataUrl?: string): Promise<AiFood> {
  const prompt = `Este es el análisis actual:\n${JSON.stringify(current)}\n\nEl usuario lo corrige así: "${correction}".\nDevolvé el análisis corregido completo.`;
  return parseFood(await callModel(s, prompt, imageDataUrl));
}

export async function estimateExercise(
  s: Settings,
  description: string,
  weightKg: number
): Promise<{ name: string; minutes: number; calories: number }> {
  const prompt = `El usuario pesa ${weightKg} kg y describe su ejercicio: "${description}".
Respondé SOLO JSON: {"name": string (nombre corto en español), "minutes": number, "calories": number (kcal quemadas estimadas)}.`;
  const raw = await callModel(s, prompt);
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('La IA no devolvió un resultado válido.');
  const j = JSON.parse(m[0]);
  return { name: String(j.name || 'Ejercicio'), minutes: Math.round(num(j.minutes)), calories: Math.round(num(j.calories)) };
}
