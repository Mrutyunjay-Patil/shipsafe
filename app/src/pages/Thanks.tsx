import { ShieldCheck } from 'lucide-react'

// Buyers land here after paying a ShipSafe link (the link's return_url).
export default function Thanks() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-success/15 text-success">
        <ShieldCheck className="size-8" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Thanks, your payment went through</h1>
      <p className="mt-2 text-muted-foreground">
        PayPal has emailed you a receipt. You'll get another email with the tracking number as soon as the seller ships.
      </p>
    </main>
  )
}
