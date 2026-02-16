"use client";

import type { User } from "better-auth/types";
import {
  Activity,
  Car,
  ChevronUp,
  CreditCard,
  LogOut,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import EnvironmentBadge from "@/components/dashboard/dev-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth/client";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { label: "Operations", href: "/dashboard/operations", icon: Car },
  { label: "Users", href: "/dashboard/users", icon: Users },
  { label: "Safety", href: "/dashboard/safety", icon: ShieldAlert },
  { label: "Finances", href: "/dashboard/finances", icon: CreditCard },
  { label: "Health", href: "/dashboard/health", icon: Activity },
];

export function AppSidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();

  const userInitials = (user.name || "U").charAt(0).toUpperCase();

  const handleSignOut = async (): Promise<void> => {
    try {
      await authClient.signOut();
      router.push("/sign-in");
      toast.success("Signed out successfully");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Logout failed";
      toast.error(message);
    }
  };

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="h-14 border-b flex flex-row items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <Car className="h-5 w-5 text-primary" />
          <span className="group-data-[collapsible=icon]:hidden">Hitchly</span>
        </Link>
        <div className="group-data-[collapsible=icon]:hidden">
          <EnvironmentBadge />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.image ?? ""} alt={user.name} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              >
                <div className="flex items-center gap-2 p-2">
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => void handleSignOut()}
                  className="text-destructive focus:bg-destructive/10 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
