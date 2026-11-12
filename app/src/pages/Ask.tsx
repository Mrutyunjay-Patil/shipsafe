import { useMutation } from '@tanstack/react-query'
import { ArrowUp, Loader2, PackageSearch, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  { icon: ShieldAlert, text: "Which paid orders aren't protected yet?" },
  { icon: PackageSearch, text: 'What do I need to ship today?' },
  { icon: TrendingUp, text: 'Which listing sells best?' },
  { icon: Sparkles, text: 'Any disputes I should know about?' },
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
  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, ask.isPending])

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
        <section className="flex flex-1 flex-col justify-center py-8">
          <p className="text-center text-sm text-muted-foreground">Ask your shop</p>
          <h1 className="mt-1 text-center text-2xl font-semibold tracking-tight">What do you want to know?</h1>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {SUGGESTIONS.map((s) => (
              <button key={s.text} onClick={() => send(s.text)} className="glass flex min-h-28 flex-col justify-between rounded-2xl p-4 text-left transition-transform active:scale-[0.98]">
                <s.icon className="size-5 text-brand" />
                <span className="text-sm font-medium leading-snug">{s.text}</span>
              </button>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">Answers come from your orders and PayPal. It can read, never change anything.</p>
        </section>
      ) : (
        <section className="flex-1 space-y-3 py-4">
          {msgs.map((m, i) => (
            <div key={i} className={cn('max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed',
              m.role === 'user' ? 'ml-auto bg-brand text-brand-foreground' : 'glass')}>
              {m.text}
            </div>
          ))}
          {ask.isPending && <div className="glass inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm"><Loader2 className="size-4 animate-spin text-brand" /> Checking your orders</div>}
          <div ref={end} />
        </section>
      )}
      <form className="sticky bottom-24 flex gap-2 py-3" onSubmit={(e) => { e.preventDefault(); send(q) }}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask anything about your shop" className="glass h-12 flex-1 rounded-full px-5" />
        <Button type="submit" size="icon" className="size-12 rounded-full" disabled={!q.trim() || ask.isPending} aria-label="Send"><ArrowUp /></Button>
      </form>
    </main>
  )
}
