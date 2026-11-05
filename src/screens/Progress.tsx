import { useMemo, useState } from 'react';
import { Flame, Scale, Target } from 'lucide-react';
import { useStore, streak } from '../lib/store';
import { addDays, shortDate, todayKey, dayShort } from '../lib/date';
import { bmi, bmiLabel, dayTotals, r1 } from '../lib/nutrition';
import { Sheet, NumField } from '../components/ui';
import type { Nav } from '../nav';

const RANGES = [
  ['90 días', 90],
  ['6 meses', 182],
  ['1 año', 365],
  ['Todo', 100000],
] as const;

export default function Progress({ nav }: { nav: Nav }) {
  const { state, logWeight } = useStore();
  const { profile, weights, entries, targets } = state;
  const [range, setRange] = useState<number>(90);
  const [open, setOpen] = useState(false);
  const [w, setW] = useState(profile.weightKg);
  const [weekOffset, setWeekOffset] = useState(0);

  const start = weights[0]?.kg ?? profile.weightKg;
  const current = profile.weightKg;
  const goalDiff = Math.abs(start - profile.targetWeightKg);
  const done = Math.abs(start - current);
  const pct = goalDiff > 0 ? Math.min(100, Math.round((done / goalDiff) * 100)) : 100;
  const b = bmi(current, profile.heightCm);
  const bl = bmiLabel(b);

  const series = useMemo(() => {
    const from = addDays(todayKey(), -range);
    return weights.filter((x) => x.date >= from);
  }, [weights, range]);

  const week = useMemo(() => {
    const t = todayKey();
    const d = new Date();
    const dow = (d.getDay() + 6) % 7;
    const monday = addDays(t, -dow - weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const k = addDays(monday, i);
      const { eaten } = dayTotals(entries, k);
      return { k, ...eaten };
    });
  }, [entries, weekOffset]);
  const weekTotal = week.reduce((a, d) => a + d.calories, 0);
  const daysLogged = week.filter((d) => d.calories > 0).length;

  return (
    <div className="progress">
      <h1 className="screen-title">Progreso</h1>
      <div className="prog-grid">
        <div className="card weight-card">
          <span className="muted small">
            <Scale size={14} /> Mi peso
          </span>
          <div className="big">{r1(current)} kg</div>
          <div className="goalbar">
            <div style={{ width: `${pct}%` }} />
          </div>
          <span className="muted small">
            <Target size={14} /> Objetivo {profile.targetWeightKg} kg · {pct}% completado
          </span>
          <button className="btn primary block" onClick={() => (setW(current), setOpen(true))}>
            Registrar peso
          </button>
        </div>
        <div className="card streak-card">
          <Flame size={40} color="#ff8a3d" fill="#ff8a3d" />
          <div className="big">{streak(entries)}</div>
          <span className="muted">días de racha</span>
        </div>
      </div>

      <div className="card">
        <div className="row between">
          <h3>Progreso del peso</h3>
        </div>
        <div className="tabs small">
          {RANGES.map(([l, v]) => (
            <button key={l} className={range === v ? 'on' : ''} onClick={() => setRange(v)}>
              {l}
            </button>
          ))}
        </div>
        <WeightChart data={series} goal={profile.targetWeightKg} />
      </div>

      <div className="card">
        <h3>Calorías de la semana</h3>
        <div className="tabs small">
            {['Esta', 'Pasada', 'Hace 2', 'Hace 3'].map((l, i) => (
              <button key={l} className={weekOffset === i ? 'on' : ''} onClick={() => setWeekOffset(i)}>
                {l}
              </button>
            ))}
        </div>
        <p className="muted small">
          Total {Math.round(weekTotal)} kcal · promedio {daysLogged ? Math.round(weekTotal / daysLogged) : 0} kcal/día registrado
        </p>
        <WeekBars data={week} target={targets.calories} />
      </div>

      <div className="card">
        <h3>Tu IMC</h3>
        <div className="bmi-row">
          <b className="big">{b.toFixed(1)}</b>
          <span className="pill" style={{ background: bl.color }}>
            {bl.label}
          </span>
        </div>
        <div className="bmi-scale">
          <i style={{ background: '#4aa8ff', flex: 3.5 }} />
          <i style={{ background: '#3ddc84', flex: 6.5 }} />
          <i style={{ background: '#f5b335', flex: 5 }} />
          <i style={{ background: '#ff5d5d', flex: 10 }} />
          <span className="bmi-marker" style={{ left: `${Math.max(0, Math.min(100, ((b - 15) / 25) * 100))}%` }} />
        </div>
        <div className="bmi-legend muted small">
          <span>Bajo &lt;18.5</span>
          <span>Normal 18.5–25</span>
          <span>Sobrepeso 25–30</span>
          <span>Obesidad &gt;30</span>
        </div>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Registrar peso de hoy">
        <NumField label="Peso" value={w} onChange={setW} suffix="kg" step={0.1} />
        <button
          className="btn primary block"
          onClick={() => {
            if (w > 20 && w < 400) {
              logWeight(r1(w));
              setOpen(false);
              nav.toast('Peso registrado');
            }
          }}
        >
          Guardar
        </button>
      </Sheet>
    </div>
  );
}

function WeightChart({ data, goal }: { data: { date: string; kg: number }[]; goal: number }) {
  if (data.length < 2)
    return <p className="muted small center pad">Registrá tu peso al menos dos días para ver el gráfico.</p>;
  const W = 600;
  const H = 200;
  const P = 32;
  const vals = data.map((d) => d.kg).concat(goal);
  const min = Math.floor(Math.min(...vals) - 1);
  const max = Math.ceil(Math.max(...vals) + 1);
  const t0 = new Date(data[0].date).getTime();
  const t1 = new Date(data[data.length - 1].date).getTime();
  const x = (d: string) => P + ((new Date(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - P * 2);
  const y = (v: number) => H - P + -((v - min) / (max - min)) * (H - P * 2);
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(d.date).toFixed(1)},${y(d.kg).toFixed(1)}`).join(' ');
  const ticks = [min, (min + max) / 2, max];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Gráfico de peso">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={P} x2={W - P} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray="4 4" />
          <text x={4} y={y(t) + 4} className="axis">
            {t.toFixed(0)}
          </text>
        </g>
      ))}
      <line x1={P} x2={W - P} y1={y(goal)} y2={y(goal)} stroke="var(--ok)" strokeWidth={1.5} strokeDasharray="6 4" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" />
      {data.map((d) => (
        <circle key={d.date} cx={x(d.date)} cy={y(d.kg)} r={3.5} fill="var(--accent)">
          <title>
            {shortDate(d.date)}: {d.kg} kg
          </title>
        </circle>
      ))}
      <text x={P} y={H - 6} className="axis">
        {shortDate(data[0].date)}
      </text>
      <text x={W - P} y={H - 6} className="axis" textAnchor="end">
        {shortDate(data[data.length - 1].date)}
      </text>
    </svg>
  );
}

function WeekBars({ data, target }: { data: { k: string; calories: number; protein: number; carbs: number; fat: number }[]; target: number }) {
  const max = Math.max(target * 1.2, ...data.map((d) => d.calories));
  return (
    <div className="bars">
      <div className="bars-target" style={{ bottom: `${(target / max) * 100}%` }}>
        <span>{target}</span>
      </div>
      {data.map((d) => {
        const total = d.protein * 4 + d.carbs * 4 + d.fat * 9 || 1;
        const h = (d.calories / max) * 100;
        return (
          <div className="bar-col" key={d.k} title={`${Math.round(d.calories)} kcal`}>
            <div className="bar-stack" style={{ height: `${h}%` }}>
              <i style={{ flex: (d.fat * 9) / total, background: '#5ab8ff' }} />
              <i style={{ flex: (d.carbs * 4) / total, background: '#f5b14c' }} />
              <i style={{ flex: (d.protein * 4) / total, background: '#ff5c93' }} />
            </div>
            <span>{dayShort(d.k)}</span>
          </div>
        );
      })}
    </div>
  );
}
