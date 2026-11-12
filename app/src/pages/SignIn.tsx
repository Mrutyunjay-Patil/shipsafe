import { Envelope, ShippedSafe, Postmark, postmarkDate, Stamp } from '@/components/airmail'
import { Button } from '@/components/ui/button'

// Example parcel uses the shop owner's sample photo (public/sample).
const scarf = '/sample/paisley-scarf.jpg'

export default function SignIn() {
  const failed = new URLSearchParams(location.search).get('login')
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-[max(env(safe-area-inset-top),28px)]">
      <div className="flex items-center gap-2.5">
        <img src="/icon.svg" alt="" className="size-8 rounded-md" />
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
              <p className="mt-1.5 text-sm text-muted-foreground">Paisley scarf · Slate blue</p>
            </div>
            <Stamp src={scarf} className="h-[86px] w-[72px] rotate-[3deg]" />
          </div>
          <div className="mt-5 flex items-center gap-2">
            <Postmark city="Berlin" date={postmarkDate(new Date().toISOString())} waves={false} className="strike size-[64px] -rotate-[10deg]" />
            <ShippedSafe className="settle -rotate-2" />
          </div>
          <p className="tracking-code mt-4 text-[14px] font-semibold">EE 482 913 507 IN</p>
          <p className="text-[12px] text-muted-foreground">Example parcel</p>
        </div>
      </Envelope>

      <div className="mt-auto pt-10">
        {failed && (
          <p role="alert" className="mb-3 rounded-lg bg-[color-mix(in_oklch,var(--status-refund)_10%,var(--card))] px-3.5 py-2.5 text-sm">
            PayPal sign-in didn't finish. Try again.
          </p>
        )}
        <Button asChild size="lg" className="h-14 w-full rounded-xl text-[16px]">
          <a href="/auth/paypal/login">Log in with PayPal</a>
        </Button>
        <p className="mt-3 text-center text-[12px] text-muted-foreground">PayPal sandbox demo. No real money moves.</p>
      </div>
    </main>
  )
}
