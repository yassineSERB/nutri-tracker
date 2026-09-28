"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { register, type RegisterState } from "./actions";

const inputClass =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    register,
    undefined,
  );
  const error = state?.error ?? null;
  const errorId = useId();

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-black/60 dark:text-white/60">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-black/60 dark:text-white/60">Mot de passe</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          className={inputClass}
        />
        <span className="text-xs text-black/50 dark:text-white/50">
          8 caractères minimum.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-black/60 dark:text-white/60">
          Confirmer le mot de passe
        </span>
        <input
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          className={inputClass}
        />
      </label>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
      >
        {pending ? "Création…" : "Créer mon compte"}
      </button>

      <p className="text-sm text-black/60 dark:text-white/60">
        Déjà un compte ?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
