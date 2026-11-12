import { Camera, FileCheck2, Link2, MessageCircle, ScanLine, ShieldCheck, Webhook } from 'lucide-react'
import { Envelope, Postmark, postmarkDate, ShippedSafe, Stamp } from '@/components/airmail'
import { Button } from '@/components/ui/button'

// Example parcel uses the shop owner's sample photo (public/sample).
const scarf = '/sample/paisley-scarf.jpg'

const STEPS = [
  { icon: Camera, title: 'Snap the product', text: 'AI reads the photo and drafts the title, description, colours and a price. You check it before anything is published.' },
  { icon: Link2, title: 'Share one PayPal link', text: 'ShipSafe creates a PayPal payment link with colour options and shipping address collection. Paste it into Instagram or WhatsApp.' },
  { icon: MessageCircle, title: 'The buyer pays on PayPal', text: 'PayPal sends ShipSafe a signed notice. The order appears with the buyer’s PayPal shipping address and the colour they picked.' },
  { icon: ScanLine, title: 'Snap the courier slip', text: 'AI reads the tracking number. ShipSafe checks the postal check digit, the address and duplicates, then adds tracking to the PayPal order.' },
]

const PAYPAL = [
  { icon: Link2, name: 'Payment Links', text: 'One link per listing, closed automatically when stock runs out.' },
  { icon: Webhook, name: 'Signed webhooks', text: 'Every payment notice is verified with PayPal before an order is created.' },
  { icon: FileCheck2, name: 'Order tracking', text: 'Tracking goes onto the exact PayPal order and PayPal emails the buyer.' },
  { icon: ShieldCheck, name: 'Seller Protection', text: 'Each order shows PayPal’s own protection status, not a guess.' },
]

const FAQ = [
  ['Do I need a website?', 'No. ShipSafe gives you a PayPal link to paste into the chats you already sell in.'],
  ['Where does the money go?', 'Straight to your PayPal account. ShipSafe never holds funds or sees card details.'],
  ['What if two buyers pay for the last one?', 'ShipSafe closes the link after the last unit sells and flags anyone who paid in the gap, so you can refund them in one tap.'],
  ['What if the AI misreads a tracking number?', 'You see every check before PayPal does, and you can correct the number. If a wrong one slips through, cancel it on PayPal and scan again.'],
]

function LoginButton({ className }: { className?: string }) {
  return (
    <Button asChild size="lg" className={className ?? 'h-14 w-full rounded-xl text-[16px]'}>
      <a href="/auth/paypal/login">Log in with PayPal</a>
    </Button>
  )
}

export default function SignIn() {
  const failed = new URLSearchParams(location.search).get('login')
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-10">
          <span className="flex items-center gap-2.5">
            <img src="/icon.svg" alt="" className="size-8 rounded-md" />
            <span className="text-[18px] font-bold tracking-[-0.02em] text-ink">ShipSafe</span>
          </span>
          <nav className="hidden items-center gap-7 text-[14px] font-medium text-muted-foreground md:flex">
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#paypal" className="hover:text-foreground">PayPal inside</a>
            <a href="#faq" className="hover:text-foreground">Questions</a>
          </nav>
          <LoginButton className="h-10 rounded-lg px-4 text-[14px]" />
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-10 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-10 lg:pb-24 lg:pt-20">
          <div>
            <h1 className="text-[42px] font-semibold leading-[1.02] lg:text-[60px]">
              Sell in the chat.
              <br />
              Post with proof.
            </h1>
            <p className="mt-4 max-w-[42ch] text-[17px] leading-relaxed text-muted-foreground">
              ShipSafe turns an Instagram or WhatsApp sale into a protected PayPal sale. A PayPal link for every product, and a photo of the courier slip becomes tracking PayPal can see.
            </p>
            {failed && (
              <p role="alert" className="mt-6 rounded-lg bg-[color-mix(in_oklch,var(--status-refund)_10%,var(--card))] px-3.5 py-2.5 text-sm">
                PayPal sign-in didn't finish. Try again.
              </p>
            )}
            <div className="mt-7 max-w-sm">
              <LoginButton />
              <p className="mt-3 text-[13px] text-muted-foreground">Free to try. This demo runs on the PayPal sandbox, so no real money moves.</p>
            </div>
          </div>

          <Envelope inTransit className="lg:rotate-[1.5deg]">
            <div className="relative px-5 pb-5 pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="label-caps text-[46px] leading-[0.9] text-ink">Berlin</p>
                  <p className="money mt-3 text-[26px] font-semibold leading-none">$24.00</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">Paisley scarf · Slate blue</p>
                </div>
                <Stamp src={scarf} className="h-[100px] w-[84px] rotate-[3deg]" />
              </div>
              <div className="mt-5 flex items-center gap-2">
                <Postmark city="Berlin" date={postmarkDate(new Date().toISOString())} waves={false} className="strike size-[68px] -rotate-[10deg]" />
                <ShippedSafe className="settle -rotate-2" />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-dashed border-border pt-4 text-[12px]">
                <span><span className="block text-muted-foreground">Paid</span><span className="font-medium">PayPal</span></span>
                <span><span className="block text-muted-foreground">Tracking</span><span className="tracking-code font-medium">EE482913507IN</span></span>
                <span><span className="block text-muted-foreground">Protection</span><span className="font-medium">Eligible</span></span>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">Example parcel</p>
            </div>
          </Envelope>
        </section>

        <section id="how" className="border-y border-border/60 bg-card/50">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-10 lg:py-24">
            <h2 className="max-w-[20ch] text-[30px] font-semibold leading-tight lg:text-[40px]">From a photo to a protected sale in four steps</h2>
            <ol className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-ink text-paper"><s.icon className="size-5" /></span>
                    <span className="money text-[13px] font-semibold text-muted-foreground">Step {i + 1}</span>
                  </span>
                  <h3 className="mt-4 text-[18px] font-semibold">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="paypal" className="mx-auto max-w-6xl px-5 py-16 lg:px-10 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
            <div>
              <h2 className="text-[30px] font-semibold leading-tight lg:text-[40px]">Built on PayPal, end to end</h2>
              <p className="mt-4 max-w-[44ch] text-[16px] leading-relaxed text-muted-foreground">
                Buyers pay on PayPal's own page, and ShipSafe works through PayPal's APIs for everything after that. Sellers sign in with PayPal, so there is no new password.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {PAYPAL.map((f) => (
                <li key={f.name} className="sheet rounded-2xl p-5">
                  <f.icon className="size-5 text-ink" />
                  <h3 className="mt-3 text-[16px] font-semibold">{f.name}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="faq" className="border-t border-border/60 bg-card/50">
          <div className="mx-auto max-w-3xl px-5 py-16 lg:py-24">
            <h2 className="text-[30px] font-semibold leading-tight lg:text-[40px]">Questions sellers ask</h2>
            <div className="mt-8 divide-y divide-border">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold">
                    {q}
                    <span className="text-[22px] leading-none text-muted-foreground transition-transform duration-200 group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
            <div className="mt-12 max-w-sm">
              <LoginButton />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <span className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="size-5 rounded" /> ShipSafe
          </span>
          <span>Built for the PayPal AI Hackathon. Runs on the PayPal sandbox.</span>
        </div>
      </footer>
    </div>
  )
}
