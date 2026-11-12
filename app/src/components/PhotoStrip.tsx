import { Camera, ImagePlus, Star, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { PhotoError, preparePhoto } from '@/lib/image'
import { cn } from '@/lib/utils'

export const MAX_PHOTOS = 6

/** One photo in a listing's set: already stored (key), or picked on this device and not uploaded yet (file). */
export type PhotoItem = { id: string; url: string; key?: string; file?: File }

let n = 0
export const storedPhoto = (key: string, url: string): PhotoItem => ({ id: `k${n++}`, key, url })
export const localPhoto = (file: File): PhotoItem => ({ id: `f${n++}`, file, url: URL.createObjectURL(file) })

/** Upload the photos that only exist on this device and return every key, cover first.
 *  Keys of files that already uploaded are remembered in `cache`, so a retried save doesn't upload twice. */
export async function uploadPhotos(items: PhotoItem[], cache: Map<File, string>): Promise<string[]> {
  const keys: string[] = []
  for (const it of items) {
    if (it.key) { keys.push(it.key); continue }
    const f = it.file!
    if (!cache.has(f)) cache.set(f, (await api.uploadListingPhoto(f)).photo_key)
    keys.push(cache.get(f)!)
  }
  return keys
}

/** Thumbnails of a listing's photos. The first is the cover; any other can be made the cover or removed. */
export function PhotoStrip({ items, onChange, disabled, className }: {
  items: PhotoItem[]; onChange: (items: PhotoItem[]) => void; disabled?: boolean; className?: string
}) {
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(0)
  const room = MAX_PHOTOS - items.length
  const latest = useRef(items)
  latest.current = items

  // Free the memory behind local previews when they leave the strip.
  const urls = useRef(new Set<string>())
  useEffect(() => {
    const now = new Set(items.filter((i) => i.file).map((i) => i.url))
    for (const u of urls.current) if (!now.has(u)) URL.revokeObjectURL(u)
    urls.current = now
  }, [items])
  useEffect(() => () => { for (const u of urls.current) URL.revokeObjectURL(u) }, [])

  const add = async (files: FileList | null) => {
    if (!files?.length) return
    const picked = [...files]
    if (picked.length > room) toast.message(`A listing holds ${MAX_PHOTOS} photos, so only the first ${room} were added.`)
    const take = picked.slice(0, Math.max(0, room))
    setBusy(take.length)
    const ready: PhotoItem[] = []
    for (const f of take) {
      try { ready.push(localPhoto(await preparePhoto(f))) } catch (e) {
        toast.error(e instanceof PhotoError ? e.message : `Couldn't open ${f.name}.`)
      }
    }
    setBusy(0)
    if (ready.length) onChange([...latest.current, ...ready].slice(0, MAX_PHOTOS))
  }
  const move = (i: number) => onChange([items[i], ...items.filter((_, j) => j !== i)])
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i))

  return (
    <div className={className}>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { add(e.target.files); e.target.value = '' }} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { add(e.target.files); e.target.value = '' }} />
      <ul className="grid grid-cols-4 gap-2" aria-label="Product photos">
        {items.map((it, i) => (
          <li key={it.id} className="relative aspect-square">
            <img src={it.url} alt={i === 0 ? 'Cover photo' : `Photo ${i + 1}`} className={cn('size-full rounded-md object-cover', i === 0 && 'ring-2 ring-brand ring-offset-2 ring-offset-card')} />
            {i === 0 ? (
              <span className="absolute bottom-1 left-1 rounded-xs bg-brand px-1.5 text-[10px] font-semibold leading-4 text-brand-foreground">Cover</span>
            ) : (
              <button type="button" disabled={disabled} onClick={() => move(i)} aria-label={`Make photo ${i + 1} the cover`}
                className="absolute bottom-1 left-1 grid size-7 place-items-center rounded-full bg-card/90 text-ink shadow-sm hover:bg-card disabled:opacity-50">
                <Star className="size-3.5" />
              </button>
            )}
            {items.length > 1 && (
              <button type="button" disabled={disabled} onClick={() => remove(i)} aria-label={`Remove photo ${i + 1}`}
                className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-card/90 text-foreground shadow-sm hover:bg-card disabled:opacity-50">
                <X className="size-3.5" />
              </button>
            )}
          </li>
        ))}
        {Array.from({ length: busy }, (_, i) => <li key={`busy${i}`} className="aspect-square animate-pulse rounded-md bg-muted" aria-label="Preparing photo" />)}
        {room - busy > 0 && (
          <li className="grid aspect-square grid-rows-2 overflow-hidden rounded-md border border-dashed border-ink/30 bg-card">
            <button type="button" disabled={disabled || busy > 0} onClick={() => galleryRef.current?.click()}
              className="flex items-center justify-center gap-1 text-[12px] font-medium text-ink hover:bg-muted disabled:opacity-50" aria-label="Add photos from gallery">
              <ImagePlus className="size-4" /> Add
            </button>
            <button type="button" disabled={disabled || busy > 0} onClick={() => cameraRef.current?.click()}
              className="flex items-center justify-center gap-1 border-t border-dashed border-ink/30 text-[12px] font-medium text-ink hover:bg-muted disabled:opacity-50" aria-label="Take a photo">
              <Camera className="size-4" /> Take
            </button>
          </li>
        )}
      </ul>
      <p className="mt-2 text-[12px] text-muted-foreground">
        {items.length} of {MAX_PHOTOS}. The cover shows on product cards and in chat previews. Tap the star to make a photo the cover.
      </p>
    </div>
  )
}
