import { useEffect, useRef, useState } from 'react';
import { X, Image as ImageIcon, ScanLine, Utensils, Zap, ZapOff } from 'lucide-react';
import type { Nav } from '../nav';
import { resizeImage } from '../lib/images';
import { decodeBarcodeFromImage, scanLive } from '../lib/barcode';
import { productByBarcode, scale } from '../lib/off';
import { useStore } from '../lib/store';
import { aiReady } from '../lib/ai';
import { uid } from '../lib/date';
import { Spinner } from '../components/ui';
import type { FoodEntry } from '../lib/types';

function camMsg(e: any): string {
  const n = e?.name || '';
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'No diste permiso para usar la cámara.';
  if (n === 'NotFoundError' || n === 'OverconstrainedError' || /not found/i.test(e?.message || '')) return 'No se encontró una cámara en este dispositivo.';
  if (n === 'NotReadableError') return 'La cámara está siendo usada por otra app.';
  return 'No se pudo abrir la cámara.';
}

export default function Camera({ nav, mode: initialMode }: { nav: Nav; mode: 'food' | 'barcode' }) {
  const { state } = useStore();
  const [mode, setMode] = useState(initialMode);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [noAi, setNoAi] = useState<string | null>(null);
  const handled = useRef(false);

  // cámara para modo comida
  useEffect(() => {
    if (mode !== 'food') return;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Cámara no disponible');
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play().catch(() => {});
        }
        setCamError(null);
      } catch (e: any) {
        setCamError(camMsg(e));
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [mode]);

  // escaneo en vivo para código de barras
  useEffect(() => {
    if (mode !== 'barcode' || !videoRef.current) return;
    handled.current = false;
    const stop = scanLive(
      videoRef.current,
      (code) => {
        if (handled.current) return;
        handled.current = true;
        lookup(code);
      },
      (e: any) => setCamError(camMsg(e))
    );
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0] || (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0];
    try {
      await track?.applyConstraints({ advanced: [{ torch: !torch } as any] });
      setTorch(!torch);
    } catch {
      nav.toast('Tu dispositivo no permite controlar el flash');
    }
  };

  async function lookup(code: string) {
    setBusy(`Buscando ${code}…`);
    try {
      const p = await productByBarcode(code);
      if (!p) {
        setBusy(null);
        handled.current = false;
        nav.toast('Producto no encontrado en Open Food Facts. Cargalo a mano.');
        nav.replace({ name: 'manual' });
        return;
      }
      const entry: FoodEntry = {
        id: uid(),
        kind: 'food',
        date: nav.date,
        time: new Date().toISOString(),
        name: p.brand ? `${p.name} (${p.brand})` : p.name,
        servings: 1,
        per: scale(p.per100, p.servingGrams),
        source: 'barcode',
        barcode: code,
        note: `Porción: ${p.servingLabel}`,
      };
      nav.replace({ name: 'food', entry, isNew: true });
    } catch {
      setBusy(null);
      handled.current = false;
      nav.toast('Sin conexión: no se pudo consultar el producto');
    }
  }

  async function handleImage(dataUrl: string) {
    if (mode === 'barcode') {
      setBusy('Leyendo código…');
      const code = await decodeBarcodeFromImage(dataUrl);
      if (!code) {
        setBusy(null);
        nav.toast('No se detectó un código de barras. Probá acercarte más.');
        return;
      }
      return lookup(code);
    }
    if (!aiReady(state.settings)) {
      setNoAi(dataUrl);
      return;
    }
    nav.analyzePhoto(dataUrl);
    nav.pop();
  }

  const capture = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return fileRef.current?.click();
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.9));
    handleImage(await resizeImage(blob));
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    handleImage(await resizeImage(f));
  };

  if (noAi) {
    return (
      <div className="page">
        <div className="page-body center-col">
          <img src={noAi} alt="" className="preview" />
          <h2>La IA no está configurada</h2>
          <p className="muted center">
            Para que Nutricion reconozca la comida de la foto necesitás activar un proveedor de IA gratuito (Gemini) o un modelo local. Mientras tanto podés buscar el alimento y adjuntar la foto.
          </p>
          <button className="btn primary block" onClick={() => nav.replace({ name: 'ai' })}>
            Configurar IA gratis
          </button>
          <button className="btn block" onClick={() => nav.replace({ name: 'search', imageDataUrl: noAi })}>
            Buscar el alimento
          </button>
          <button className="btn ghost block" onClick={() => nav.pop()}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="camera">
      <video ref={videoRef} playsInline muted autoPlay />
      <div className={'cam-frame ' + mode}>
        <i />
        <i />
        <i />
        <i />
      </div>
      <header className="cam-top">
        <button className="icon-btn dark" onClick={nav.pop} aria-label="Cerrar">
          <X size={22} />
        </button>
        <b>{mode === 'food' ? 'Escanear comida' : 'Código de barras'}</b>
        <button className="icon-btn dark" onClick={toggleTorch} aria-label="Flash">
          {torch ? <Zap size={20} /> : <ZapOff size={20} />}
        </button>
      </header>
      {camError && (
        <div className="cam-error">
          <p>{camError}</p>
          <p className="small">Podés elegir una foto de la galería o sacarla con la cámara del sistema.</p>
          <button className="btn primary" onClick={() => fileRef.current?.click()}>
            Abrir cámara / galería
          </button>
        </div>
      )}
      {busy && (
        <div className="cam-busy">
          <Spinner label={busy} />
        </div>
      )}
      <footer className="cam-bottom">
        <div className="cam-modes">
          <button className={mode === 'food' ? 'on' : ''} onClick={() => setMode('food')}>
            <Utensils size={18} /> Comida
          </button>
          <button className={mode === 'barcode' ? 'on' : ''} onClick={() => setMode('barcode')}>
            <ScanLine size={18} /> Código
          </button>
          <button onClick={() => fileRef.current?.click()}>
            <ImageIcon size={18} /> Galería
          </button>
        </div>
        <div className="cam-shutter-row">
          <button className="shutter" onClick={capture} aria-label="Sacar foto" />
        </div>
      </footer>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
    </div>
  );
}
