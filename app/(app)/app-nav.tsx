"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/hari-ini", label: "Hari Ini" },
  { href: "/kebiasaan", label: "Kebiasaan" },
  { href: "/progres", label: "Progres" },
  { href: "/kalender", label: "Kalender" },
  { href: "/pengaturan", label: "Pengaturan" },
];

export function AppNav({ userName }: { userName: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/hari-ini" className="text-lg font-bold tracking-tight">
          Perencana Kebiasaan
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {userName ?? ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
          >
            Keluar
          </Button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-2">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-sm",
              pathname === l.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
