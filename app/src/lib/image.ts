// Shrink phone photos before upload. A 12 MP photo is several MB; 1600px on the long side is
// plenty for listings and for reading courier slips, and uploads far faster on a slow network.
// If the browser cannot decode the file (some HEIC photos), the original is returned unchanged.

const MAX_SIDE = 1600
const QUALITY = 0.85
export const MAX_BYTES = 8 * 1024 * 1024

export class PhotoError extends Error {}

export async function preparePhoto(file: File): Promise<File> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name)) {
    throw new PhotoError('That file is not a photo. Choose a JPG, PNG or WebP image.')
  }
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
    if (scale === 1 && file.size < 1.5 * 1024 * 1024 && file.type === 'image/jpeg') return file
    const w = Math.round(bmp.width * scale)
    const h = Math.round(bmp.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
    bmp.close()
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', QUALITY))
    if (!blob) return guard(file)
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return guard(file)
  }
}

function guard(file: File) {
  if (file.size > MAX_BYTES) throw new PhotoError('That photo is over 8 MB. Take a new one or choose a smaller file.')
  return file
}
