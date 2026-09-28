import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Nouveau utilisateur",
};

export default function RegisterPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Logo className="mb-6 h-10 w-10" />
        <h1 className="mb-1 text-2xl font-semibold">Nouveau utilisateur</h1>
        <p className="mb-8 text-sm text-black/60 dark:text-white/60">
          Créez votre compte pour suivre vos repas, votre eau et vos objectifs.
          Chaque compte a ses propres données.
        </p>
        <RegisterForm />
      </div>
    </main>
  );
}
