import React, { useEffect, useState } from 'react';
import { ArrowLeft, X, Minus, Plus } from 'lucide-react';
import { loadImage } from '../lib/images';

export const COLORS = {
  protein: '#ff5c93',
  carbs: '#f5b14c',
  fat: '#5ab8ff',
  fiber: '#a78bfa',
  sugar: '#fb923c',
  sodium: '#2dd4bf',
};

export function Ring({
  value,
  max,
  size = 120,
  stroke = 10,
  color = 'var(--accent)',
  track = 'var(--track)',
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

export function Page({
  title,
  onBack,
  children,
  right,
  footer,
  close,
}: {
  title?: string;
  onBack: () => void;
  children: React.ReactNode;
  right?: React.ReactNode;
  footer?: React.ReactNode;
  close?: boolean;
}) {
  return (
    <div className="page">
      <header className="page-head">
        <button className="icon-btn" onClick={onBack} aria-label="Volver">
          {close ? <X size={20} /> : <ArrowLeft size={20} />}
        </button>
        <h2>{title}</h2>
        <div className="page-right">{right}</div>
      </header>
      <div className="page-body">{children}</div>
      {footer && <div className="page-foot">{footer}</div>}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="sheet-grip" />
        {title && <h3 className="sheet-title">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function Thumb({ imageId, size = 84, fallback }: { imageId?: string; size?: number; fallback?: React.ReactNode }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    let alive = true;
    if (imageId) loadImage(imageId).then((v) => alive && setSrc(v));
    else setSrc(undefined);
    return () => {
      alive = false;
    };
  }, [imageId]);
  return (
    <div className="thumb" style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" /> : fallback}
    </div>
  );
}

export function Stepper({ value, onChange, step = 0.5, min = 0.25 }: { value: number; onChange: (v: number) => void; step?: number; min?: number }) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} aria-label="Menos">
        <Minus size={16} />
      </button>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v) && v > 0) onChange(v);
        }}
      />
      <button onClick={() => onChange(+(value + step).toFixed(2))} aria-label="Más">
        <Plus size={16} />
      </button>
    </div>
  );
}

export function NumField({
  label,
  value,
  onChange,
  suffix,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
}) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => setTxt(String(value)), [value]);
  return (
    <label className="field">
      <span>{label}</span>
      <div className="field-input">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={txt}
          onChange={(e) => {
            setTxt(e.target.value);
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) onChange(v);
          }}
        />
        {suffix && <em>{suffix}</em>}
      </div>
    </label>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      {label && <p>{label}</p>}
    </div>
  );
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? <div className="toast">{msg}</div> : null;
  return [node, setMsg] as const;
}
