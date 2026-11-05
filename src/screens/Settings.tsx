import { useRef, useState } from 'react';
import { ChevronRight, User, Target, Sparkles, Download, Upload, Trash2, ExternalLink, ShieldCheck } from 'lucide-react';
import { useStore } from '../lib/store';
import { ageFrom } from '../lib/date';
import { computeTargets } from '../lib/nutrition';
import { Page, NumField, Spinner } from '../components/ui';
import type { Nav } from '../nav';
import type { AppState, Diet, Goal, Profile, Targets } from '../lib/types';
import { aiReady, analyzeFoodText } from '../lib/ai';
import { get, set as idbSet, keys, clear } from 'idb-keyval';

export default function Settings({ nav }: { nav: Nav }) {
  const { state, setSettings, replaceAll, reset } = useStore();
  const { profile, settings } = state;
  const fileRef = useRef<HTMLInputElement>(null);

  const exportData = async () => {
    const imgs: Record<string, string> = {};
    for (const k of await keys()) imgs[String(k)] = (await get(k)) as string;
    const blob = new Blob([JSON.stringify({ app: 'nutricion', state: { ...state, settings: { ...settings, geminiKey: '', openaiKey: '' } }, images: imgs })], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nutricion-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const importData = async (f?: File) => {
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (j.app !== 'nutricion' || !j.state) throw new Error();
      if (!confirm('Esto reemplaza todos tus datos actuales por los del archivo. ¿Seguir?')) return;
      for (const [k, v] of Object.entries(j.images || {})) await idbSet(k, v);
      const s = j.state as AppState;
      replaceAll({ ...s, settings: { ...s.settings, geminiKey: settings.geminiKey, openaiKey: settings.openaiKey } });
      nav.toast('Datos importados');
    } catch {
      nav.toast('Archivo inválido');
    }
  };

  const wipe = async () => {
    if (!confirm('¿Borrar TODOS tus datos (comidas, peso, fotos, ajustes)? No se puede deshacer.')) return;
    await clear();
    reset();
  };

  return (
    <div className="settings">
      <h1 className="screen-title">Ajustes</h1>
      <div className="card profile-sum">
        <div>
          <span className="muted small">Edad</span>
          <b>{ageFrom(profile.birthDate)} años</b>
        </div>
        <div>
          <span className="muted small">Altura</span>
          <b>{profile.heightCm} cm</b>
        </div>
        <div>
          <span className="muted small">Peso actual</span>
          <b>{profile.weightKg} kg</b>
        </div>
      </div>

      <div className="card menu">
        <button onClick={() => nav.push({ name: 'profile' })}>
          <User size={18} /> Datos personales <ChevronRight size={18} />
        </button>
        <button onClick={() => nav.push({ name: 'targets' })}>
          <Target size={18} /> Ajustar objetivos nutricionales <ChevronRight size={18} />
        </button>
        <button onClick={() => nav.push({ name: 'ai' })}>
          <Sparkles size={18} /> Inteligencia artificial
          <span className={'pill small ' + (aiReady(settings) ? 'ok' : '')}>{aiReady(settings) ? 'Activa' : 'Sin configurar'}</span>
          <ChevronRight size={18} />
        </button>
      </div>

      <h4 className="group-title">Preferencias</h4>
      <div className="card menu">
        <label className="toggle">
          <span>
            <b>Sumar calorías quemadas</b>
            <small className="muted">Las calorías del ejercicio se suman a tu objetivo diario</small>
          </span>
          <input type="checkbox" checked={settings.addBurnedCalories} onChange={(e) => setSettings({ addBurnedCalories: e.target.checked })} />
        </label>
        <label className="toggle">
          <span>
            <b>Pasar calorías sobrantes</b>
            <small className="muted">Hasta 200 kcal no consumidas pasan al día siguiente</small>
          </span>
          <input type="checkbox" checked={settings.rolloverCalories} onChange={(e) => setSettings({ rolloverCalories: e.target.checked })} />
        </label>
        <div className="toggle">
          <span>
            <b>Tema</b>
          </span>
          <div className="seg small">
            {(
              [
                ['system', 'Auto'],
                ['light', 'Claro'],
                ['dark', 'Oscuro'],
              ] as const
            ).map(([v, l]) => (
              <button key={v} className={settings.theme === v ? 'on' : ''} onClick={() => setSettings({ theme: v })}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <h4 className="group-title">Tus datos</h4>
      <div className="card menu">
        <div className="note">
          <ShieldCheck size={18} />
          <span className="small">Todo se guarda solo en este dispositivo. No hay cuentas ni servidores.</span>
        </div>
        <button onClick={exportData}>
          <Download size={18} /> Exportar copia de seguridad <ChevronRight size={18} />
        </button>
        <button onClick={() => fileRef.current?.click()}>
          <Upload size={18} /> Importar copia de seguridad <ChevronRight size={18} />
        </button>
        <button className="danger" onClick={wipe}>
          <Trash2 size={18} /> Borrar todos los datos <ChevronRight size={18} />
        </button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => importData(e.target.files?.[0])} />
      </div>
      <p className="muted small center pad">
        Nutricion v0.1.0 · Datos de productos: Open Food Facts (ODbL).
        <br />
        Las estimaciones son orientativas y no reemplazan el consejo de un profesional de la salud.
      </p>
    </div>
  );
}

export function ProfileEdit({ nav }: { nav: Nav }) {
  const { state, setProfile } = useStore();
  const [p, setP] = useState<Profile>(state.profile);
  const [recalc, setRecalc] = useState(true);
  const up = (x: Partial<Profile>) => setP({ ...p, ...x });
  const preview = computeTargets(p);
  return (
    <Page
      title="Datos personales"
      onBack={nav.pop}
      footer={
        <button
          className="btn primary block"
          onClick={() => {
            setProfile(p, recalc);
            nav.toast(recalc ? 'Datos y plan actualizados' : 'Datos actualizados');
            nav.pop();
          }}
        >
          Guardar
        </button>
      }
    >
      <label className="field">
        <span>Nombre (opcional)</span>
        <input value={p.name} onChange={(e) => up({ name: e.target.value })} />
      </label>
      <div className="grid2">
        <label className="field">
          <span>Sexo</span>
          <select value={p.sex} onChange={(e) => up({ sex: e.target.value as Profile['sex'] })}>
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
          </select>
        </label>
        <label className="field">
          <span>Nacimiento</span>
          <input type="date" value={p.birthDate} onChange={(e) => up({ birthDate: e.target.value })} />
        </label>
        <NumField label="Altura" value={p.heightCm} onChange={(v) => up({ heightCm: v })} suffix="cm" />
        <NumField label="Peso actual" value={p.weightKg} onChange={(v) => up({ weightKg: v })} suffix="kg" step={0.1} />
        <NumField label="Peso objetivo" value={p.targetWeightKg} onChange={(v) => up({ targetWeightKg: v })} suffix="kg" step={0.1} />
        <NumField label="Ritmo semanal" value={p.speedKgPerWeek} onChange={(v) => up({ speedKgPerWeek: Math.min(1.5, Math.max(0.1, v)) })} suffix="kg" step={0.1} />
        <label className="field">
          <span>Objetivo</span>
          <select value={p.goal} onChange={(e) => up({ goal: e.target.value as Goal })}>
            <option value="lose">Bajar de peso</option>
            <option value="maintain">Mantener</option>
            <option value="gain">Subir de peso</option>
          </select>
        </label>
        <label className="field">
          <span>Entrenamientos/semana</span>
          <select value={p.workoutsPerWeek} onChange={(e) => up({ workoutsPerWeek: +e.target.value as Profile['workoutsPerWeek'] })}>
            <option value={0}>0 – 2</option>
            <option value={3}>3 – 5</option>
            <option value={6}>6 o más</option>
          </select>
        </label>
        <label className="field">
          <span>Dieta</span>
          <select value={p.diet} onChange={(e) => up({ diet: e.target.value as Diet })}>
            <option value="classic">Clásica</option>
            <option value="pescatarian">Pescetariana</option>
            <option value="vegetarian">Vegetariana</option>
            <option value="vegan">Vegana</option>
            <option value="keto">Keto</option>
          </select>
        </label>
      </div>
      <label className="toggle card">
        <span>
          <b>Recalcular mi plan</b>
          <small className="muted">
            Nuevo objetivo: {preview.calories} kcal · P {preview.protein}g · C {preview.carbs}g · G {preview.fat}g
          </small>
        </span>
        <input type="checkbox" checked={recalc} onChange={(e) => setRecalc(e.target.checked)} />
      </label>
    </Page>
  );
}

export function TargetsEdit({ nav }: { nav: Nav }) {
  const { state, setTargets } = useStore();
  const [t, setT] = useState<Targets>(state.targets);
  const f = (k: keyof Targets, l: string, s: string) => <NumField key={k} label={l} suffix={s} value={t[k]} onChange={(v) => setT({ ...t, [k]: Math.max(0, Math.round(v)) })} />;
  const macroKcal = t.protein * 4 + t.carbs * 4 + t.fat * 9;
  return (
    <Page
      title="Objetivos nutricionales"
      onBack={nav.pop}
      footer={
        <div className="row gap">
          <button className="btn" onClick={() => setT(computeTargets(state.profile))}>
            Auto-generar
          </button>
          <button
            className="btn primary grow"
            onClick={() => {
              setTargets(t);
              nav.toast('Objetivos guardados');
              nav.pop();
            }}
          >
            Guardar
          </button>
        </div>
      }
    >
      <div className="grid2">
        {f('calories', 'Calorías', 'kcal')}
        {f('protein', 'Proteína', 'g')}
        {f('carbs', 'Carbohidratos', 'g')}
        {f('fat', 'Grasas', 'g')}
        {f('fiber', 'Fibra', 'g')}
        {f('sugar', 'Azúcar', 'g')}
        {f('sodium', 'Sodio', 'mg')}
      </div>
      <p className={'small ' + (Math.abs(macroKcal - t.calories) > 100 ? 'err' : 'muted')}>
        Los macros suman {macroKcal} kcal {Math.abs(macroKcal - t.calories) > 100 ? '— no coincide con tus calorías' : ''}
      </p>
    </Page>
  );
}

export function AiSettings({ nav }: { nav: Nav }) {
  const { state, setSettings } = useStore();
  const s = state.settings;
  const [testing, setTesting] = useState(false);
  const test = async () => {
    setTesting(true);
    try {
      const r = await analyzeFoodText(s, '1 banana mediana');
      nav.toast(`¡Funciona! 1 banana ≈ ${r.per.calories} kcal`);
    } catch (e: any) {
      nav.toast(e.message);
    } finally {
      setTesting(false);
    }
  };
  return (
    <Page title="Inteligencia artificial" onBack={nav.pop}>
      <p className="muted">
        La IA reconoce la comida de tus fotos y estima calorías. Nutricion no cobra nada: usás un proveedor gratuito con tu propia clave, o un modelo en tu PC.
      </p>
      <div className="seg">
        {(
          [
            ['none', 'Desactivada'],
            ['gemini', 'Google Gemini'],
            ['openai', 'Local / compatible'],
          ] as const
        ).map(([v, l]) => (
          <button key={v} className={s.aiProvider === v ? 'on' : ''} onClick={() => setSettings({ aiProvider: v })}>
            {l}
          </button>
        ))}
      </div>

      {s.aiProvider === 'gemini' && (
        <div className="card">
          <h4>Google Gemini (nivel gratuito)</h4>
          <ol className="steps small">
            <li>
              Entrá a{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                aistudio.google.com/apikey <ExternalLink size={12} />
              </a>{' '}
              con tu cuenta de Google.
            </li>
            <li>Tocá “Create API key” (no hace falta tarjeta; usá el plan gratuito).</li>
            <li>Pegala acá abajo. Queda guardada solo en este dispositivo.</li>
          </ol>
          <label className="field">
            <span>Clave de API</span>
            <input type="password" autoComplete="off" value={s.geminiKey} onChange={(e) => setSettings({ geminiKey: e.target.value })} placeholder="Pegá tu clave" />
          </label>
          <label className="field">
            <span>Modelo</span>
            <input value={s.geminiModel} onChange={(e) => setSettings({ geminiModel: e.target.value })} />
          </label>
          <p className="muted small">
            Ojo: en el plan gratuito Google puede usar lo que envíes para mejorar sus modelos. No mandes fotos con datos personales.
          </p>
        </div>
      )}

      {s.aiProvider === 'openai' && (
        <div className="card">
          <h4>Modelo local o servidor compatible con OpenAI</h4>
          <p className="muted small">
            100% gratis y privado con{' '}
            <a href="https://ollama.com" target="_blank" rel="noreferrer">
              Ollama <ExternalLink size={12} />
            </a>{' '}
            en tu PC (ej. <code>ollama pull llava</code> o <code>qwen2.5vl</code>). También sirve cualquier servicio compatible con la API de OpenAI.
          </p>
          <label className="field">
            <span>URL base</span>
            <input value={s.openaiBaseUrl} onChange={(e) => setSettings({ openaiBaseUrl: e.target.value })} />
          </label>
          <label className="field">
            <span>Modelo (con visión)</span>
            <input value={s.openaiModel} onChange={(e) => setSettings({ openaiModel: e.target.value })} />
          </label>
          <label className="field">
            <span>Clave (si el servicio la pide)</span>
            <input type="password" autoComplete="off" value={s.openaiKey} onChange={(e) => setSettings({ openaiKey: e.target.value })} />
          </label>
          <p className="muted small">
            Para usarlo desde el celular, Ollama tiene que escuchar en la red (<code>OLLAMA_HOST=0.0.0.0</code> y <code>OLLAMA_ORIGINS=*</code>) y poner la IP de tu PC.
          </p>
        </div>
      )}

      {s.aiProvider !== 'none' && (
        <button className="btn block" disabled={!aiReady(s) || testing} onClick={test}>
          {testing ? <Spinner /> : 'Probar conexión'}
        </button>
      )}
    </Page>
  );
}
