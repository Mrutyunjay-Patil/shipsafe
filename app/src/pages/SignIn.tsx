import { Envelope, ParAvion, Postmark, postmarkDate, Stamp } from '@/components/airmail'
import { Button } from '@/components/ui/button'

const scarf =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 96"><rect width="80" height="96" fill="#2b3f8f"/>${Array.from({ length: 30 }, (_, i) => `<circle cx="${8 + (i % 5) * 16}" cy="${10 + Math.floor(i / 5) * 15}" r="4" fill="none" stroke="#e9e4d4" stroke-width="1.4"/><circle cx="${8 + (i % 5) * 16}" cy="${10 + Math.floor(i / 5) * 15}" r="1.2" fill="#c8563a"/>`).join('')}</svg>`,
  )

export default function SignIn() {
  const failed = new URLSearchParams(location.search).get('login')
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-[max(env(safe-area-inset-top),28px)]">
      <div className="flex items-center gap-2.5">
        <img src="/icon.svg" alt="" className="size-8 rounded-[9px]" />
        <span className="text-[17px] font-semibold">ShipSafe</span>
      </div>

      <h1 className="mt-10 text-[40px] font-semibold leading-[1.02]">
        Sell in the chat.
        <br />
        Post with proof.
      </h1>
      <p className="mt-3 max-w-[34ch] text-[16px] leading-relaxed text-muted-foreground">
        A PayPal link for every sale, and a photo of the courier slip turns into tracking PayPal can see.
      </p>

      <Envelope inTransit className="mt-8">
        <div className="relative px-5 pb-5 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="label-caps text-[42px] leading-[0.9] text-ink">Berlin</p>
              <p className="money mt-3 text-[24px] font-semibold leading-none">$24.00</p>
              <p className="mt-1.5 text-sm text-muted-foreground">Block-printed scarf · Indigo</p>
            </div>
            <Stamp src={scarf} className="h-[86px] w-[72px] rotate-[3deg]" />
          </div>
          <div className="mt-5 flex items-center gap-2">
            <Postmark city="Berlin" date={postmarkDate(new Date().toISOString())} waves={false} className="strike size-[64px] -rotate-[10deg]" />
            <ParAvion className="settle -rotate-2" />
          </div>
          <p className="tracking-code mt-4 text-[14px] font-semibold">EE 482 913 507 IN</p>
          <p className="text-[12px] text-muted-foreground">Example parcel</p>
        </div>
      </Envelope>

      <div className="mt-auto pt-10">
        {failed && (
          <p role="alert" className="mb-3 rounded-[12px] bg-[color-mix(in_oklch,var(--status-refund)_10%,var(--card))] px-3.5 py-2.5 text-sm">
            PayPal sign-in didn't finish. Try again.
          </p>
        )}
        <Button asChild size="lg" className="h-14 w-full rounded-[14px] text-[16px]">
          <a href="/auth/paypal/login">Log in with PayPal</a>
        </Button>
        <p className="mt-3 text-center text-[12px] text-muted-foreground">PayPal sandbox demo. No real money moves.</p>
      </div>
    </main>
  )
}
