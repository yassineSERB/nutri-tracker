import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { normalizeEmail } from "@/lib/email";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/**
 * Compared against when the email is unknown, so a failed lookup costs the same
 * as a wrong password and cannot be used to enumerate accounts. The plaintext is
 * meaningless; only its hash is ever checked.
 */
const DECOY_HASH = "$2b$10$JCJBz7U05GkdUCr1wtLKku7a3QNtj9u.qYSKuUq3qAaK2.2xGjV2O";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Required as soon as the app is not run by `next dev`: Auth.js then stops
  // rejecting requests whose Host header it cannot verify, which is what a
  // self-hosted deployment behind a reverse proxy looks like. Without it,
  // `next start` answers every auth request with a configuration error.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = db
          .select()
          .from(users)
          .where(eq(users.email, normalizeEmail(parsed.data.email)))
          .get();

        // Always run bcrypt, even with no user, to keep both failures identical.
        const passwordMatches = await bcrypt.compare(
          parsed.data.password,
          user?.passwordHash ?? DECOY_HASH,
        );

        if (!user || !passwordMatches) {
          return null;
        }

        // The id is the session subject and the ownership key for every row.
        return { id: String(user.id), email: user.email, name: user.email };
      },
    }),
  ],
  callbacks: {
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
