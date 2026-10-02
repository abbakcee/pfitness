const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const MAX_ORIGINAL_PHOTO_BYTES = 10_000_000;
export const MAX_PROFILE_PHOTO_DIMENSION = 960;
export const TARGET_PROFILE_PHOTO_BYTES = 300_000;

const MIN_PROFILE_PHOTO_DIMENSION = 720;
const PREPARED_FILE_PREFIX = 'pfitness-profile-';

export type PhotoProgress = (progress: number, message: string) => void;

export interface PreparedProfilePhoto {
  file: File;
  width: number;
  height: number;
  originalBytes: number;
  compressedBytes: number;
}

export function validateProfilePhoto(file: File) {
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error('Use a JPG, PNG or WebP image. Other file types are not supported.');
  }
  if (file.size === 0) throw new Error('That image is empty. Please choose another photo.');
  if (file.size > MAX_ORIGINAL_PHOTO_BYTES) {
    throw new Error('The original photo must be 10 MB or smaller.');
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The photo could not be compressed.')), type, quality);
  });
}

async function decodeImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Older Safari versions can reject the imageOrientation option. The image-element fallback preserves EXIF orientation.
    }
  }

  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  try {
    await image.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('That image could not be opened. Please choose another JPG, PNG or WebP photo.');
  }
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    close: () => URL.revokeObjectURL(url),
  };
}

function render(source: CanvasImageSource, sourceWidth: number, sourceHeight: number, longestSide: number) {
  const scale = Math.min(1, longestSide / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('This browser cannot process photos. Please try another browser.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

export function isPreparedProfilePhoto(file: File) {
  return file.name.startsWith(PREPARED_FILE_PREFIX)
    && (file.type === 'image/webp' || file.type === 'image/jpeg')
    && file.size <= TARGET_PROFILE_PHOTO_BYTES + 50_000;
}

export async function compressProfilePhoto(file: File, onProgress?: PhotoProgress): Promise<PreparedProfilePhoto> {
  validateProfilePhoto(file);
  onProgress?.(8, 'Checking photo…');

  const decoded = await decodeImage(file);
  if (!decoded.width || !decoded.height) {
    decoded.close();
    throw new Error('That image has invalid dimensions. Please choose another photo.');
  }

  onProgress?.(25, 'Resizing photo…');
  try {
    const attempts = [
      { longestSide: MAX_PROFILE_PHOTO_DIMENSION, quality: 0.86 },
      { longestSide: MAX_PROFILE_PHOTO_DIMENSION, quality: 0.78 },
      { longestSide: MAX_PROFILE_PHOTO_DIMENSION, quality: 0.7 },
      { longestSide: 840, quality: 0.72 },
      { longestSide: MIN_PROFILE_PHOTO_DIMENSION, quality: 0.68 },
      { longestSide: MIN_PROFILE_PHOTO_DIMENSION, quality: 0.6 },
    ];

    let best: { blob: Blob; width: number; height: number; type: string } | null = null;
    for (let index = 0; index < attempts.length; index += 1) {
      const attempt = attempts[index];
      const canvas = render(decoded.source, decoded.width, decoded.height, attempt.longestSide);
      onProgress?.(40 + Math.round(((index + 1) / attempts.length) * 50), 'Compressing photo…');
      let blob = await canvasToBlob(canvas, 'image/webp', attempt.quality);
      let type = 'image/webp';
      if (blob.type !== 'image/webp') {
        blob = await canvasToBlob(canvas, 'image/jpeg', attempt.quality);
        type = 'image/jpeg';
      }
      if (!best || blob.size < best.blob.size) best = { blob, width: canvas.width, height: canvas.height, type };
      if (blob.size <= TARGET_PROFILE_PHOTO_BYTES) break;
    }

    if (!best) throw new Error('The photo could not be compressed. Please try another image.');
    const extension = best.type === 'image/webp' ? 'webp' : 'jpg';
    const prepared = new File([best.blob], `${PREPARED_FILE_PREFIX}${crypto.randomUUID()}.${extension}`, {
      type: best.type,
      lastModified: Date.now(),
    });
    onProgress?.(100, 'Photo ready');
    return {
      file: prepared,
      width: best.width,
      height: best.height,
      originalBytes: file.size,
      compressedBytes: prepared.size,
    };
  } finally {
    decoded.close();
  }
}

export async function ensureCompressedProfilePhoto(file: File) {
  validateProfilePhoto(file);
  if (isPreparedProfilePhoto(file)) return file;
  return (await compressProfilePhoto(file)).file;
}

export function formatPhotoSize(bytes: number) {
  return bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1_000))} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
}
