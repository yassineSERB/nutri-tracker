"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error?: string } | undefined;

/**
 * Only same-origin relative paths are accepted, so `callbackUrl` can never be
 * turned into an open redirect to another host.
 */
function safeCallbackUrl(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value : "";
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard";
  }
  return raw;
}

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Identifiants invalides." };
    }
    // signIn() signals success by throwing NEXT_REDIRECT — that must propagate.
    throw error;
  }
}
