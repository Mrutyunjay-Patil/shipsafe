import { useMutation } from '@tanstack/react-query'
import { ArrowUp, Loader2, PackageSearch, Scale, ShieldAlert, TrendingUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  { icon: ShieldAlert, text: "Which paid orders aren't protected yet?" },
  { icon: PackageSearch, text: 'What do I need to ship today?' },
  { icon: TrendingUp, text: 'Which listing sells best?' },
  { icon: Scale, text: 'Any disputes I should know about?' },
]

type Msg = { role: 'user' | 'assistant'; text: string }

export default function Ask() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [q, setQ] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const ask = useMutation({
    mutationFn: api.ask,
    onSuccess: (r) => setMsgs((m) => [...m, { role: 'assistant', text: r.answer }]),
    onError: (e) => setMsgs((m) => [...m, { role: 'assistant', text: `Sorry, that failed: ${(e as Error).message}` }]),
  })
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [msgs, ask.isPending])

  const send = (text: string) => {
    const t = text.trim()
    if (!t || ask.isPending) return
    setMsgs((m) => [...m, { role: 'user', text: t }])
    setQ('')
    ask.mutate(t)
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-7rem)] max-w-md flex-col px-5 pt-[max(env(safe-area-inset-top),20px)]">
      {msgs.length === 0 ? (
        <section className="flex flex-1 flex-col pt-3">
          <h1 className="text-[26px] font-semibold leading-tight">Ask your shop</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">Plain answers from your orders and PayPal. It reads, it never changes anything.</p>
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
        <section className="flex-1 space-y-3 py-4">
          {msgs.map((m, i) => (
            <div key={i} className={cn('max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed',
              m.role === 'user' ? 'ml-auto rounded-br-md bg-ink text-paper' : 'sheet rounded-bl-md')}>
              {m.text}
            </div>
          ))}
          {ask.isPending && <div className="sheet inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm"><Loader2 className="size-4 animate-spin text-brand" /> Checking your orders</div>}
          <div ref={end} />
        </section>
      )}
      <form className="sticky bottom-24 flex gap-2 py-3" onSubmit={(e) => { e.preventDefault(); send(q) }}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about your shop" className="h-12 flex-1 rounded-xl bg-card px-4 text-[16px] shadow-[var(--sheet-shadow)]" />
        <Button type="submit" size="icon" className="size-12 rounded-xl" disabled={!q.trim() || ask.isPending} aria-label="Send"><ArrowUp /></Button>
      </form>
    </main>
  )
}
