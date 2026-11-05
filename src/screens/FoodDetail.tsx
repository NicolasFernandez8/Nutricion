import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, Trash2, Flame, Beef, Wheat, Droplet, Sparkles, Pencil, Plus, X } from 'lucide-react';
import type { Nav } from '../nav';
import type { FoodEntry, Ingredient, Macros } from '../lib/types';
import { useStore } from '../lib/store';
import { Page, Stepper, Sheet, NumField, Spinner, COLORS } from '../components/ui';
import { entryMacros, healthScore, r0 } from '../lib/nutrition';
import { aiReady, fixFood } from '../lib/ai';
import { deleteImage, loadImage } from '../lib/images';
import { hhmm, uid } from '../lib/date';

export default function FoodDetail({ nav, entry: initial, isNew }: { nav: Nav; entry: FoodEntry; isNew?: boolean }) {
  const { state, addEntry, updateEntry, removeEntry, saveFood, unsaveFood } = useStore();
  const [e, setE] = useState<FoodEntry>(initial);
  const [img, setImg] = useState<string>();
  const [fixOpen, setFixOpen] = useState(false);
  const [fixText, setFixText] = useState('');
  const [fixing, setFixing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [ingOpen, setIngOpen] = useState<number | null>(null);

  useEffect(() => {
    if (e.imageId) loadImage(e.imageId).then(setImg);
  }, [e.imageId]);

  const total = entryMacros(e);
  const savedMatch = state.saved.find((s) => s.name === e.name && s.per.calories === e.per.calories);
  const score = e.healthScore ?? healthScore(e.per);

  const commit = () => {
    if (isNew) addEntry(e);
    else updateEntry(e);
    nav.pop();
  };

  const del = async () => {
    if (isNew) return nav.pop();
    if (!confirm('¿Borrar esta comida?')) return;
    if (e.imageId && !state.saved.some((s) => s.imageId === e.imageId)) await deleteImage(e.imageId);
    removeEntry(e.id);
    nav.pop();
  };

  const toggleSaved = () => {
    if (savedMatch) {
      unsaveFood(savedMatch.id);
      nav.toast('Quitado de guardados');
    } else {
      saveFood({ id: uid(), name: e.name, per: e.per, ingredients: e.ingredients, imageId: e.imageId, barcode: e.barcode });
      nav.toast('Guardado en tus alimentos');
    }
  };

  const runFix = async () => {
    if (!fixText.trim()) return;
    setFixing(true);
    try {
      const r = await fixFood(
        state.settings,
        { isFood: true, name: e.name, per: { fiber: 0, sugar: 0, sodium: 0, ...e.per }, ingredients: e.ingredients || [], healthScore: score },
        fixText,
        img
      );
      setE({ ...e, name: r.name, per: r.per, ingredients: r.ingredients, healthScore: r.healthScore });
      setFixOpen(false);
      setFixText('');
      if (!isNew) updateEntry({ ...e, name: r.name, per: r.per, ingredients: r.ingredients, healthScore: r.healthScore });
      nav.toast('Resultado corregido');
    } catch (err: any) {
      nav.toast(err.message);
    } finally {
      setFixing(false);
    }
  };

  const recalcFromIngredients = (ings: Ingredient[]) => {
    const sum = ings.reduce(
      (a, i) => ({ calories: a.calories + i.calories, protein: a.protein + i.protein, carbs: a.carbs + i.carbs, fat: a.fat + i.fat }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    setE((x) => ({ ...x, ingredients: ings, per: { ...x.per, ...sum } }));
  };

  return (
    <Page
      title={isNew ? 'Nuevo registro' : 'Nutrición'}
      onBack={nav.pop}
      close={isNew}
      right={
        <>
          <button className="icon-btn" onClick={toggleSaved} aria-label="Guardar">
            {savedMatch ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
          </button>
          {!isNew && (
            <button className="icon-btn" onClick={del} aria-label="Borrar">
              <Trash2 size={20} />
            </button>
          )}
        </>
      }
      footer={
        <div className="row gap">
          {aiReady(state.settings) && (
            <button className="btn" onClick={() => setFixOpen(true)}>
              <Sparkles size={16} /> Corregir
            </button>
          )}
          <button className="btn primary grow" onClick={commit}>
            {isNew ? 'Agregar' : 'Listo'}
          </button>
        </div>
      }
    >
      <div className="food-detail">
        {img && <img className="food-hero" src={img} alt="" />}
        <div className="fd-meta">
          <span className="muted small">{hhmm(e.time)}</span>
          {e.note && <span className="muted small"> · {e.note}</span>}
        </div>
        <div className="fd-title">
          <input className="title-input" value={e.name} onChange={(ev) => setE({ ...e, name: ev.target.value })} aria-label="Nombre" />
          <Stepper value={e.servings} onChange={(v) => setE({ ...e, servings: v })} />
        </div>

        <button className="card fd-cal" onClick={() => setEditOpen(true)}>
          <Flame size={26} />
          <div>
            <span className="muted small">Calorías</span>
            <b>{r0(total.calories)}</b>
          </div>
          <Pencil size={16} className="muted" />
        </button>
        <div className="fd-macros">
          {(
            [
              ['Proteína', total.protein, COLORS.protein, <Beef size={16} />],
              ['Carbos', total.carbs, COLORS.carbs, <Wheat size={16} />],
              ['Grasas', total.fat, COLORS.fat, <Droplet size={16} />],
            ] as const
          ).map(([l, v, c, ic]) => (
            <button className="card" key={l} onClick={() => setEditOpen(true)}>
              <span className="muted small" style={{ color: c }}>
                {ic} {l}
              </span>
              <b>{r0(v)}g</b>
            </button>
          ))}
        </div>
        <div className="card fd-extra">
          <span>
            Fibra <b>{r0(total.fiber)}g</b>
          </span>
          <span>
            Azúcar <b>{r0(total.sugar)}g</b>
          </span>
          <span>
            Sodio <b>{r0(total.sodium)}mg</b>
          </span>
        </div>

        <div className="card health-card">
          <div className="row between">
            <h4>Puntaje de salud</h4>
            <b>{score}/10</b>
          </div>
          <div className="bar">
            <div style={{ width: `${score * 10}%`, background: score >= 7 ? 'var(--accent)' : score >= 4 ? COLORS.carbs : 'var(--danger)' }} />
          </div>
        </div>

        <div className="ing-head">
          <h3>Ingredientes</h3>
          <button
            className="btn small ghost"
            onClick={() => {
              const ings = [...(e.ingredients || []), { name: 'Ingrediente', amount: '', calories: 0, protein: 0, carbs: 0, fat: 0 }];
              recalcFromIngredients(ings);
              setIngOpen(ings.length - 1);
            }}
          >
            <Plus size={14} /> Agregar
          </button>
        </div>
        {(e.ingredients || []).length === 0 && <p className="muted small">Sin desglose de ingredientes.</p>}
        <div className="ing-list">
          {(e.ingredients || []).map((ing, i) => (
            <button className="card ing" key={i} onClick={() => setIngOpen(i)}>
              <div>
                <b>{ing.name}</b>
                <small className="muted">{ing.amount}</small>
              </div>
              <span>{r0(ing.calories)} kcal</span>
            </button>
          ))}
        </div>
      </div>

      <Sheet open={fixOpen} onClose={() => !fixing && setFixOpen(false)} title="Corregir resultado">
        {fixing ? (
          <Spinner label="Corrigiendo…" />
        ) : (
          <>
            <p className="muted small">Contale a la IA qué está mal. Ej.: “eran 2 empanadas, no 1”, “sin queso”, “el arroz era integral”.</p>
            <textarea className="textarea" rows={3} value={fixText} onChange={(ev) => setFixText(ev.target.value)} autoFocus placeholder="Describí la corrección…" />
            <button className="btn primary block" onClick={runFix} disabled={!fixText.trim()}>
              Corregir
            </button>
          </>
        )}
      </Sheet>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Editar valores (por porción)">
        <MacroEditor per={e.per} onChange={(per) => setE({ ...e, per })} />
        <button className="btn primary block" onClick={() => setEditOpen(false)}>
          Listo
        </button>
      </Sheet>

      <Sheet open={ingOpen !== null} onClose={() => setIngOpen(null)} title="Ingrediente">
        {ingOpen !== null && e.ingredients?.[ingOpen] && (
          <>
            <label className="field">
              <span>Nombre</span>
              <input
                value={e.ingredients[ingOpen].name}
                onChange={(ev) => recalcFromIngredients(e.ingredients!.map((x, j) => (j === ingOpen ? { ...x, name: ev.target.value } : x)))}
              />
            </label>
            <label className="field">
              <span>Cantidad</span>
              <input
                value={e.ingredients[ingOpen].amount}
                onChange={(ev) => recalcFromIngredients(e.ingredients!.map((x, j) => (j === ingOpen ? { ...x, amount: ev.target.value } : x)))}
              />
            </label>
            <MacroEditor
              per={e.ingredients[ingOpen]}
              short
              onChange={(m) => recalcFromIngredients(e.ingredients!.map((x, j) => (j === ingOpen ? { ...x, ...m } : x)))}
            />
            <div className="row gap">
              <button
                className="btn ghost"
                onClick={() => {
                  recalcFromIngredients(e.ingredients!.filter((_, j) => j !== ingOpen));
                  setIngOpen(null);
                }}
              >
                <X size={14} /> Quitar
              </button>
              <button className="btn primary grow" onClick={() => setIngOpen(null)}>
                Listo
              </button>
            </div>
          </>
        )}
      </Sheet>
    </Page>
  );
}

export function MacroEditor<T extends Macros>({ per, onChange, short }: { per: T; onChange: (m: T) => void; short?: boolean }) {
  const f = (k: keyof Macros, label: string, suffix: string) => (
    <NumField key={k} label={label} suffix={suffix} value={(per[k] as number) || 0} onChange={(v) => onChange({ ...per, [k]: v })} />
  );
  return (
    <div className="grid2">
      {f('calories', 'Calorías', 'kcal')}
      {f('protein', 'Proteína', 'g')}
      {f('carbs', 'Carbohidratos', 'g')}
      {f('fat', 'Grasas', 'g')}
      {!short && f('fiber', 'Fibra', 'g')}
      {!short && f('sugar', 'Azúcar', 'g')}
      {!short && f('sodium', 'Sodio', 'mg')}
    </div>
  );
}
