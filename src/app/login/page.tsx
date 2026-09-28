import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const callbackUrl =
    typeof params.callbackUrl === "string" ? params.callbackUrl : "/dashboard";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Logo className="mb-6 h-10 w-10" />
        <h1 className="mb-1 text-2xl font-semibold">Connexion</h1>
        <p className="mb-8 text-sm text-black/60 dark:text-white/60">
          Accédez à votre espace.
        </p>
        <LoginForm callbackUrl={callbackUrl} />
        <p className="mt-6 text-sm text-black/60 dark:text-white/60">
          Pas encore de compte ?{" "}
          <Link href="/register" className="underline underline-offset-4">
            Nouveau utilisateur
          </Link>
        </p>
      </div>
    </main>
  );
}
