import { Camera, Link2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

const steps = [
  { icon: Camera, title: 'Snap the product', text: 'AI drafts the title, colours and price.' },
  { icon: Link2, title: 'Share one PayPal link', text: 'Paste it into Instagram or WhatsApp.' },
  { icon: ShieldCheck, title: 'Snap the courier slip', text: 'Tracking goes to PayPal, so the sale is protected.' },
]

export default function SignIn() {
  const failed = new URLSearchParams(location.search).get('login')
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-10 pt-16">
      <div className="flex items-center gap-2">
        <img src="/icon.svg" alt="" className="size-9 rounded-xl" />
        <span className="text-xl font-semibold tracking-tight">ShipSafe</span>
      </div>

      <h1 className="mt-10 text-[2.4rem] font-semibold leading-[1.05] tracking-tight">
        Sell from a photo.
        <br />
        <span className="text-brand">Ship with proof.</span>
      </h1>
      <p className="mt-3 text-muted-foreground">
        For small sellers taking orders in chat. Every sale gets a PayPal payment link and tracked delivery.
      </p>

      <ul className="mt-8 space-y-3">
        {steps.map((s) => (
          <li key={s.title} className="glass flex items-center gap-4 rounded-2xl p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
              <s.icon className="size-5" />
            </span>
            <span>
              <span className="block font-medium">{s.title}</span>
              <span className="block text-sm text-muted-foreground">{s.text}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-10">
        {failed && (
          <p className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            PayPal sign-in didn't finish. Please try again.
          </p>
        )}
        <Button asChild size="lg" className="h-14 w-full rounded-full text-base">
          <a href="/auth/paypal/login">Log in with PayPal</a>
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Sandbox demo. Payments use PayPal test accounts.
        </p>
      </div>
    </main>
  )
}
