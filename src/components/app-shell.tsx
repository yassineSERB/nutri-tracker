import { SignOutButton } from "@/app/dashboard/sign-out-button";
import { LogoWordmark } from "./logo";
import { Nav } from "./nav";

export async function AppShell({
  pathname,
  email,
  children,
}: {
  pathname: string;
  email: string | null | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-black/10 dark:border-white/15">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <LogoWordmark linkTo="/dashboard" />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-black/60 sm:inline dark:text-white/60">
              {email}
            </span>
            <SignOutButton />
          </div>
        </div>
        <div className="mx-auto w-full max-w-3xl px-4">
          <Nav pathname={pathname} />
        </div>
      </header>
      <div className="mx-auto w-full max-w-3xl flex-1">{children}</div>
    </div>
  );
}
