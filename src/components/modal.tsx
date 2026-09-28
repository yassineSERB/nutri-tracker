"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A lightweight modal built on the native `<dialog>` element: Escape closes it,
 * clicking the backdrop closes it, and focus stays inside while it is open.
 * The accent separator matches the app's UI (no third-party dependency).
 */
export function Modal({
  trigger,
  title,
  children,
}: {
  trigger: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onBackdrop = (event: MouseEvent) => {
      if (event.target === dialog) setOpen(false);
    };
    const onCancel = (event: Event) => {
      event.preventDefault();
      setOpen(false);
    };
    dialog.addEventListener("click", onBackdrop);
    dialog.addEventListener("close", () => setOpen(false));
    dialog.addEventListener("cancel", onCancel);
    return () => {
      dialog.removeEventListener("click", onBackdrop);
      dialog.removeEventListener("close", () => setOpen(false));
      dialog.removeEventListener("cancel", onCancel);
    };
  }, []);

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>

      <dialog
        ref={dialogRef}
        className="m-auto w-full max-w-2xl rounded-lg border border-black/10 bg-background p-0 text-foreground dark:border-white/15"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-3 dark:border-white/15">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer"
            className="rounded-md px-2 py-1 text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-5">{children}</div>
      </dialog>
    </>
  );
}