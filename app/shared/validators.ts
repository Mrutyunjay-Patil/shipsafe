// Courier slip checks, shared by the Worker and the PWA. Ported from probes/validators.py (C14).

const S10 = /^[A-Z]{2}\d{9}[A-Z]{2}$/
const WEIGHTS = [8, 6, 4, 2, 3, 5, 9, 7]

export function normaliseTracking(raw: string): string {
  return (raw ?? '').replace(/\s+/g, '').toUpperCase()
}

export function s10CheckDigit(serial8: string): number {
  const s = [...serial8].reduce((sum, d, i) => sum + Number(d) * WEIGHTS[i], 0)
  const c = 11 - (s % 11)
  return c === 10 ? 0 : c === 11 ? 5 : c
}

export function s10Valid(raw: string): boolean {
  const n = normaliseTracking(raw)
  if (!S10.test(n)) return false
  const digits = n.slice(2, 11)
  return s10CheckDigit(digits.slice(0, 8)) === Number(digits[8])
}

const COUNTRY: Record<string, string> = {
  germany: 'DE', deutschland: 'DE', 'united states': 'US', usa: 'US', 'united states of america': 'US',
  india: 'IN', 'united kingdom': 'GB', uk: 'GB', france: 'FR', canada: 'CA', australia: 'AU',
}

const norm = (s?: string | null) =>
  (s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

export function countryCode(s?: string | null): string {
  const raw = (s ?? '').trim().toLowerCase()
  return COUNTRY[raw] ?? raw.toUpperCase()
}

export type AddressCheck = { city: boolean; postcode: boolean; country: boolean; match: boolean }

export function addressMatch(
  slip: { city?: string | null; postcode?: string | null; country?: string | null },
  ship: { city?: string | null; postcode?: string | null; country?: string | null },
): AddressCheck {
  const city = norm(slip.city) === norm(ship.city)
  const postcode = norm(slip.postcode) === norm(ship.postcode)
  const country = countryCode(slip.country) === countryCode(ship.country)
  return { city, postcode, country, match: city && postcode && country }
}

// Carrier enum values PayPal accepts. https://developer.paypal.com/track-orders/carriers
export const CARRIERS: Record<string, string> = {
  'india post': 'INDIA_POST_INT',
  'speed post': 'INDIA_POST_INT',
  'india post domestic': 'INDIA_POST',
  dhl: 'DHL_API',
  fedex: 'FEDEX',
  ups: 'UPS',
}

export function carrierEnum(name: string): { carrier: string; carrier_name_other?: string } {
  const key = norm(name)
  for (const [label, value] of Object.entries(CARRIERS)) if (key.includes(norm(label))) return { carrier: value }
  return { carrier: 'OTHER', carrier_name_other: name.slice(0, 64) }
}
