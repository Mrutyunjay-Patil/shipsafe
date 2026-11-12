// Limits and text shaping shared by the Worker and the app.

/** PayPal's own limit for a line item description (payment links schema v1.8). */
export const PAYPAL_DESC_MAX = 2048
/** The seller may use all of it. Details go below the description only while there is room. */
export const DESC_MAX = PAYPAL_DESC_MAX

/** Shorten text to `max` characters at a sentence end, or failing that a word end. Never mid-word. */
export function clipText(text: string, max = DESC_MAX): string {
  const t = text.trim().replace(/[ \t]+/g, ' ')
  if (t.length <= max) return t
  const cut = t.slice(0, max + 1)
  const sentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '), cut.lastIndexOf('.\n'))
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1)
  const word = cut.lastIndexOf(' ')
  return (word > 0 ? cut.slice(0, word) : t.slice(0, max)).replace(/[,;:.\s]+$/, '') + '…'
}

/** What the buyer reads on PayPal: the description, then one detail per line. Details that
 *  would push it past PayPal's limit are left off whole, never cut in half. */
export function paypalDescription(description: string, details: { name: string; value: string }[]): string {
  return fitDetails(description, details).text
}

/** The PayPal text, plus how many details didn't fit, so the app can warn before saving. */
export function fitDetails(description: string, details: { name: string; value: string }[]) {
  let text = clipText(description)
  const lines = details.filter((d) => d.name && d.value).map((d) => `${d.name}: ${d.value}`)
  let left = 0
  for (const [i, line] of lines.entries()) {
    const add = (i === 0 ? '\n\n' : '\n') + line
    if (text.length + add.length > PAYPAL_DESC_MAX) { left = lines.length - i; break }
    text += add
  }
  return { text, left }
}
