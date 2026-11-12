import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Attribute } from '@/lib/api'

// The AI suggests details for the exact product in the photo; this table is only the fallback
// when it suggests none. Matched against the category the AI names, first match wins.
export const FALLBACK: [RegExp, string[]][] = [
  [/pottery|ceramic|porcelain|stoneware|terracotta|mug|bowl|plate|vase|planter/i, ['Clay', 'Glaze', 'Dimensions', 'Capacity', 'Food safe', 'Microwave safe']],
  [/furniture|chair|table|stool|shelf|cabinet|bench|desk|bed/i, ['Wood or material', 'Dimensions', 'Finish', 'Assembly', 'Weight capacity']],
  [/art|painting|print|poster|canvas|illustration|photograph/i, ['Medium', 'Size', 'Framed', 'Signed', 'Edition']],
  [/candle|soap|wax/i, ['Scent', 'Wax', 'Weight', 'Burn time']],
  [/cosmetic|skincare|beauty|perfume|oil|balm|cream/i, ['Ingredients', 'Volume', 'Skin type', 'Expiry']],
  [/food|tea|coffee|spice|snack|sweet|honey|pickle/i, ['Ingredients', 'Net weight', 'Shelf life', 'Dietary']],
  [/electronic|gadget|device|speaker|headphone|charger|phone/i, ['Brand and model', 'Condition', 'Warranty', 'In the box']],
  [/toy|game|puzzle|doll/i, ['Age range', 'Material', 'Dimensions', 'Safety']],
  [/book|notebook|journal|stationery/i, ['Pages', 'Size', 'Paper', 'Binding']],
  [/plant|succulent|seed|bonsai/i, ['Species', 'Pot size', 'Light', 'Watering']],
  [/shoe|sandal|footwear|boot|slipper/i, ['Size', 'Upper material', 'Sole', 'Fit']],
  [/jewel|earring|necklace|ring|bangle|bracelet|pendant/i, ['Metal', 'Stone', 'Weight', 'Size']],
  [/bag|tote|purse|wallet|backpack/i, ['Material', 'Dimensions', 'Closure', 'Pockets']],
  [/scarf|stole|shawl|dupatta|saree|fabric|textile|shirt|dress|kurta|apparel|clothing|top/i, ['Material', 'Size', 'Fit', 'Care']],
  [/decor|lamp|diya|lantern|brass|metal|sculpture|figurine/i, ['Material', 'Dimensions', 'Weight', 'Set of']],
]
export const fallbackFor = (category: string) => FALLBACK.find(([re]) => re.test(category))?.[1] ?? ['Material', 'Dimensions', 'Weight', 'Condition']

/** Detail rows (name and value) with suggestion pills and a "Your own" pill. Shared by Sell and the product page. */
export function AttributeEditor({ value, onChange, suggestions }: { value: Attribute[]; onChange: (v: Attribute[]) => void; suggestions: string[] }) {
  const add = (name: string) => value.length < 12 && onChange([...value, { name, value: '' }])
  const update = (i: number, patch: Partial<Attribute>) => onChange(value.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="sheet divide-y divide-border/70 rounded-xl">
          {value.map((a, i) => (
            <li key={i} className="flex items-center gap-2 px-2 py-1.5">
              <Input
                aria-label="Detail name"
                value={a.name}
                placeholder="Detail"
                onChange={(e) => update(i, { name: e.target.value })}
                className="h-10 w-[38%] shrink-0 rounded-md border-transparent bg-transparent px-2 text-[14px] font-medium shadow-none focus-visible:bg-card"
              />
              <Input
                aria-label={`${a.name || 'Detail'} value`}
                value={a.value}
                autoFocus={!a.value && !!a.name}
                placeholder={a.name ? `Add ${a.name.toLowerCase()}` : 'Value'}
                onChange={(e) => update(i, { value: e.target.value })}
                className="h-10 min-w-0 flex-1 rounded-md bg-card text-[15px]"
              />
              <button type="button" aria-label={`Remove ${a.name || 'detail'}`} onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {suggestions
          .filter((n) => !value.some((a) => a.name.toLowerCase() === n.toLowerCase()))
          .map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => add(n)}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-ink/30 bg-card px-3 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-accent"
            >
              <Plus className="size-3.5" strokeWidth={2.5} /> {n}
            </button>
          ))}
        <button
          type="button"
          onClick={() => add('')}
          className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-card px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" strokeWidth={2.5} /> Your own
        </button>
      </div>
    </div>
  )
}
