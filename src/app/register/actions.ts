"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { z } from "zod";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { normalizeEmail } from "@/lib/email";

export type RegisterState = { error?: string; message?: string } | undefined;

const registerSchema = z
  .object({
    email: z.email("Adresse email invalide."),
    // bcrypt silently truncates beyond 72 bytes, so the limit is enforced here
    // rather than letting two different long passwords match.
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
      .max(72, "Le mot de passe ne peut pas dépasser 72 caractères."),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Les deux mots de passe ne correspondent pas.",
    path: ["confirm"],
  });

/**
 * Cost 10 rather than 12: this is `bcryptjs`, a pure-JS implementation, and a
 * higher cost turns a one-second wait into a five-second one. The existing
 * accounts were hashed at 10 as well, so the settings stay uniform.
 */
const BCRYPT_COST = 10;

export async function register(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const email = normalizeEmail(parsed.data.email);

  const alreadyUsed = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (alreadyUsed) {
    return { error: "Un compte existe déjà avec cette adresse email." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_COST);

  try {
    db.insert(users).values({ email, passwordHash }).run();
  } catch {
    // The unique index is the real guard: two registrations submitted at the
    // same moment both pass the check above, and only one insert can win.
    return { error: "Un compte existe déjà avec cette adresse email." };
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Compte créé, mais la connexion a échoué. Essaie de te connecter." };
    }
    // signIn() signals success by throwing NEXT_REDIRECT — that must propagate.
    throw error;
  }
}
