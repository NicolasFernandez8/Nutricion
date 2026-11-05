import { get, set, del } from 'idb-keyval';
import { uid } from './date';

/** Lee un File/Blob y lo reduce a JPEG (máx `max` px) devolviendo dataURL. */
export async function resizeImage(file: Blob, max = 1024, quality = 0.82): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function storeImage(dataUrl: string): Promise<string> {
  const id = 'img_' + uid();
  // miniatura para la lista (más liviana)
  const blob = await (await fetch(dataUrl)).blob();
  const thumb = await resizeImage(blob, 480, 0.78);
  await set(id, thumb);
  return id;
}

const cache = new Map<string, string>();
export async function loadImage(id: string): Promise<string | undefined> {
  if (cache.has(id)) return cache.get(id);
  const v = (await get(id)) as string | undefined;
  if (v) cache.set(id, v);
  return v;
}

export async function deleteImage(id?: string) {
  if (!id) return;
  cache.delete(id);
  await del(id);
}

export async function putImage(id: string, dataUrl: string) {
  cache.set(id, dataUrl);
  await set(id, dataUrl);
}
