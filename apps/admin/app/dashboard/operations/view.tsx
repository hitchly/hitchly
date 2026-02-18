"use client";

import type { RouterOutputs } from "@hitchly/api-types";
import {
  ArrowRight,
  Car,
  Clock,
  MapPin,
  MoreHorizontal,
  Users,
  Zap,
  type LucideIcon,
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
import { trpc } from "@/lib/trpc/client";

type MetricsData = RouterOutputs["admin"]["ops"]["metrics"];

interface KPI {
  title: string;
  value: string;
  icon: LucideIcon;
  status: "default" | "success" | "warning" | "error" | "info";
}

const TripStatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, string> = {
    pending: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    scheduled: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    searching: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    active: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    in_progress: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    "en-route": "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const style = variants[status] ?? "bg-muted text-muted-foreground";

  return (
    <Badge variant="outline" className={style}>
      {status.replace("_", " ")}
    </Badge>
  );
};

const HotspotItem = ({
  name,
  percentage,
}: {
  name: string;
  percentage: string;
}) => {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 font-medium">
        <MapPin className="h-4 w-4 text-primary" />
        <span className="truncate max-w-45">{name}</span>
      </div>
      <span className="font-mono text-muted-foreground">{percentage}</span>
    </div>
  );
};

interface OperationsViewProps {
  initialData: MetricsData;
}

const OperationsView = ({ initialData }: OperationsViewProps) => {
  const [data] = trpc.admin.ops.metrics.useSuspenseQuery(undefined, {
    initialData,
    refetchInterval: 5000,
  });

  const { kpis, throughput, hotspots, recentTrips } = data;

  const operationalKPIs: KPI[] = [
    {
      title: "Active Rides",
      value: String(kpis.activeRides),
      icon: Car,
      status: "info",
    },
    {
      title: "Avg. Detour",
      value: `${String(kpis.avgDetour)}m`,
      icon: Clock,
      status: kpis.avgDetour < 10 ? "success" : "warning",
    },
    {
      title: "Total Requests",
      value: String(kpis.totalRequests),
      icon: Zap,
      status: "success",
    },
    {
      title: "Seat Utilization",
      value: `${String(kpis.seatUtilization)}%`,
      icon: Users,
      status: kpis.seatUtilization > 50 ? "success" : "warning",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {operationalKPIs.map((kpi) => (
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
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Hourly Activity
            </CardTitle>
            <CardDescription>Active commuters (Last 24h).</CardDescription>
          </CardHeader>
          <CardContent className="h-60 pl-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={throughput}>
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
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Hotspots
            </CardTitle>
            <CardDescription>Most frequent destinations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hotspots.map((spot) => (
              <HotspotItem
                key={spot.name}
                name={spot.name}
                percentage={spot.percentage}
              />
            ))}
            {hotspots.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No trips recorded yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Active Logs
            </CardTitle>
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
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="text-[10px] uppercase tracking-wider">
                  Driver
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">
                  Path
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">
                  Time
                </TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider">
                  Manage
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTrips.map((trip) => (
                <TableRow key={trip.id} className="group border-muted/50">
                  <TableCell className="font-medium text-sm">
                    {trip.driver}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="max-w-25 truncate">{trip.origin}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="max-w-25 truncate">
                        {trip.destination}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <TripStatusBadge status={trip.status} />
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {new Date(trip.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
                        <DropdownMenuItem className="text-destructive font-semibold">
                          Force Kill Trip
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {recentTrips.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center h-24 text-muted-foreground text-sm italic"
                  >
                    No active logs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationsView;
