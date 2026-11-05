// Base local de alimentos comunes (valores aproximados por porción, referencia USDA/ARGENFOODS).
// Funciona sin internet. [nombre, porción, kcal, proteína g, carbos g, grasa g, fibra g, azúcar g]
import type { Macros } from './types';

export interface LocalFood {
  name: string;
  portion: string;
  per: Required<Macros>;
}

type Row = [string, string, number, number, number, number, number, number];

const ROWS: Row[] = [
  // Carnes y proteínas
  ['Bife de chorizo', '200 g', 500, 52, 0, 32, 0, 0],
  ['Asado de tira', '200 g', 620, 44, 0, 49, 0, 0],
  ['Vacío', '200 g', 540, 46, 0, 39, 0, 0],
  ['Milanesa de carne (frita)', '1 unidad (150 g)', 390, 28, 20, 22, 1, 1],
  ['Milanesa de carne (al horno)', '1 unidad (150 g)', 300, 29, 20, 11, 1, 1],
  ['Milanesa de pollo (al horno)', '1 unidad (150 g)', 280, 30, 18, 9, 1, 1],
  ['Milanesa napolitana', '1 unidad (220 g)', 560, 38, 26, 33, 2, 4],
  ['Pechuga de pollo a la plancha', '150 g', 248, 46, 0, 5, 0, 0],
  ['Pollo al horno con piel (muslo)', '1 presa (150 g)', 345, 36, 0, 22, 0, 0],
  ['Carne picada común cocida', '100 g', 270, 25, 0, 18, 0, 0],
  ['Hamburguesa casera', '1 medallón (120 g)', 300, 24, 2, 21, 0, 0],
  ['Chorizo', '1 unidad (100 g)', 330, 15, 2, 29, 0, 0],
  ['Morcilla', '1 unidad (100 g)', 380, 14, 13, 30, 0, 0],
  ['Bondiola de cerdo', '150 g', 380, 37, 0, 25, 0, 0],
  ['Salmón a la plancha', '150 g', 310, 33, 0, 19, 0, 0],
  ['Merluza a la plancha', '150 g', 135, 28, 0, 2, 0, 0],
  ['Atún al natural', '1 lata (120 g)', 130, 29, 0, 1, 0, 0],
  ['Huevo duro', '1 unidad', 78, 6, 0.6, 5, 0, 0.6],
  ['Huevo frito', '1 unidad', 90, 6, 0.4, 7, 0, 0.4],
  ['Revuelto de 2 huevos', '1 porción', 200, 13, 2, 15, 0, 1],
  ['Jamón cocido', '2 fetas (40 g)', 45, 7, 1, 1.5, 0, 1],
  ['Queso cremoso', '50 g', 150, 10, 1, 12, 0, 0],
  ['Queso rallado', '1 cda (10 g)', 40, 3.5, 0.3, 2.8, 0, 0],
  ['Queso untable', '1 cda (20 g)', 50, 2, 1, 4, 0, 1],
  ['Tofu', '100 g', 145, 15, 3, 9, 2, 0],
  // Pastas, cereales, panificados
  ['Fideos cocidos', '1 plato (200 g)', 316, 12, 62, 2, 4, 1],
  ['Fideos con salsa de tomate', '1 plato (300 g)', 400, 13, 72, 7, 6, 8],
  ['Ravioles con salsa', '1 plato (300 g)', 520, 20, 66, 19, 4, 6],
  ['Ñoquis con salsa', '1 plato (300 g)', 450, 10, 85, 8, 5, 6],
  ['Arroz blanco cocido', '1 taza (160 g)', 205, 4, 45, 0.4, 0.6, 0],
  ['Arroz integral cocido', '1 taza (160 g)', 218, 5, 46, 1.6, 3.5, 0],
  ['Polenta cocida', '1 plato (250 g)', 210, 5, 45, 1, 2, 0],
  ['Avena', '40 g', 150, 5, 27, 2.6, 4, 0.4],
  ['Pan francés', '1 mignon (50 g)', 135, 4.5, 27, 0.6, 1.2, 1],
  ['Pan lactal', '2 rebanadas (50 g)', 130, 4, 24, 2, 1.4, 3],
  ['Pan integral', '2 rebanadas (50 g)', 120, 5, 21, 2, 3.5, 2.5],
  ['Tostadas de arroz', '2 unidades (18 g)', 70, 1.5, 15, 0.5, 0.6, 0],
  ['Galletitas de agua', '4 unidades (30 g)', 130, 3, 21, 4, 1, 1],
  ['Galletitas dulces rellenas', '3 unidades (36 g)', 175, 2, 25, 7.5, 1, 13],
  ['Medialuna de manteca', '1 unidad (40 g)', 170, 3, 19, 9, 0.6, 6],
  ['Factura', '1 unidad (50 g)', 200, 3.5, 25, 10, 0.8, 8],
  ['Bizcochito de grasa', '5 unidades (30 g)', 150, 2.5, 18, 7.5, 0.6, 1],
  ['Empanada de carne (al horno)', '1 unidad', 290, 11, 27, 15, 1.5, 2],
  ['Empanada de jamón y queso', '1 unidad', 270, 11, 26, 13, 1, 2],
  ['Pizza muzzarella', '1 porción', 290, 12, 33, 12, 2, 3],
  ['Fugazzeta', '1 porción', 330, 13, 32, 17, 2, 3],
  ['Tarta de verdura', '1 porción (180 g)', 380, 12, 32, 23, 3, 3],
  ['Sándwich de miga jamón y queso', '1 triple', 330, 14, 30, 17, 1.5, 4],
  ['Choripán', '1 unidad', 560, 22, 48, 31, 2, 2],
  ['Hamburguesa con pan', '1 unidad', 520, 28, 40, 27, 2, 7],
  ['Lomito completo', '1 unidad', 850, 50, 60, 45, 3, 8],
  ['Panchos (pan + salchicha)', '1 unidad', 280, 10, 25, 15, 1, 4],
  ['Tacos de carne', '2 unidades', 370, 20, 30, 18, 4, 2],
  ['Sushi (pieza roll)', '8 piezas', 330, 12, 52, 8, 2, 8],
  // Verduras y legumbres
  ['Ensalada mixta (lechuga, tomate, cebolla)', '1 plato', 60, 2, 10, 0.5, 3, 6],
  ['Ensalada con aceite', '1 plato + 1 cda aceite', 180, 2, 10, 14, 3, 6],
  ['Papas fritas', '1 porción (150 g)', 470, 5, 60, 23, 5, 0.5],
  ['Papa hervida', '1 mediana (170 g)', 145, 3, 33, 0.2, 3, 1.5],
  ['Puré de papas', '1 taza (210 g)', 210, 4, 35, 7, 3, 3],
  ['Batata al horno', '1 mediana (150 g)', 135, 3, 31, 0.2, 5, 10],
  ['Verduras salteadas', '1 taza (150 g)', 90, 3, 12, 4, 4, 5],
  ['Calabaza al horno', '200 g', 80, 2, 20, 0.2, 3, 5],
  ['Brócoli hervido', '1 taza (150 g)', 52, 4, 10, 0.6, 5, 2],
  ['Lentejas cocidas', '1 taza (200 g)', 230, 18, 40, 0.8, 16, 3.6],
  ['Garbanzos cocidos', '1 taza (165 g)', 270, 15, 45, 4, 12, 8],
  ['Porotos negros cocidos', '1 taza (170 g)', 227, 15, 41, 1, 15, 0.6],
  ['Guiso de lentejas', '1 plato (350 g)', 420, 24, 50, 13, 15, 6],
  ['Locro', '1 plato (350 g)', 480, 24, 45, 22, 8, 5],
  ['Palta', '1/2 unidad (100 g)', 160, 2, 9, 15, 7, 0.7],
  // Frutas
  ['Banana', '1 mediana (120 g)', 105, 1.3, 27, 0.4, 3, 14],
  ['Manzana', '1 mediana (180 g)', 95, 0.5, 25, 0.3, 4.4, 19],
  ['Naranja', '1 mediana (150 g)', 70, 1.3, 18, 0.2, 3, 12],
  ['Mandarina', '1 unidad (90 g)', 47, 0.7, 12, 0.3, 1.6, 9.5],
  ['Frutillas', '1 taza (150 g)', 48, 1, 11.5, 0.5, 3, 7],
  ['Uvas', '1 taza (150 g)', 104, 1, 27, 0.2, 1.4, 23],
  ['Pera', '1 mediana (180 g)', 100, 0.6, 27, 0.2, 5.5, 17],
  ['Durazno', '1 mediano (150 g)', 60, 1.4, 14, 0.4, 2.3, 12],
  ['Ensalada de frutas', '1 taza (200 g)', 120, 1.5, 30, 0.4, 3.5, 24],
  // Lácteos y desayuno
  ['Leche entera', '1 vaso (250 ml)', 155, 8, 12, 8, 0, 12],
  ['Leche descremada', '1 vaso (250 ml)', 90, 8.5, 12.5, 0.5, 0, 12.5],
  ['Yogur natural entero', '1 pote (190 g)', 120, 7, 9, 6, 0, 9],
  ['Yogur bebible con sabor', '1 vaso (200 ml)', 170, 5.5, 30, 3, 0, 27],
  ['Yogur griego', '170 g', 165, 15, 6, 9, 0, 6],
  ['Café con leche', '1 taza', 90, 5, 7, 4.5, 0, 7],
  ['Café negro', '1 taza', 2, 0.3, 0, 0, 0, 0],
  ['Mate (sin azúcar)', '1 termo', 10, 0.5, 1, 0, 0, 0],
  ['Dulce de leche', '1 cda (20 g)', 63, 1.4, 11, 1.5, 0, 10],
  ['Mermelada', '1 cda (20 g)', 50, 0, 13, 0, 0.2, 10],
  ['Manteca', '1 cdita (10 g)', 72, 0.1, 0, 8, 0, 0],
  ['Mantequilla de maní', '1 cda (16 g)', 95, 3.5, 3.5, 8, 1, 1.5],
  ['Granola', '40 g', 180, 4, 26, 7, 3, 9],
  ['Cereales de maíz (copos)', '30 g', 110, 2, 25, 0.3, 1, 3],
  ['Tostado de jamón y queso', '1 unidad', 350, 17, 32, 17, 1.5, 4],
  ['Panqueques (2) con dulce de leche', '2 unidades', 380, 10, 55, 13, 1, 30],
  // Snacks, dulces, bebidas
  ['Alfajor de chocolate', '1 unidad (50 g)', 230, 3, 32, 10, 1, 20],
  ['Chocolate con leche', '25 g', 135, 2, 15, 7.5, 0.6, 13],
  ['Helado', '1 cucurucho (2 bochas)', 290, 5, 35, 15, 0.5, 30],
  ['Torta / bizcochuelo', '1 porción (80 g)', 300, 4, 42, 13, 0.8, 26],
  ['Maní tostado', '30 g', 175, 7.5, 5, 15, 2.5, 1.3],
  ['Almendras', '30 g', 175, 6, 6, 15, 3.5, 1.2],
  ['Nueces', '30 g', 195, 4.5, 4, 19.5, 2, 0.8],
  ['Papas fritas de paquete', '30 g', 160, 2, 15, 10, 1.2, 0.2],
  ['Barrita de cereal', '1 unidad (23 g)', 90, 1.5, 17, 2, 1, 7],
  ['Gaseosa común', '1 vaso (350 ml)', 150, 0, 39, 0, 0, 39],
  ['Gaseosa light / zero', '1 vaso (350 ml)', 1, 0, 0, 0, 0, 0],
  ['Jugo de naranja exprimido', '1 vaso (250 ml)', 112, 1.7, 26, 0.5, 0.5, 21],
  ['Cerveza', '1 lata (473 ml)', 200, 2, 17, 0, 0, 0],
  ['Vino tinto', '1 copa (150 ml)', 125, 0.1, 4, 0, 0, 1],
  ['Fernet con cola', '1 vaso (300 ml)', 220, 0, 28, 0, 0, 26],
  ['Aceite de oliva', '1 cda (14 g)', 120, 0, 0, 14, 0, 0],
  ['Mayonesa', '1 cda (15 g)', 95, 0.1, 0.5, 10, 0, 0.3],
  ['Proteína en polvo (whey)', '1 scoop (30 g)', 120, 24, 3, 1.5, 0, 1.5],
];

export const LOCAL_FOODS: LocalFood[] = ROWS.map(([name, portion, calories, protein, carbs, fat, fiber, sugar]) => ({
  name,
  portion,
  per: { calories, protein, carbs, fat, fiber, sugar, sodium: 0 },
}));

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export function searchLocal(q: string): LocalFood[] {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return LOCAL_FOODS.slice(0, 30);
  return LOCAL_FOODS.filter((f) => {
    const n = norm(f.name);
    return words.every((w) => n.includes(w));
  });
}
