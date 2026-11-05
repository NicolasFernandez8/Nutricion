# Nutricion

Contador de calorías con IA: sacale una foto a tu comida y estimá calorías, proteínas, carbohidratos y grasas. **100% gratis, sin cuentas y con los datos guardados solo en tu dispositivo.**

Disponible para **Android** (APK), **escritorio** (Windows, Linux y macOS) y **web** (PWA instalable).

## Funciones

- **Onboarding y plan personalizado**: sexo, edad, altura, peso, actividad, objetivo, ritmo y dieta → calorías y macros diarios (Mifflin-St Jeor).
- **Escanear comida con foto (IA)**: reconoce el plato, desglosa ingredientes, calcula calorías, macros, fibra, azúcar, sodio y un puntaje de salud. El análisis corre en segundo plano y se agrega solo.
- **Corregir con IA**: “eran 2 empanadas”, “sin queso”… y recalcula.
- **Código de barras**: escaneo en vivo o desde foto, con datos de [Open Food Facts](https://openfoodfacts.org) (API abierta y gratuita).
- **Base de alimentos**: +110 comidas comunes (argentinas incluidas) que funcionan sin internet, más búsqueda en Open Food Facts.
- **Describir comida con texto** (IA), **entrada manual** y **alimentos guardados**.
- **Ejercicio**: correr, pesas u otro (estimación por MET o con IA). Opción de sumar calorías quemadas al objetivo.
- **Inicio**: calorías restantes, anillos de macros, fibra/azúcar/sodio, semana, racha y lista del día.
- **Progreso**: peso con gráfico y objetivo, calorías de la semana por macros, IMC y racha.
- **Ajustes**: datos personales, objetivos editables, pasar calorías sobrantes, tema claro/oscuro, exportar/importar copia de seguridad.

## IA gratuita (elegís vos)

En **Ajustes → Inteligencia artificial**:

1. **Google Gemini (nivel gratuito)**: creás tu clave en https://aistudio.google.com/apikey y la pegás en la app. Queda guardada solo en tu dispositivo.
2. **Modelo local con [Ollama](https://ollama.com)** u otro servidor compatible con la API de OpenAI: totalmente privado y sin límites (ej. `ollama pull qwen2.5vl`).

Sin IA, la app funciona igual con base de alimentos, código de barras y carga manual.

## Descargas

Cada push compila automáticamente en GitHub Actions (gratis en repos públicos):

- **Actions → Build Nutricion → Artifacts**: `Nutricion-android` (APK), `Nutricion-Windows` (instalador + portable), `Nutricion-Linux` (AppImage), `Nutricion-macOS` (dmg).
- Con cada tag `v*` se publica una **Release** con todos los instaladores.
- En `main` se publica la versión web en GitHub Pages.

## Desarrollo

```bash
npm install
npm run dev            # web en http://localhost:5173
npm run desktop        # escritorio (Electron)
npm run android:sync   # copia la web al proyecto Android (abrir /android en Android Studio)
```

Stack: React + TypeScript + Vite · Capacitor (Android) · Electron (escritorio).

> Las estimaciones son orientativas y no reemplazan el consejo de un profesional de la salud.
