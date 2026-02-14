"use client";

import {
  MoreHorizontal,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  UserCheck,
  UserX,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { MetricCard } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";

interface UserMetric {
  title: string;
  value: string;
  icon: LucideIcon;
  description: string;
  status: "info" | "warning" | "success" | "error";
}

interface UserData {
  id: string;
  name: string;
  email: string;
  status: "verified" | "pending" | "banned";
  rating: number;
  tripsCompleted: number;
  joinedDate: string;
}

function StatusBadge({ status }: { status: UserData["status"] }) {
  const styles = {
    verified: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    banned: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <Badge variant="outline" className={styles[status]}>
      {status}
    </Badge>
  );
}

const UserActions = ({ user }: { user: UserData }) => {
  const utils = trpc.useUtils();

  const verify = trpc.admin.users.verify.useMutation({
    onSuccess: () => {
      toast.success(`Verified ${user.name}`);
      void utils.admin.users.metrics.invalidate();
    },
  });

  const toggleBan = trpc.admin.users.toggleBan.useMutation({
    onSuccess: (_, variables) => {
      toast.success(
        variables.shouldBan
          ? `Restricted ${user.name}`
          : `Restored ${user.name}`
      );
      void utils.admin.users.metrics.invalidate();
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Audit Flow
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {user.status === "pending" && (
          <DropdownMenuItem
            onClick={() => {
              verify.mutate({ userId: user.id });
            }}
          >
            <ShieldCheck className="mr-2 h-4 w-4 text-emerald-500" />
            <span>Approve Student</span>
          </DropdownMenuItem>
        )}

        {user.status !== "banned" ? (
          <DropdownMenuItem
            className="text-destructive font-medium focus:bg-destructive/10 focus:text-destructive"
            onClick={() => {
              toggleBan.mutate({ userId: user.id, shouldBan: true });
            }}
          >
            <UserX className="mr-2 h-4 w-4" />
            <span>Restrict Access</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => {
              toggleBan.mutate({ userId: user.id, shouldBan: false });
            }}
          >
            <ShieldCheck className="mr-2 h-4 w-4 text-emerald-500" />
            <span>Restore Access</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const UsersPage = () => {
  const { data, isLoading } = trpc.admin.users.metrics.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const stats = data?.kpis ?? { total: 0, pending: 0, drivers: 0, banned: 0 };
  const userList = (data?.users ?? []) as UserData[];

  const USER_KPIs: UserMetric[] = [
    {
      title: "Total Users",
      value: isLoading ? "-" : String(stats.total),
      icon: Users,
      description: "McMaster Verified",
      status: "info",
    },
    {
      title: "Pending Audit",
      value: isLoading ? "-" : String(stats.pending),
      icon: ShieldAlert,
      description: "Requires Manual Action",
      status: "warning",
    },
    {
      title: "Active Drivers",
      value: isLoading ? "-" : String(stats.drivers),
      icon: UserCheck,
      description: "Stripe Onboarded",
      status: "success",
    },
    {
      title: "Banned",
      value: isLoading ? "-" : String(stats.banned),
      icon: UserX,
      description: "Safety Violations",
      status: "error",
    },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {USER_KPIs.map((kpi) => (
          <MetricCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            description={kpi.description}
            status={kpi.status}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                User Directory
              </CardTitle>
              <CardDescription>
                Manual verification required for students without automated SSO.
              </CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="text-[10px] uppercase tracking-wider">
                  Student
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">
                  Standing
                </TableHead>
                <TableHead className="text-center text-[10px] uppercase tracking-wider">
                  Trust Score
                </TableHead>
                <TableHead className="text-center text-[10px] uppercase tracking-wider">
                  Trips
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">
                  Registration
                </TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider">
                  Audit
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userList.map((user) => (
                <TableRow key={user.id} className="group border-muted/50">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{user.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {user.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={user.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1 text-sm font-medium">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {user.rating > 0 ? user.rating.toFixed(1) : "N/A"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {user.tripsCompleted}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {user.joinedDate}
                  </TableCell>
                  <TableCell className="text-right">
                    <UserActions user={user} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersPage;
