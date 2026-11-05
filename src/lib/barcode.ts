import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';

const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
]);
hints.set(DecodeHintType.TRY_HARDER, true);

/** Decodifica un código de barras desde una imagen (dataURL). */
export async function decodeBarcodeFromImage(dataUrl: string): Promise<string | null> {
  // 1) API nativa si existe (Chrome/Android)
  const BD = (window as any).BarcodeDetector;
  if (BD) {
    try {
      const det = new BD({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const r = await det.detect(img);
      if (r?.[0]?.rawValue) return r[0].rawValue;
    } catch {
      /* sigue con zxing */
    }
  }
  // 2) ZXing (funciona en todos lados)
  try {
    const reader = new BrowserMultiFormatReader(hints);
    const res = await reader.decodeFromImageUrl(dataUrl);
    return res.getText();
  } catch {
    return null;
  }
}

/** Escaneo en vivo con la cámara. Devuelve una función para detener. */
export function scanLive(video: HTMLVideoElement, onCode: (c: string) => void, onError: (e: unknown) => void): () => void {
  const reader = new BrowserMultiFormatReader(hints, 300);
  let stopped = false;
  reader
    .decodeFromConstraints({ video: { facingMode: 'environment' } }, video, (res) => {
      if (res && !stopped) {
        stopped = true;
        onCode(res.getText());
        reader.reset();
      }
    })
    .catch(onError);
  return () => {
    stopped = true;
    reader.reset();
  };
}
