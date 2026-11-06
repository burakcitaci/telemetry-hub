import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Confirmation { message: string; resolve: (confirmed: boolean) => void }

export function useConfirmAction() {
  const [pending, setPending] = useState<Confirmation>();
  const confirmAction = (message: string) => new Promise<boolean>(resolve => setPending({ message, resolve }));
  const finish = (confirmed: boolean) => { pending?.resolve(confirmed); setPending(undefined); };
  const confirmation = <AlertDialog open={!!pending} onOpenChange={open => { if (!open) finish(false); }}>
    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm action</AlertDialogTitle>
      <AlertDialogDescription>{pending?.message}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel onClick={() => finish(false)}>Cancel</AlertDialogCancel>
        <AlertDialogAction variant="destructive" onClick={() => finish(true)}>Confirm</AlertDialogAction>
      </AlertDialogFooter></AlertDialogContent>
  </AlertDialog>;
  return { confirmAction, confirmation };
}
