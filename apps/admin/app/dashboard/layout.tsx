"use client";

import {
  Activity,
  Car,
  ChevronUp,
  CreditCard,
  Loader2,
  LogOut,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { toast } from "sonner";

import EnvironmentBadge from "@/components/dev-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface AuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
  };
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { label: "Operations", href: "/dashboard/operations", icon: Car },
  { label: "Users", href: "/dashboard/users", icon: Users },
  { label: "Safety", href: "/dashboard/safety", icon: ShieldAlert },
  { label: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { label: "Health", href: "/dashboard/health", icon: Activity },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const sessionResult = authClient.useSession();
  const session = sessionResult.data as AuthSession | null;
  const isPending = sessionResult.isPending;

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/sign-in");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-64 flex-col border-r bg-muted/40 md:flex">
        <div className="flex h-14 items-center justify-between border-b px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-bold tracking-tight"
          >
            <Car className="h-5 w-5 text-primary" />
            <span>Hitchly</span>
          </Link>
          <EnvironmentBadge />
        </div>

        <nav className="flex-1 space-y-1 px-4 py-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 px-3",
                    isActive
                      ? "bg-secondary font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon
                    className={cn("h-4 w-4", isActive && "text-primary")}
                  />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t bg-muted/20">
          <UserNav session={session} />
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-y-auto bg-background">
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}

function UserNav({ session }: { session: AuthSession }) {
  const router = useRouter();
  const userInitials = (session.user.name || "U").charAt(0).toUpperCase();

  const handleSignOut = () => {
    const performSignOut = async () => {
      try {
        await authClient.signOut();
        router.push("/sign-in");
        toast.success("Signed out successfully");
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to sign out";
        toast.error(message);
      }
    };
    performSignOut().catch((err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between gap-2 px-2 hover:bg-muted/50"
        >
          <div className="flex items-center gap-3 overflow-hidden text-left">
            <Avatar className="h-8 w-8 border">
              <AvatarImage src={session.user.image ?? ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold truncate leading-none">
                {session.user.name}
              </span>
              <span className="text-[10px] text-muted-foreground truncate mt-1">
                {session.user.email}
              </span>
            </div>
          </div>
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56 mb-2">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {session.user.name}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
