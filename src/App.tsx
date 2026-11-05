import { useCallback, useEffect, useRef, useState } from 'react';
import { Home as HomeIcon, BarChart3, Settings as Cog, Plus, Camera as CamIcon, ScanBarcode, Search, Dumbbell, Bookmark, Sparkles, PenLine, Flame } from 'lucide-react';
import { StoreProvider, useStore, streak } from './lib/store';
import { todayKey, uid } from './lib/date';
import { analyzeFoodImage, aiReady } from './lib/ai';
import { storeImage } from './lib/images';
import type { Nav, Pending, Route } from './nav';
import { Sheet, useToast } from './components/ui';
import Onboarding from './screens/Onboarding';
import Home from './screens/Home';
import Progress from './screens/Progress';
import Settings, { AiSettings, ProfileEdit, TargetsEdit } from './screens/Settings';
import Camera from './screens/Camera';
import FoodDetail from './screens/FoodDetail';
import { DescribeFood, ExerciseLog, ManualFood, SearchFood } from './screens/Logging';

type Tab = 'home' | 'progress' | 'settings';

function Shell() {
  const { state, addEntry } = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const [stack, setStack] = useState<Route[]>([]);
  const [date, setDate] = useState(todayKey());
  const [addOpen, setAddOpen] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [toastNode, toast] = useToast();
  const settingsRef = useRef(state.settings);
  settingsRef.current = state.settings;

  // tema
  useEffect(() => {
    const el = document.documentElement;
    if (state.settings.theme === 'system') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', state.settings.theme);
  }, [state.settings.theme]);

  const runAnalysis = useCallback(
    async (p: Pending) => {
      const tick = setInterval(() => {
        setPending((list) => list.map((x) => (x.id === p.id && x.status === 'working' ? { ...x, progress: Math.min(95, x.progress + Math.ceil((100 - x.progress) / 8)) } : x)));
      }, 500);
      try {
        const r = await analyzeFoodImage(settingsRef.current, p.imageDataUrl, p.hint);
        if (!r.isFood) throw new Error('No parece comida. Probá con otra foto.');
        const imageId = await storeImage(p.imageDataUrl);
        addEntry({
          id: uid(),
          kind: 'food',
          date: p.date,
          time: new Date().toISOString(),
          name: r.name,
          servings: 1,
          per: r.per,
          ingredients: r.ingredients,
          healthScore: r.healthScore,
          imageId,
          source: 'ai',
        });
        setPending((list) => list.filter((x) => x.id !== p.id));
        toast(`✨ ${r.name}: ${r.per.calories} kcal`);
      } catch (e: any) {
        setPending((list) => list.map((x) => (x.id === p.id ? { ...x, status: 'error', error: e?.message || 'Error' } : x)));
      } finally {
        clearInterval(tick);
      }
    },
    [addEntry, toast]
  );

  const nav: Nav = {
    push: (r) => setStack((s) => [...s, r]),
    pop: () => setStack((s) => s.slice(0, -1)),
    replace: (r) => setStack((s) => [...s.slice(0, -1), r]),
    date,
    setDate,
    toast,
    analyzePhoto: (imageDataUrl, hint) => {
      const p: Pending = { id: uid(), date, imageDataUrl, hint, status: 'working', progress: 5 };
      setPending((l) => [p, ...l]);
      setTab('home');
      runAnalysis(p);
    },
  };

  // botón atrás de Android
  const backRef = useRef<() => boolean>(() => false);
  backRef.current = () => {
    if (addOpen) return setAddOpen(false), true;
    if (stack.length) return nav.pop(), true;
    if (tab !== 'home') return setTab('home'), true;
    return false;
  };
  useEffect(() => {
    let remove: (() => void) | undefined;
    import('@capacitor/core').then(async ({ Capacitor }) => {
      if (!Capacitor.isNativePlatform()) return;
      const { App } = await import('@capacitor/app');
      const h = await App.addListener('backButton', () => {
        if (!backRef.current()) App.exitApp();
      });
      remove = () => h.remove();
    });
    return () => remove?.();
  }, []);

  if (!state.onboarded) return <Onboarding />;

  const top = stack[stack.length - 1];
  const open = (r: Route) => {
    setAddOpen(false);
    nav.push(r);
  };

  const screen = (() => {
    if (!top) return null;
    switch (top.name) {
      case 'food':
        return <FoodDetail key={top.entry.id} nav={nav} entry={top.entry} isNew={top.isNew} />;
      case 'camera':
        return <Camera nav={nav} mode={top.mode} />;
      case 'search':
        return <SearchFood nav={nav} imageDataUrl={top.imageDataUrl} />;
      case 'describe':
        return <DescribeFood nav={nav} />;
      case 'manual':
        return <ManualFood nav={nav} />;
      case 'exercise':
        return <ExerciseLog nav={nav} />;
      case 'saved':
        return <SearchFood nav={nav} initialTab="saved" />;
      case 'targets':
        return <TargetsEdit nav={nav} />;
      case 'profile':
        return <ProfileEdit nav={nav} />;
      case 'ai':
        return <AiSettings nav={nav} />;
    }
  })();

  const st = streak(state.entries);
  const ai = aiReady(state.settings);

  return (
    <div className="app">
      <aside className="sidenav">
        <div className="brand">
          <img src="./icon-192.png" alt="" width={34} height={34} />
          <span>Nutricion</span>
        </div>
        <NavButtons tab={tab} setTab={(t) => (setStack([]), setTab(t))} />
        <button className="btn primary block" onClick={() => setAddOpen(true)}>
          <Plus size={18} /> Registrar
        </button>
        <div className="streak big-streak">
          <Flame size={18} color="#ff8a3d" fill={st ? '#ff8a3d' : 'none'} /> {st} {st === 1 ? 'día' : 'días'} de racha
        </div>
      </aside>

      <main className="main">
        {tab === 'home' && <Home nav={nav} pending={pending} onAdd={() => setAddOpen(true)} retry={(id) => {
          const p = pending.find((x) => x.id === id);
          if (!p) return;
          const np = { ...p, status: 'working' as const, progress: 5, error: undefined };
          setPending((l) => l.map((x) => (x.id === id ? np : x)));
          runAnalysis(np);
        }} dismiss={(id) => setPending((l) => l.filter((x) => x.id !== id))} />}
        {tab === 'progress' && <Progress nav={nav} />}
        {tab === 'settings' && <Settings nav={nav} />}
      </main>

      <nav className="tabbar">
        <NavButtons tab={tab} setTab={setTab} />
        <button className="fab" onClick={() => setAddOpen(true)} aria-label="Registrar">
          <Plus size={28} />
        </button>
      </nav>

      {top && <div className="overlay">{screen}</div>}

      <Sheet open={addOpen} onClose={() => setAddOpen(false)}>
        <div className="add-grid">
          <button onClick={() => open({ name: 'camera', mode: 'food' })}>
            <CamIcon size={26} />
            <span>Escanear comida</span>
            {!ai && <small>requiere IA</small>}
          </button>
          <button onClick={() => open({ name: 'camera', mode: 'barcode' })}>
            <ScanBarcode size={26} />
            <span>Código de barras</span>
          </button>
          <button onClick={() => open({ name: 'search' })}>
            <Search size={26} />
            <span>Base de alimentos</span>
          </button>
          <button onClick={() => open({ name: 'exercise' })}>
            <Dumbbell size={26} />
            <span>Registrar ejercicio</span>
          </button>
          <button onClick={() => open(ai ? { name: 'describe' } : { name: 'ai' })}>
            <Sparkles size={26} />
            <span>Describir comida</span>
            {!ai && <small>requiere IA</small>}
          </button>
          <button onClick={() => open({ name: 'saved' })}>
            <Bookmark size={26} />
            <span>Alimentos guardados</span>
          </button>
          <button onClick={() => open({ name: 'manual' })}>
            <PenLine size={26} />
            <span>Entrada manual</span>
          </button>
        </div>
      </Sheet>
      {toastNode}
    </div>
  );
}

function NavButtons({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="navbtns">
      <button className={tab === 'home' ? 'on' : ''} onClick={() => setTab('home')}>
        <HomeIcon size={22} />
        <span>Inicio</span>
      </button>
      <button className={tab === 'progress' ? 'on' : ''} onClick={() => setTab('progress')}>
        <BarChart3 size={22} />
        <span>Progreso</span>
      </button>
      <button className={tab === 'settings' ? 'on' : ''} onClick={() => setTab('settings')}>
        <Cog size={22} />
        <span>Ajustes</span>
      </button>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
