// The app's own "are you sure?" — a replacement for window.confirm, whose
// native box looks like the operating system rather than the app. Called
// the same way from anywhere (a component, a hook, a plain handler), just
// awaited:
//
//   if (!(await confirmDialog(`Delete "${name}"? This can't be undone.`))) return;
//
// ConfirmHost (mounted once, in main.tsx) is what actually draws it. This
// module is only the hand-off between the two.

export interface ConfirmRequest {
  message: string;
  /** What the button that goes ahead says. */
  confirmLabel: string;
  resolve: (confirmed: boolean) => void;
}

type Listener = (request: ConfirmRequest | null) => void;

let listener: Listener | null = null;
let pending: ConfirmRequest | null = null;

/** ConfirmHost's subscription: it's told each time a question is asked, or answered. */
export function onConfirmRequest(next: Listener): () => void {
  listener = next;
  next(pending);
  return () => {
    if (listener === next) listener = null;
  };
}

export function confirmDialog(message: string, options: { confirmLabel?: string } = {}): Promise<boolean> {
  // One question at a time: a second asked before the first is answered
  // takes its place, and the first reads as "no".
  pending?.resolve(false);
  return new Promise<boolean>((resolve) => {
    const request: ConfirmRequest = {
      message,
      // Every question here either deletes or removes something, and says
      // which in its first word.
      confirmLabel: options.confirmLabel ?? (/^remove/i.test(message) ? 'Remove' : 'Delete'),
      resolve: (confirmed) => {
        if (pending !== request) return;
        pending = null;
        listener?.(null);
        resolve(confirmed);
      },
    };
    pending = request;
    listener?.(request);
  });
}

/** "Delete "X"? This can't be undone." reads as a heading and a line under it. */
export function splitConfirmMessage(message: string): { title: string; detail: string } {
  const end = message.indexOf('?');
  if (end === -1) return { title: message, detail: '' };
  return { title: message.slice(0, end + 1), detail: message.slice(end + 1).trim() };
}
