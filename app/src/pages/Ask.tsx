import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowUp, Check, Copy, Loader2, PackageSearch, Scale, ShieldAlert, Sparkles, TrendingUp, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Markdown } from '@/components/Markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, type ProposedAction } from '@/lib/api'
import { copyLinkOnly } from '@/lib/share'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  { icon: ShieldAlert, text: "Which paid orders aren't protected yet?" },
  { icon: PackageSearch, text: 'What do I need to ship today?' },
  { icon: TrendingUp, text: 'Show my sales by product as a table' },
  { icon: Scale, text: 'Any disputes or refunds I should deal with?' },
]

type Msg = { role: 'user' | 'assistant'; text: string; actions?: ProposedAction[] }

const VERB: Record<ProposedAction['kind'], string> = {
  refund: 'Refund',
  update_listing: 'Update product',
  create_buyer_link: 'Make buyer link',
  close_buyer_link: 'Close buyer link',
  close_listing: 'Close link',
}

/** A change Ask proposed. It runs only when the seller taps Confirm, through the normal API. */
function ActionCard({ a }: { a: ProposedAction }) {
  const qc = useQueryClient()
  const [state, setState] = useState<'idle' | 'done' | 'dismissed'>('idle')
  const [url, setUrl] = useState<string | null>(null)
  const run = useMutation({
    mutationFn: async () => {
      switch (a.kind) {
        case 'refund': return api.refund(a.order_id)
        case 'update_listing': return api.updateListing(a.listing_id, { price: a.price, quantity: a.quantity })
        case 'create_buyer_link': {
          const r = await api.createBuyerLink(a.listing_id, { label: a.label, price: a.price, colour: a.colour, expires_days: a.expires_days })
          setUrl(r.url)
          return r
        }
        case 'close_buyer_link': return api.closeBuyerLink(a.buyer_link_id)
        case 'close_listing': return api.archiveListing(a.listing_id)
      }
    },
    onSuccess: () => { setState('done'); qc.invalidateQueries() },
  })
  const danger = a.kind === 'refund' || a.kind === 'close_listing'
  const target = 'order_id' in a ? `/orders/${a.order_id}` : 'listing_id' in a ? `/products/${a.listing_id}` : null

  return (
    <div className={cn('rounded-xl border bg-card p-3', state === 'done' ? 'border-success/40' : 'border-border')}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{VERB[a.kind]}</p>
      <p className="mt-1 text-[14px] leading-snug">{a.summary}</p>
      {run.isError && <p className="mt-2 text-[13px] text-destructive">Couldn't do it. {(run.error as Error).message}</p>}
      {state === 'done' ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[13px] font-medium text-success">
          <Check className="size-4" /> Done
          {url && <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => copyLinkOnly(url)}><Copy /> Copy link</Button>}
          {target && <Link to={target} className="text-brand underline underline-offset-2">Open</Link>}
        </div>
      ) : state === 'dismissed' ? (
        <p className="mt-2 text-[13px] text-muted-foreground">Dismissed. Nothing changed.</p>
      ) : (
        <div className="mt-2.5 flex gap-2">
          <Button size="sm" variant={danger ? 'destructive' : 'default'} className="h-9 rounded-full" disabled={run.isPending} onClick={() => run.mutate()}>
            {run.isPending ? <Loader2 className="animate-spin" /> : <Check />} Confirm
          </Button>
          <Button size="sm" variant="ghost" className="h-9 rounded-full" disabled={run.isPending} onClick={() => setState('dismissed')}>
            <X /> Dismiss
          </Button>
        </div>
      )}
    </div>
  )
}

export default function Ask() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [q, setQ] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const ask = useMutation({
    mutationFn: (v: { question: string; history: Msg[] }) =>
      api.ask(v.question, v.history.map((m) => ({ role: m.role, content: m.text }))),
    onSuccess: (r) => setMsgs((m) => [...m, { role: 'assistant', text: r.answer || 'Done.', actions: r.actions }]),
    onError: (e) => setMsgs((m) => [...m, { role: 'assistant', text: `Sorry, that failed: ${(e as Error).message}` }]),
  })
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [msgs, ask.isPending])

  const send = (text: string) => {
    const t = text.trim()
    if (!t || ask.isPending) return
    const history = msgs
    setMsgs((m) => [...m, { role: 'user', text: t }])
    setQ('')
    ask.mutate({ question: t, history })
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-7rem)] max-w-md flex-col px-5 lg:max-w-3xl lg:pt-8 pt-[max(env(safe-area-inset-top),20px)]">
      {msgs.length === 0 ? (
        <section className="flex flex-1 flex-col pt-3">
          <h1 className="text-[26px] font-semibold leading-tight">Ask your shop</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Answers from your own orders and PayPal. It can also set up refunds, price and stock changes, and buyer links, which run only after you tap Confirm.
          </p>
          <ul className="sheet mt-6 divide-y divide-border/70 overflow-hidden rounded-2xl">
            {SUGGESTIONS.map((s) => (
              <li key={s.text}>
                <button onClick={() => send(s.text)} className="flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors hover:bg-accent/40 active:bg-accent/60">
                  <s.icon className="size-5 shrink-0 text-ink" strokeWidth={1.9} />
                  <span className="flex-1 text-[15px] font-medium">{s.text}</span>
                  <ArrowUp className="size-4 rotate-45 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="flex-1 space-y-3 pb-28 pt-4" aria-live="polite">
          {msgs.map((m, i) => (
            m.role === 'user' ? (
              <div key={i} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-ink px-4 py-3 text-sm leading-relaxed text-paper">{m.text}</div>
            ) : (
              <div key={i} className="sheet max-w-[95%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed">
                <Markdown>{m.text}</Markdown>
                {!!m.actions?.length && (
                  <div className="mt-3 space-y-2">
                    <p className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground"><Sparkles className="size-3.5" /> Ready for you to confirm</p>
                    {m.actions.map((a) => <ActionCard key={a.id} a={a} />)}
                  </div>
                )}
              </div>
            )
          ))}
          {ask.isPending && <div className="sheet inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm"><Loader2 className="size-4 animate-spin text-brand" /> Checking your shop</div>}
          <div ref={end} />
        </section>
      )}
      <form className="sticky bottom-24 flex gap-2 py-3 lg:bottom-4" onSubmit={(e) => { e.preventDefault(); send(q) }}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask or tell your shop what to do" className="h-12 flex-1 rounded-xl bg-card px-4 text-[16px] shadow-[var(--sheet-shadow)]" />
        <Button type="submit" size="icon" className="size-12 rounded-xl" disabled={!q.trim() || ask.isPending} aria-label="Send"><ArrowUp /></Button>
      </form>
    </main>
  )
}
