import { useMemo, useState } from 'react';
import { Flame, Dumbbell, Apple, Plus, RotateCw, Trash2, Beef, Wheat, Droplet, Sparkles } from 'lucide-react';
import { useStore, streak } from '../lib/store';
import { dayTotals, entryMacros, healthScore, r0 } from '../lib/nutrition';
import { addDays, dayShort, fromKey, hhmm, todayKey } from '../lib/date';
import { Ring, Thumb, COLORS } from '../components/ui';
import type { Nav, Pending } from '../nav';
import type { Entry, FoodEntry } from '../lib/types';

export default function Home({ nav, pending, retry, dismiss, onAdd }: { nav: Nav; pending: Pending[]; retry: (id: string) => void; dismiss: (id: string) => void; onAdd: () => void }) {
  const { state } = useStore();
  const { targets, entries, settings } = state;
  const date = nav.date;
  const [page, setPage] = useState(0);

  const { eaten, burned } = useMemo(() => dayTotals(entries, date), [entries, date]);
  const rollover = useMemo(() => {
    if (!settings.rolloverCalories) return 0;
    const y = addDays(date, -1);
    const prev = dayTotals(entries, y);
    if (!entries.some((e) => e.date === y && e.kind === 'food')) return 0;
    return Math.max(0, Math.min(200, targets.calories - prev.eaten.calories));
  }, [entries, date, settings.rolloverCalories, targets.calories]);

  const goal = targets.calories + (settings.addBurnedCalories ? burned : 0) + rollover;
  const left = goal - eaten.calories;
  const st = streak(entries);

  // semana actual (lunes a domingo) relativa a la fecha elegida
  const week = useMemo(() => {
    const d = fromKey(date);
    const dow = (d.getDay() + 6) % 7;
    const monday = addDays(date, -dow);
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [date]);

  const dayList: Entry[] = entries.filter((e) => e.date === date).sort((a, b) => b.time.localeCompare(a.time));
  const dayPending = pending.filter((p) => p.date === date);
  const today = todayKey();

  const macro = (label: string, val: number, max: number, color: string, unit: string, icon: React.ReactNode) => {
    const rem = max - val;
    return (
      <div className="card macro-card" key={label}>
        <div className="macro-num">
          <b>
            {r0(Math.abs(rem))}
            {unit}
          </b>
          <span>
            {label} {rem >= 0 ? 'restante' : 'de más'}
          </span>
        </div>
        <Ring value={val} max={max} size={76} stroke={7} color={rem < 0 ? 'var(--danger)' : color}>
          <span className="ring-ico" style={{ color }}>
            {icon}
          </span>
        </Ring>
      </div>
    );
  };

  return (
    <div className="home">
      <header className="topbar mobile-only">
        <div className="brand">
          <img src="./icon-192.png" alt="" width={30} height={30} />
          <span>Nutricion</span>
        </div>
        <div className="streak" title="Racha de días registrando">
          <Flame size={18} color="#ff8a3d" fill={st ? '#ff8a3d' : 'none'} />
          {st}
        </div>
      </header>

      <div className="week">
        {week.map((k) => {
          const t = dayTotals(entries, k).eaten.calories;
          const has = t > 0;
          const future = k > today;
          return (
            <button key={k} className={'day' + (k === date ? ' active' : '') + (future ? ' future' : '')} onClick={() => !future && nav.setDate(k)}>
              <span>{dayShort(k)}</span>
              <div className={'day-ring' + (has ? ' has' : '')}>
                <Ring value={t} max={targets.calories} size={34} stroke={3} color={t > targets.calories ? 'var(--danger)' : 'var(--ok)'} track={has ? 'var(--track)' : 'transparent'}>
                  <b>{fromKey(k).getDate()}</b>
                </Ring>
              </div>
            </button>
          );
        })}
      </div>

      <div className="dash-grid">
        <div className="pager" onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
          <div className="pager-page">
            <div className="card cal-card">
              <div>
                <div className="cal-num">{r0(Math.abs(left))}</div>
                <div className="cal-label">{left >= 0 ? 'Calorías restantes' : 'Calorías de más'}</div>
                <div className="cal-sub">
                  <span>
                    <Apple size={14} /> {r0(eaten.calories)} comidas
                  </span>
                  <span>
                    <Dumbbell size={14} /> {r0(burned)} quemadas
                  </span>
                  {rollover > 0 && <span>↪ +{rollover} del día anterior</span>}
                </div>
              </div>
              <Ring value={eaten.calories} max={goal} size={118} stroke={11} color={left < 0 ? 'var(--danger)' : 'var(--accent)'}>
                <Flame size={28} />
              </Ring>
            </div>
            <div className="macro-row">
              {macro('Proteína', eaten.protein, targets.protein, COLORS.protein, 'g', <Beef size={20} />)}
              {macro('Carbos', eaten.carbs, targets.carbs, COLORS.carbs, 'g', <Wheat size={20} />)}
              {macro('Grasas', eaten.fat, targets.fat, COLORS.fat, 'g', <Droplet size={20} />)}
            </div>
          </div>
          <div className="pager-page">
            <div className="macro-row">
              {macro('Fibra', eaten.fiber, targets.fiber, COLORS.fiber, 'g', <span>🥦</span>)}
              {macro('Azúcar', eaten.sugar, targets.sugar, COLORS.sugar, 'g', <span>🍬</span>)}
              {macro('Sodio', eaten.sodium, targets.sodium, COLORS.sodium, 'mg', <span>🧂</span>)}
            </div>
            <div className="card health-card">
              <h4>Puntaje de salud del día</h4>
              <HealthBar entries={dayList} />
            </div>
          </div>
        </div>
        <div className="dots mobile-only">
          <i className={page === 0 ? 'on' : ''} />
          <i className={page === 1 ? 'on' : ''} />
        </div>

        <section className="recent">
          <h3>{date === today ? 'Subido recientemente' : 'Registrado ese día'}</h3>
          {dayPending.map((p) => (
            <div className="card entry pending" key={p.id}>
              <div className="thumb" style={{ width: 84, height: 84 }}>
                <img src={p.imageDataUrl} alt="" />
                {p.status === 'working' && <div className="thumb-progress">{p.progress}%</div>}
              </div>
              <div className="entry-body">
                {p.status === 'working' ? (
                  <>
                    <b>Analizando comida…</b>
                    <div className="skeleton" />
                    <div className="skeleton short" />
                    <small className="muted">Te avisamos cuando termine</small>
                  </>
                ) : (
                  <>
                    <b>No se pudo analizar</b>
                    <small className="err">{p.error}</small>
                    <div className="row gap">
                      <button className="btn small" onClick={() => retry(p.id)}>
                        <RotateCw size={14} /> Reintentar
                      </button>
                      <button className="btn small ghost" onClick={() => dismiss(p.id)}>
                        <Trash2 size={14} /> Descartar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
          {dayList.length === 0 && dayPending.length === 0 && (
            <div className="card empty">
              <p>
                <b>No registraste nada {date === today ? 'hoy' : 'ese día'}</b>
              </p>
              <p className="muted">Empezá a seguir lo que comés sacando una foto rápida.</p>
              <button className="btn primary" onClick={onAdd}>
                <Plus size={18} /> Agregar comida
              </button>
            </div>
          )}
          {dayList.map((e) =>
            e.kind === 'food' ? (
              <button className="card entry" key={e.id} onClick={() => nav.push({ name: 'food', entry: e })}>
                <Thumb imageId={e.imageId} fallback={<span className="thumb-emoji">{e.source === 'barcode' ? '🏷️' : e.source === 'ai' ? '✨' : '🍽️'}</span>} />
                <div className="entry-body">
                  <div className="entry-top">
                    <b className="clip">{e.name}</b>
                    <small>{hhmm(e.time)}</small>
                  </div>
                  <div className="entry-kcal">
                    <Flame size={14} /> {r0(entryMacros(e).calories)} calorías
                    {e.servings !== 1 && <em> · x{e.servings}</em>}
                  </div>
                  <div className="entry-macros">
                    <span style={{ color: COLORS.protein }}>
                      <Beef size={12} /> {r0(entryMacros(e).protein)}g
                    </span>
                    <span style={{ color: COLORS.carbs }}>
                      <Wheat size={12} /> {r0(entryMacros(e).carbs)}g
                    </span>
                    <span style={{ color: COLORS.fat }}>
                      <Droplet size={12} /> {r0(entryMacros(e).fat)}g
                    </span>
                  </div>
                </div>
              </button>
            ) : (
              <div className="card entry" key={e.id}>
                <div className="thumb ex" style={{ width: 84, height: 84 }}>
                  <Dumbbell size={28} />
                </div>
                <div className="entry-body">
                  <div className="entry-top">
                    <b className="clip">{e.name}</b>
                    <small>{hhmm(e.time)}</small>
                  </div>
                  <div className="entry-kcal">
                    <Flame size={14} /> {e.calories} kcal quemadas
                  </div>
                  <small className="muted">
                    {e.minutes} min · intensidad {e.intensity === 'low' ? 'baja' : e.intensity === 'medium' ? 'media' : 'alta'}
                  </small>
                </div>
                <DeleteEx id={e.id} />
              </div>
            )
          )}
          {!state.settings.aiProvider || state.settings.aiProvider === 'none' ? (
            <button className="card hint" onClick={() => nav.push({ name: 'ai' })}>
              <Sparkles size={18} />
              <span>
                <b>Activá el escaneo con IA gratis.</b> Configurá una clave gratuita de Gemini o un modelo local para analizar fotos.
              </span>
            </button>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function DeleteEx({ id }: { id: string }) {
  const { removeEntry } = useStore();
  return (
    <button
      className="icon-btn"
      aria-label="Borrar ejercicio"
      onClick={() => {
        if (confirm('¿Borrar este ejercicio?')) removeEntry(id);
      }}
    >
      <Trash2 size={16} />
    </button>
  );
}

function HealthBar({ entries }: { entries: Entry[] }) {
  const foods = entries.filter((e) => e.kind === 'food') as FoodEntry[];
  if (!foods.length) return <p className="muted small">Registrá comidas para ver tu puntaje.</p>;
  const avg = foods.reduce((a, e) => a + (e.healthScore ?? healthScore(e.per)), 0) / foods.length;
  return (
    <div className="health">
      <div className="bar">
        <div style={{ width: `${avg * 10}%`, background: avg >= 7 ? 'var(--accent)' : avg >= 4 ? COLORS.carbs : 'var(--danger)' }} />
      </div>
      <b>{avg.toFixed(1)}/10</b>
    </div>
  );
}
