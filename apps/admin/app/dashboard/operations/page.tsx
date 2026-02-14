"use client";

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

const OPERATIONAL_KPIs = [
  {
    title: "Active Rides",
    value: "24",
    icon: Car,
    status: "info" as const,
  },
  {
    title: "Avg. Detour",
    value: "4.2m",
    icon: Clock,
    status: "success" as const,
  },
  {
    title: "Search Rate",
    value: "82%",
    icon: Zap,
    status: "success" as const,
  },
  {
    title: "Seat Utilization",
    value: "68%",
    icon: Users,
    status: "warning" as const,
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

const HOTSPOTS = [
  { name: "McMaster Student Centre", percentage: "42%" },
  { name: "Westdale Hub", percentage: "28%" },
  { name: "Main St @ Emerson", percentage: "15%" },
];

interface Trip {
  id: string;
  driver: string;
  origin: string;
  destination: string;
  status: "searching" | "en-route" | "completed" | "cancelled";
  detourTime: number;
}

const DUMMY_TRIPS: Trip[] = [
  {
    id: "T1",
    driver: "Aidan M.",
    origin: "Main St W",
    destination: "McMaster",
    status: "en-route",
    detourTime: 4,
  },
  {
    id: "T2",
    driver: "Sarah C.",
    origin: "Dundas",
    destination: "McMaster",
    status: "completed",
    detourTime: 2,
  },
  {
    id: "T3",
    driver: "Marcus L.",
    origin: "McMaster",
    destination: "Burlington",
    status: "searching",
    detourTime: 0,
  },
  {
    id: "T4",
    driver: "Julia K.",
    origin: "Ancaster",
    destination: "McMaster",
    status: "cancelled",
    detourTime: 0,
  },
];

// --- Reusable Sub-components ---

function TripStatusBadge({ status }: { status: Trip["status"] }) {
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

function HotspotItem({
  name,
  percentage,
}: {
  name: string;
  percentage: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 font-medium">
        <MapPin className="h-4 w-4 text-primary" />
        <span className="truncate max-w-[180px]">{name}</span>
      </div>
      <span className="font-mono text-muted-foreground">{percentage}</span>
    </div>
  );
}

export default function OperationsPage() {
  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Operations</h1>
        <p className="text-muted-foreground">
          Live system throughput and trip management.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {OPERATIONAL_KPIs.map((kpi) => (
          <MetricCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            status={kpi.status}
          />
        ))}
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
            {HOTSPOTS.map((spot) => (
              <HotspotItem
                key={spot.name}
                name={spot.name}
                percentage={spot.percentage}
              />
            ))}
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
                      {trip.detourTime}m
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
