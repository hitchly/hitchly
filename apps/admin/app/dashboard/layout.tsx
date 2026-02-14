"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, type ReactNode } from "react";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}

interface AuthSession {
  user: AuthUser;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
}

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

  const segments = pathname.split("/").filter(Boolean);

  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <SidebarProvider>
      <AppSidebar session={session} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />

          <Breadcrumb>
            <BreadcrumbList>
              {segments.map((segment, index) => {
                const href = `/${segments.slice(0, index + 1).join("/")}`;
                const isLast = index === segments.length - 1;
                const label =
                  segment.charAt(0).toUpperCase() + segment.slice(1);

                return (
                  <Fragment key={href}>
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage className="font-semibold text-foreground">
                          {label}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={href} className="capitalize">
                          {label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator />}
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
