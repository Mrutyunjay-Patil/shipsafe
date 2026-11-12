// The message a seller pastes into a chat. Copy and Send both use it, so the buyer always gets
// a line of context with the link instead of a bare URL.
import { toast } from 'sonner'
import { money } from './api'

const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs.at(-1)}`)
const SAFE = 'You pay securely on PayPal.'

export const firstName = (label: string) => label.split(/[,·(\-–]/)[0].trim().split(/\s+/)[0]

/** The message for the product's shared link. */
export function shopMessage(p: { title: string; price: string | number; currency?: string; colours: string[] }, url: string) {
  const lines = [`${p.title}, ${money(p.price, p.currency)}.`]
  if (p.colours.length > 1) lines.push(`Comes in ${list(p.colours)}. You pick the colour when you pay.`)
  lines.push(`${SAFE} Pay here:`, url)
  return lines.join('\n')
}

/** The message for a one-buyer link. */
export function buyerMessage(
  p: { title: string; price: string; currency?: string },
  b: { label: string; price: string; colour: string | null },
  url: string,
) {
  const name = firstName(b.label)
  const special = Number(b.price) < Number(p.price)
  return [
    `Hi${name ? ` ${name}` : ''}, here's your link for the ${p.title}${b.colour ? ` in ${b.colour}` : ''}, ${money(b.price, p.currency)}.`,
    `${special ? "That's the special price for you. " : ''}It's just for you and works for one payment.`,
    `${SAFE} Pay here:`,
    url,
  ].join('\n')
}

export async function copyMessage(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Message copied, with the link')
  } catch {
    toast.error("Couldn't copy. Press and hold the link to copy it.")
  }
}

export async function copyLinkOnly(url: string) {
  try { await navigator.clipboard.writeText(url); toast.success('Link copied') } catch { toast.error("Couldn't copy the link.") }
}

/** Open the phone's share sheet, or WhatsApp on a desktop browser. The link is inside the text,
 *  so apps that would add a separate URL don't paste it twice. */
export async function sendMessage(text: string) {
  if (navigator.share) await navigator.share({ text }).catch(() => {})
  else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}
