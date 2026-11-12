import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/** A yes/no question before something that can't be undone. */
export function ConfirmDialog({
  open, title, body, confirm, cancel = 'Keep editing', danger, onConfirm, onCancel,
}: {
  open: boolean; title: string; body: string; confirm: string; cancel?: string; danger?: boolean
  onConfirm: () => void; onCancel: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent showCloseButton={false} className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="grid grid-cols-2 gap-2.5 sm:grid">
          <Button variant="outline" size="lg" className="h-11 rounded-xl" onClick={onCancel}>{cancel}</Button>
          <Button variant={danger ? 'destructive' : 'default'} size="lg" className="h-11 rounded-xl" onClick={onConfirm}>{confirm}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
