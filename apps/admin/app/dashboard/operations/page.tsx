"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Car,
  Clock,
  MapPin,
  MoreHorizontal,
  Users,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TripData {
  id: string;
  driver: string;
  origin: string;
  destination: string;
  status: "searching" | "en-route" | "completed" | "cancelled";
  detourTime: number;
  seats: number;
}

const DUMMY_TRIPS: TripData[] = [
  {
    id: "T1",
    driver: "Aidan M.",
    origin: "Main St W",
    destination: "McMaster",
    status: "en-route",
    detourTime: 4,
    seats: 3,
  },
  {
    id: "T2",
    driver: "Sarah C.",
    origin: "Dundas",
    destination: "McMaster",
    status: "completed",
    detourTime: 2,
    seats: 1,
  },
  {
    id: "T3",
    driver: "Marcus L.",
    origin: "McMaster",
    destination: "Burlington",
    status: "searching",
    detourTime: 0,
    seats: 4,
  },
  {
    id: "T4",
    driver: "Julia K.",
    origin: "Ancaster",
    destination: "McMaster",
    status: "cancelled",
    detourTime: 0,
    seats: 2,
  },
];

const THROUGHPUT_DATA = [
  { time: "08:00", active: 12 },
  { time: "10:00", active: 18 },
  { time: "12:00", active: 15 },
  { time: "14:00", active: 25 },
  { time: "16:00", active: 32 },
  { time: "18:00", active: 20 },
  { time: "20:00", active: 10 },
];

function TripStatusBadge({ status }: { status: TripData["status"] }) {
  const styles = {
    searching: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    "en-route": "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <Badge variant="outline" className={styles[status]}>
      {status.replace("-", " ")}
    </Badge>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend: string;
}

function MetricCard({ title, value, icon: Icon, trend }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="p-2 bg-muted rounded-lg">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {trend}
          </span>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold font-mono">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TripsPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Header with Global Pulse Metrics */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Operations</h1>
          <p className="text-muted-foreground">
            Live system throughput and trip management.
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Rides"
          value="24"
          icon={Car}
          trend="+2 vs last hr"
        />
        <MetricCard
          title="Avg. Detour"
          value="4.2m"
          icon={Clock}
          trend="Optimal"
        />
        <MetricCard
          title="Search Rate"
          value="82%"
          icon={Zap}
          trend="+5% success"
        />
        <MetricCard
          title="Seat Utilization"
          value="68%"
          icon={Users}
          trend="-2% vs avg"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Hourly Activity
            </CardTitle>
            <CardDescription>
              Live active commutes across the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-60 pl-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={THROUGHPUT_DATA}>
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Area
                  type="stepAfter"
                  dataKey="active"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary)/0.1)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Hotspots</CardTitle>
            <CardDescription>Most frequent destinations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4 text-primary" /> McMaster Student
                Centre
              </div>
              <span className="font-mono text-muted-foreground">42%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4 text-primary" /> Westdale Hub
              </div>
              <span className="font-mono text-muted-foreground">28%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Active Logs</CardTitle>
            <CardDescription>
              Real-time trip requests and state changes.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            Download CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DUMMY_TRIPS.map((trip) => (
                <TableRow key={trip.id} className="group">
                  <TableCell className="font-medium">{trip.driver}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span>{trip.origin}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span>{trip.destination}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <TripStatusBadge status={trip.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {String(trip.detourTime)}m
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Telemetry</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Force Kill Trip
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
