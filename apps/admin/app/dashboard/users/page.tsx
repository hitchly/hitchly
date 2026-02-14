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
} from "lucide-react";

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

// --- Data Objects (Swap with tRPC hooks) ---

const USER_KPIs = [
  {
    title: "Total Users",
    value: "856",
    icon: Users,
    description: "McMaster Verified",
    status: "info" as const,
  },
  {
    title: "Pending Audit",
    value: "12",
    icon: ShieldAlert,
    description: "Requires Manual Action",
    status: "warning" as const,
  },
  {
    title: "Active Drivers",
    value: "124",
    icon: UserCheck,
    description: "Stripe Onboarded",
    status: "success" as const,
  },
  {
    title: "Banned",
    value: "3",
    icon: UserX,
    description: "Safety Violations",
    status: "error" as const,
  },
];

interface UserData {
  id: string;
  name: string;
  email: string;
  status: "verified" | "pending" | "banned";
  role: "student" | "admin";
  rating: number;
  tripsCompleted: number;
  joinedDate: string;
}

const DUMMY_USERS: UserData[] = [
  {
    id: "1",
    name: "Aidan Marshall",
    email: "marshala@mcmaster.ca",
    status: "verified",
    role: "admin",
    rating: 5.0,
    tripsCompleted: 42,
    joinedDate: "2024-01-15",
  },
  {
    id: "2",
    name: "Sarah Chen",
    email: "chens12@mcmaster.ca",
    status: "verified",
    role: "student",
    rating: 4.8,
    tripsCompleted: 12,
    joinedDate: "2024-02-01",
  },
  {
    id: "3",
    name: "John Doe",
    email: "doej@mcmaster.ca",
    status: "pending",
    role: "student",
    rating: 0,
    tripsCompleted: 0,
    joinedDate: "2024-02-10",
  },
  {
    id: "4",
    name: "Bad Actor",
    email: "bad@mcmaster.ca",
    status: "banned",
    role: "student",
    rating: 1.2,
    tripsCompleted: 2,
    joinedDate: "2023-11-20",
  },
];

// --- Sub-components ---

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

// --- Main Page ---

export default function UsersPage() {
  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Community Audit</h1>
        <p className="text-muted-foreground">
          Verify student identities and manage account standings.
        </p>
      </header>

      {/* 1. Standardized Metric Grid */}
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

      {/* 2. Main Data Table */}
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
              <TableRow className="hover:bg-transparent">
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
              {DUMMY_USERS.map((user) => (
                <TableRow key={user.id} className="group">
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
}

function UserActions({ user }: { user: UserData }) {
  const handleAction = (action: string) => {
    // Sync wrapper for tRPC mutations
    const perform = () => {
      // eslint-disable-next-line no-console
      console.log(`Action: ${action} on user ${user.id}`);
    };
    perform();
  };

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
        <DropdownMenuItem
          onClick={() => {
            handleAction("view");
          }}
        >
          View Trip History
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user.status === "pending" && (
          <DropdownMenuItem
            onClick={() => {
              handleAction("verify");
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
              handleAction("ban");
            }}
          >
            <UserX className="mr-2 h-4 w-4" />
            <span>Restrict Access</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => {
              handleAction("unban");
            }}
          >
            Restore Access
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
