import { useMemo, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { useStore, defaultProfile } from '../lib/store';
import { computeTargets } from '../lib/nutrition';
import type { Diet, Goal, Profile } from '../lib/types';
import { Ring, COLORS } from '../components/ui';
import { todayKey } from '../lib/date';

type Step = 'welcome' | 'sex' | 'workouts' | 'body' | 'birth' | 'goal' | 'target' | 'speed' | 'diet' | 'plan';
const ORDER: Step[] = ['welcome', 'sex', 'workouts', 'body', 'birth', 'goal', 'target', 'speed', 'diet', 'plan'];

function Choice({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub?: string }) {
  return (
    <button className={'choice' + (active ? ' active' : '')} onClick={onClick}>
      <div>
        <strong>{title}</strong>
        {sub && <small>{sub}</small>}
      </div>
      {active && <Check size={18} />}
    </button>
  );
}

export default function Onboarding() {
  const { set } = useStore();
  const [p, setP] = useState<Profile>({ ...defaultProfile });
  const [i, setI] = useState(0);
  const step = ORDER[i];
  const up = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));
  const next = () => setI((n) => Math.min(ORDER.length - 1, n + 1));
  const back = () => setI((n) => Math.max(0, n - 1));
  const plan = useMemo(() => computeTargets(p), [p]);

  const finish = () => {
    set((s) => ({
      ...s,
      onboarded: true,
      profile: p,
      targets: plan,
      weights: [{ date: todayKey(), kg: p.weightKg }],
    }));
  };

  const diff = Math.abs(p.weightKg - p.targetWeightKg);
  const weeks = p.goal === 'maintain' ? 0 : Math.ceil(diff / p.speedKgPerWeek);
  const eta = new Date();
  eta.setDate(eta.getDate() + weeks * 7);

  const body = (() => {
    switch (step) {
      case 'welcome':
        return (
          <div className="ob-welcome">
            <img src="./icon-512.png" alt="" width={96} height={96} />
            <h1>Contar calorías, ahora fácil</h1>
            <p>Sacale una foto a tu comida y Nutricion estima calorías y macros. Gratis, sin cuentas y con tus datos guardados solo en tu dispositivo.</p>
          </div>
        );
      case 'sex':
        return (
          <>
            <h1>Elegí tu sexo</h1>
            <p className="muted">Lo usamos para calcular tu plan personalizado.</p>
            <div className="choices">
              <Choice active={p.sex === 'male'} onClick={() => up({ sex: 'male' })} title="Masculino" />
              <Choice active={p.sex === 'female'} onClick={() => up({ sex: 'female' })} title="Femenino" />
            </div>
          </>
        );
      case 'workouts':
        return (
          <>
            <h1>¿Cuántos entrenamientos hacés por semana?</h1>
            <p className="muted">Para ajustar tu gasto diario.</p>
            <div className="choices">
              <Choice active={p.workoutsPerWeek === 0} onClick={() => up({ workoutsPerWeek: 0 })} title="0 – 2" sub="De vez en cuando" />
              <Choice active={p.workoutsPerWeek === 3} onClick={() => up({ workoutsPerWeek: 3 })} title="3 – 5" sub="Algunas veces por semana" />
              <Choice active={p.workoutsPerWeek === 6} onClick={() => up({ workoutsPerWeek: 6 })} title="6 o más" sub="Atleta dedicado" />
            </div>
          </>
        );
      case 'body':
        return (
          <>
            <h1>Altura y peso</h1>
            <p className="muted">Para calcular tu metabolismo basal.</p>
            <div className="picker-row">
              <label className="big-num">
                <span>Altura</span>
                <input type="number" inputMode="numeric" value={p.heightCm} onChange={(e) => up({ heightCm: +e.target.value || 0 })} />
                <em>cm</em>
              </label>
              <label className="big-num">
                <span>Peso</span>
                <input type="number" inputMode="decimal" value={p.weightKg} onChange={(e) => up({ weightKg: +e.target.value || 0 })} />
                <em>kg</em>
              </label>
            </div>
          </>
        );
      case 'birth':
        return (
          <>
            <h1>¿Cuándo naciste?</h1>
            <p className="muted">La edad cambia cuántas calorías quemás.</p>
            <input className="date-input" type="date" value={p.birthDate} max={todayKey()} onChange={(e) => up({ birthDate: e.target.value })} />
          </>
        );
      case 'goal':
        return (
          <>
            <h1>¿Cuál es tu objetivo?</h1>
            <p className="muted">Generamos un plan según tu meta.</p>
            <div className="choices">
              {(
                [
                  ['lose', 'Bajar de peso'],
                  ['maintain', 'Mantener'],
                  ['gain', 'Subir de peso'],
                ] as [Goal, string][]
              ).map(([g, t]) => (
                <Choice
                  key={g}
                  active={p.goal === g}
                  onClick={() =>
                    up({
                      goal: g,
                      targetWeightKg: g === 'maintain' ? p.weightKg : g === 'lose' ? Math.round(p.weightKg - 5) : Math.round(p.weightKg + 5),
                    })
                  }
                  title={t}
                />
              ))}
            </div>
          </>
        );
      case 'target':
        return (
          <>
            <h1>¿Cuál es tu peso deseado?</h1>
            <label className="big-num single">
              <input
                type="number"
                inputMode="decimal"
                value={p.targetWeightKg}
                onChange={(e) => up({ targetWeightKg: +e.target.value || 0 })}
              />
              <em>kg</em>
            </label>
            <p className="muted center">
              {p.goal === 'maintain'
                ? 'Mantener tu peso actual.'
                : `${p.goal === 'lose' ? 'Bajar' : 'Subir'} ${diff.toFixed(1)} kg es un objetivo realista. ¡Vamos!`}
            </p>
          </>
        );
      case 'speed':
        return (
          <>
            <h1>¿Qué tan rápido querés llegar?</h1>
            <p className="muted">Velocidad de {p.goal === 'gain' ? 'aumento' : 'descenso'} por semana</p>
            <div className="speed-val">{p.speedKgPerWeek.toFixed(1)} kg</div>
            <input
              className="range"
              type="range"
              min={0.1}
              max={1.5}
              step={0.1}
              value={p.speedKgPerWeek}
              onChange={(e) => up({ speedKgPerWeek: +e.target.value })}
            />
            <div className="range-labels">
              <span>🐢 0.1</span>
              <span>🐇 0.8</span>
              <span>🐆 1.5</span>
            </div>
            <p className="muted center">{p.speedKgPerWeek <= 0.8 ? 'Recomendado: sostenible a largo plazo.' : 'Rápido: puede costar más sostenerlo.'}</p>
          </>
        );
      case 'diet':
        return (
          <>
            <h1>¿Seguís alguna dieta específica?</h1>
            <div className="choices">
              {(
                [
                  ['classic', 'Clásica'],
                  ['pescatarian', 'Pescetariana'],
                  ['vegetarian', 'Vegetariana'],
                  ['vegan', 'Vegana'],
                  ['keto', 'Keto'],
                ] as [Diet, string][]
              ).map(([d, t]) => (
                <Choice key={d} active={p.diet === d} onClick={() => up({ diet: d })} title={t} />
              ))}
            </div>
          </>
        );
      case 'plan':
        return (
          <>
            <div className="plan-head">
              <div className="check-badge">
                <Check size={22} />
              </div>
              <h1>¡Tu plan personalizado está listo!</h1>
              {p.goal !== 'maintain' && (
                <p className="muted center">
                  Deberías {p.goal === 'lose' ? 'bajar' : 'subir'} a <b>{p.targetWeightKg} kg</b> para el{' '}
                  <b>{eta.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</b>
                </p>
              )}
            </div>
            <div className="card">
              <h3>Recomendación diaria</h3>
              <p className="muted small">Podés editarla cuando quieras en Ajustes.</p>
              <div className="plan-grid">
                <PlanRing label="Calorías" value={plan.calories} unit="" color="var(--accent)" />
                <PlanRing label="Carbohidratos" value={plan.carbs} unit="g" color={COLORS.carbs} />
                <PlanRing label="Proteína" value={plan.protein} unit="g" color={COLORS.protein} />
                <PlanRing label="Grasas" value={plan.fat} unit="g" color={COLORS.fat} />
              </div>
            </div>
            <div className="card tips">
              <h3>Cómo llegar a tu meta</h3>
              <ul>
                <li>📸 Registrá tus comidas con una foto o buscándolas.</li>
                <li>🔥 Respetá tu objetivo diario de calorías.</li>
                <li>⚖️ Equilibrá carbohidratos, proteínas y grasas.</li>
                <li>📈 Registrá tu peso para ver el progreso.</li>
              </ul>
            </div>
          </>
        );
    }
  })();

  return (
    <div className="onboarding">
      <div className="ob-top">
        {i > 0 ? (
          <button className="icon-btn" onClick={back} aria-label="Volver">
            <ArrowLeft size={20} />
          </button>
        ) : (
          <span />
        )}
        <div className="ob-progress">
          <div style={{ width: `${(i / (ORDER.length - 1)) * 100}%` }} />
        </div>
      </div>
      <div className="ob-body">{body}</div>
      <div className="ob-foot">
        <button className="btn primary block" onClick={step === 'plan' ? finish : next}>
          {step === 'welcome' ? 'Empezar' : step === 'plan' ? 'Comenzar' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}

function PlanRing({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="plan-item">
      <span>{label}</span>
      <Ring value={0.75} max={1} size={78} stroke={7} color={color}>
        <b>
          {value}
          {unit}
        </b>
      </Ring>
    </div>
  );
}
