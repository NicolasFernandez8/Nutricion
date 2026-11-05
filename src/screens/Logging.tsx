import { useEffect, useState } from 'react';
import { Search as SearchIcon, Plus, Globe, Bookmark, Sparkles, Footprints, Dumbbell, PenLine, Trash2 } from 'lucide-react';
import type { Nav } from '../nav';
import type { FoodEntry, Macros } from '../lib/types';
import { useStore } from '../lib/store';
import { Page, Spinner, Thumb, NumField } from '../components/ui';
import { searchLocal } from '../lib/foods';
import { searchProducts, scale, type Product } from '../lib/off';
import { aiReady, analyzeFoodText, estimateExercise } from '../lib/ai';
import { uid } from '../lib/date';
import { storeImage } from '../lib/images';
import { exerciseCalories } from '../lib/nutrition';
import { MacroEditor } from './FoodDetail';

function draft(nav: Nav, name: string, per: Macros, extra: Partial<FoodEntry> = {}): FoodEntry {
  return {
    id: uid(),
    kind: 'food',
    date: nav.date,
    time: new Date().toISOString(),
    name,
    servings: 1,
    per: { fiber: 0, sugar: 0, sodium: 0, ...per },
    source: 'database',
    ...extra,
  };
}

/* ---------------- Base de alimentos ---------------- */
export function SearchFood({ nav, imageDataUrl, initialTab = 'all' }: { nav: Nav; imageDataUrl?: string; initialTab?: 'all' | 'saved' }) {
  const { state, unsaveFood } = useStore();
  const [tab, setTab] = useState<'all' | 'saved'>(initialTab);
  const [q, setQ] = useState('');
  const [online, setOnline] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageId, setImageId] = useState<string>();

  useEffect(() => {
    if (imageDataUrl) storeImage(imageDataUrl).then(setImageId);
  }, [imageDataUrl]);

  useEffect(() => {
    setOnline([]);
    if (q.trim().length < 3) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        setOnline(await searchProducts(q.trim()));
      } catch {
        setOnline([]);
      } finally {
        setLoading(false);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [q]);

  const local = searchLocal(q);
  const open = (name: string, per: Macros, extra: Partial<FoodEntry> = {}) =>
    nav.replace({ name: 'food', entry: draft(nav, name, per, { imageId, ...extra }), isNew: true });

  return (
    <Page title="Base de alimentos" onBack={nav.pop}>
      <div className="searchbar">
        <SearchIcon size={18} />
        <input autoFocus placeholder="Buscá un alimento (ej. milanesa, yogur…)" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="tabs">
        <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>
          Todos
        </button>
        <button className={tab === 'saved' ? 'on' : ''} onClick={() => setTab('saved')}>
          <Bookmark size={14} /> Guardados ({state.saved.length})
        </button>
      </div>

      {tab === 'saved' ? (
        <div className="list">
          {state.saved.length === 0 && <p className="muted center">Todavía no guardaste alimentos. Tocá el marcador en cualquier comida.</p>}
          {state.saved
            .filter((s) => s.name.toLowerCase().includes(q.toLowerCase()))
            .map((s) => (
              <div className="card list-item" key={s.id}>
                <Thumb imageId={s.imageId} size={48} fallback={<span>🍽️</span>} />
                <button
                  className="grow left"
                  onClick={() => open(s.name, s.per, { ingredients: s.ingredients, imageId: imageId || s.imageId, source: 'saved', barcode: s.barcode })}
                >
                  <b>{s.name}</b>
                  <small className="muted">{Math.round(s.per.calories)} kcal · P {Math.round(s.per.protein)} · C {Math.round(s.per.carbs)} · G {Math.round(s.per.fat)}</small>
                </button>
                <button className="icon-btn" onClick={() => unsaveFood(s.id)} aria-label="Quitar">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
        </div>
      ) : (
        <div className="list">
          <button className="card list-item" onClick={() => nav.replace({ name: 'manual' })}>
            <PenLine size={20} />
            <div className="grow left">
              <b>Cargar a mano</b>
              <small className="muted">Escribí calorías y macros vos</small>
            </div>
            <Plus size={18} />
          </button>
          {aiReady(state.settings) && q.trim() && (
            <button className="card list-item" onClick={() => nav.replace({ name: 'describe' })}>
              <Sparkles size={20} />
              <div className="grow left">
                <b>Describir “{q}” con IA</b>
                <small className="muted">Estimación a partir de texto</small>
              </div>
            </button>
          )}
          {local.map((f) => (
            <button className="card list-item" key={f.name} onClick={() => open(f.name, f.per, { note: `Porción: ${f.portion}` })}>
              <span className="li-emoji">🍽️</span>
              <div className="grow left">
                <b>{f.name}</b>
                <small className="muted">
                  {f.per.calories} kcal · {f.portion}
                </small>
              </div>
              <Plus size={18} />
            </button>
          ))}
          {q.trim().length >= 3 && (
            <h4 className="list-sep">
              <Globe size={14} /> Open Food Facts {loading && '…'}
            </h4>
          )}
          {loading && <Spinner />}
          {online.map((p, i) => (
            <button
              className="card list-item"
              key={(p.barcode || '') + i}
              onClick={() =>
                open(p.brand ? `${p.name} (${p.brand})` : p.name, scale(p.per100, p.servingGrams), {
                  source: 'barcode',
                  barcode: p.barcode,
                  note: `Porción: ${p.servingLabel}`,
                })
              }
            >
              {p.image ? <img className="li-img" src={p.image} alt="" loading="lazy" /> : <span className="li-emoji">🏷️</span>}
              <div className="grow left">
                <b>{p.name}</b>
                <small className="muted">
                  {p.brand ? p.brand + ' · ' : ''}
                  {scale(p.per100, p.servingGrams).calories} kcal · {p.servingLabel}
                </small>
              </div>
              <Plus size={18} />
            </button>
          ))}
          {q.trim().length >= 3 && !loading && local.length === 0 && online.length === 0 && <p className="muted center">Sin resultados.</p>}
        </div>
      )}
    </Page>
  );
}

/* ---------------- Describir con IA ---------------- */
export function DescribeFood({ nav }: { nav: Nav }) {
  const { state } = useStore();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const r = await analyzeFoodText(state.settings, text);
      if (!r.isFood) {
        nav.toast('Eso no parece comida');
        return;
      }
      nav.replace({
        name: 'food',
        entry: draft(nav, r.name, r.per, { ingredients: r.ingredients, healthScore: r.healthScore, source: 'ai' }),
        isNew: true,
      });
    } catch (e: any) {
      nav.toast(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page title="Describir comida" onBack={nav.pop}>
      {busy ? (
        <Spinner label="Calculando…" />
      ) : (
        <>
          <p className="muted">Escribí lo que comiste con el mayor detalle posible.</p>
          <textarea
            className="textarea"
            rows={5}
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ej.: 2 empanadas de carne al horno y una manzana"
          />
          <button className="btn primary block" disabled={!text.trim()} onClick={go}>
            <Sparkles size={16} /> Analizar
          </button>
        </>
      )}
    </Page>
  );
}

/* ---------------- Manual ---------------- */
export function ManualFood({ nav }: { nav: Nav }) {
  const [name, setName] = useState('');
  const [per, setPer] = useState<Macros>({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });
  return (
    <Page
      title="Entrada manual"
      onBack={nav.pop}
      footer={
        <button
          className="btn primary block"
          disabled={!name.trim()}
          onClick={() => nav.replace({ name: 'food', entry: draft(nav, name.trim(), per, { source: 'manual' }), isNew: true })}
        >
          Continuar
        </button>
      }
    >
      <label className="field">
        <span>Nombre</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Tostadas con palta" />
      </label>
      <MacroEditor per={per} onChange={setPer} />
    </Page>
  );
}

/* ---------------- Ejercicio ---------------- */
export function ExerciseLog({ nav }: { nav: Nav }) {
  const { state, addEntry } = useStore();
  const [type, setType] = useState<'run' | 'weights' | 'other' | null>(null);
  const [intensity, setIntensity] = useState<'low' | 'medium' | 'high'>('medium');
  const [minutes, setMinutes] = useState(30);
  const [desc, setDesc] = useState('');
  const [manualKcal, setManualKcal] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const w = state.profile.weightKg;
  const kcal = manualKcal ?? (type ? exerciseCalories(type, intensity, minutes, w) : 0);

  const save = (name: string, calories: number, mins = minutes) => {
    addEntry({
      id: uid(),
      kind: 'exercise',
      date: nav.date,
      time: new Date().toISOString(),
      name,
      type: type || 'other',
      intensity,
      minutes: mins,
      calories,
    });
    nav.toast(`Ejercicio registrado: ${calories} kcal`);
    nav.pop();
  };

  const describe = async () => {
    setBusy(true);
    try {
      const r = await estimateExercise(state.settings, desc, w);
      save(r.name, r.calories, r.minutes);
    } catch (e: any) {
      nav.toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!type)
    return (
      <Page title="Registrar ejercicio" onBack={nav.pop}>
        <div className="list">
          <button className="card list-item big" onClick={() => setType('run')}>
            <Footprints size={24} />
            <div className="grow left">
              <b>Correr</b>
              <small className="muted">Correr, caminar, trotar, etc.</small>
            </div>
          </button>
          <button className="card list-item big" onClick={() => setType('weights')}>
            <Dumbbell size={24} />
            <div className="grow left">
              <b>Pesas</b>
              <small className="muted">Máquinas, peso libre, etc.</small>
            </div>
          </button>
          <button className="card list-item big" onClick={() => setType('other')}>
            <PenLine size={24} />
            <div className="grow left">
              <b>Otro / Describir</b>
              <small className="muted">Fútbol, bici, natación… {aiReady(state.settings) ? 'o describilo con IA' : ''}</small>
            </div>
          </button>
        </div>
      </Page>
    );

  return (
    <Page
      title={type === 'run' ? 'Correr' : type === 'weights' ? 'Pesas' : 'Ejercicio'}
      onBack={() => setType(null)}
      footer={
        <button className="btn primary block" onClick={() => save(type === 'run' ? 'Correr' : type === 'weights' ? 'Pesas' : desc.trim() || 'Ejercicio', kcal)}>
          Agregar · {kcal} kcal
        </button>
      }
    >
      {type === 'other' && aiReady(state.settings) && (
        <div className="card">
          <h4>Describir con IA</h4>
          <textarea className="textarea" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ej.: 1 hora de fútbol 5 intenso" />
          <button className="btn block" disabled={!desc.trim() || busy} onClick={describe}>
            {busy ? 'Calculando…' : 'Estimar con IA y agregar'}
          </button>
        </div>
      )}
      {type === 'other' && !aiReady(state.settings) && (
        <label className="field">
          <span>Nombre</span>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ej.: Natación" />
        </label>
      )}
      <h4>Intensidad</h4>
      <div className="seg">
        {(['low', 'medium', 'high'] as const).map((i) => (
          <button key={i} className={intensity === i ? 'on' : ''} onClick={() => (setIntensity(i), setManualKcal(null))}>
            {i === 'low' ? 'Baja' : i === 'medium' ? 'Media' : 'Alta'}
          </button>
        ))}
      </div>
      <h4>Duración</h4>
      <div className="seg">
        {[15, 30, 60, 90].map((m) => (
          <button key={m} className={minutes === m ? 'on' : ''} onClick={() => (setMinutes(m), setManualKcal(null))}>
            {m} min
          </button>
        ))}
      </div>
      <NumField label="Minutos" value={minutes} onChange={(v) => (setMinutes(Math.max(1, Math.round(v))), setManualKcal(null))} suffix="min" />
      <NumField label="Calorías quemadas (editable)" value={kcal} onChange={(v) => setManualKcal(Math.max(0, Math.round(v)))} suffix="kcal" />
    </Page>
  );
}
