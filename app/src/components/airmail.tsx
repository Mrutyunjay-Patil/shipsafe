// Airmail primitives. Every visual here is geometry (shapes, rings, stripes, text on a path),
// drawn in SVG or CSS from theme.css tokens. No pictures.
import { Package } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A product photo in a perforated stamp frame. Falls back to a parcel mark. */
export function Stamp({ src, alt = '', className, value }: { src?: string | null; alt?: string; className?: string; value?: string }) {
  return (
    <div className={cn('stamp relative shrink-0', className)}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" decoding="async" />
      ) : (
        <div className="grid place-items-center bg-brand-soft text-ink"><Package className="size-1/3" strokeWidth={1.6} /></div>
      )}
      {value && (
        <span className="money absolute bottom-2 right-2 rounded-[3px] bg-envelope/90 px-1 text-[12px] font-semibold leading-4 text-ink">{value}</span>
      )}
    </div>
  )
}

/** A circular postmark: city around the ring, date across the middle, cancellation waves beside it. */
export function Postmark({ city, date, className, waves = true }: { city: string; date: string; className?: string; waves?: boolean }) {
  const id = useId().replace(/:/g, '')
  const ring = `${city.toUpperCase()} · SHIPSAFE · `
  return (
    <svg viewBox={waves ? '0 0 200 96' : '0 0 96 96'} className={cn('text-[var(--postmark)]', className)} aria-hidden="true">
      <defs>
        <path id={`r${id}`} d="M48 48 m-34 0 a34 34 0 1 1 68 0 a34 34 0 1 1 -68 0" />
      </defs>
      <circle cx="48" cy="48" r="44" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="48" cy="48" r="25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text fill="currentColor" style={{ font: '700 9.5px var(--brand-font)', letterSpacing: '1.4px', fontStretch: '75%' }}>
        <textPath href={`#r${id}`} textLength="208">{ring}</textPath>
      </text>
      <text x="48" y="52" textAnchor="middle" fill="currentColor" style={{ font: '700 11px var(--code-font)' }}>{date}</text>
      {waves &&
        [30, 42, 54, 66].map((y) => (
          <path key={y} d={`M100 ${y} q12 -7 24 0 t24 0 t24 0 t24 0`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        ))}
    </svg>
  )
}

/** The blue airmail etiquette. Shown only when PayPal has the tracking and seller protection is eligible. */
export function ParAvion({ className, small }: { className?: string; small?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex flex-col items-center justify-center rounded-[5px] bg-etiquette text-etiquette-foreground shadow-[var(--label-shadow)]',
        'outline outline-1 -outline-offset-[3px] outline-etiquette-foreground/50',
        small ? 'px-2 py-1' : 'px-3 py-1.5',
        className,
      )}
    >
      <span className={cn('label-caps leading-none', small ? 'text-[10px]' : 'text-[13px] tracking-[0.06em]')}>Par avion</span>
      <span className={cn('leading-tight opacity-90', small ? 'text-[10px]' : 'text-[11px]')}>Protected by PayPal</span>
    </span>
  )
}

/** The airmail border along the top edge of an envelope in transit. */
export function ChevronEdge({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('chevron-edge h-2.5 w-full', className)} />
}

/** A letter: optional chevron edge for anything on its way abroad. */
export function Envelope({ inTransit, className, children }: { inTransit?: boolean; className?: string; children: ReactNode }) {
  return (
    <section className={cn('envelope', className)}>
      {inTransit && <ChevronEdge />}
      {children}
    </section>
  )
}

/** Destination as a postal label sets it: condensed capitals, country code after. */
export function Destination({ city, country, className }: { city?: string | null; country?: string | null; className?: string }) {
  return (
    <span className={cn('label-caps leading-none text-ink', className)}>
      {city ?? 'Destination'}
      {country && <span className="ml-1.5 font-medium text-muted-foreground">{country}</span>}
    </span>
  )
}

const CARRIER_NAMES: Record<string, string> = {
  INDIA_POST_INT: 'India Post International', INDIA_POST: 'India Post', DHL_API: 'DHL', FEDEX: 'FedEx', UPS: 'UPS',
}
export const carrierName = (code: string, other?: string | null) =>
  CARRIER_NAMES[code] ?? (code === 'OTHER' && other ? other : code.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()))

export const sentenceCase = (s?: string | null) => (s ? s.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()) : '')

export const postmarkDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()
