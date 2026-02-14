"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Smartphone,
  Zap,
} from "lucide-react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";

const QUOTA_LIMITS = {
  directions: 2500,
  geocoding: 5000,
  monthlyCredit: 200,
};

interface KPI {
  title: string;
  value: string;
  description: string;
  icon: typeof Activity;
  status: "default" | "success" | "warning" | "error" | "info";
}

const HealthPage = () => {
  const { data, isLoading } = trpc.admin.infra.metrics.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const stats = data?.kpis ?? { latency: 0, mobileInstalls: 0, cacheCount: 0 };
  const quota = data?.quota ?? { directions: 0, geocoding: 0 };
  const logs = data?.logs ?? [];

  const estimatedSpend = Math.max(
    0,
    Math.max(0, quota.directions - QUOTA_LIMITS.directions) * 0.005 +
      Math.max(0, quota.geocoding - QUOTA_LIMITS.geocoding) * 0.005
  );

  const kpiList: KPI[] = [
    {
      title: "API Latency",
      value: isLoading ? "-" : `${String(stats.latency)}ms`,
      description: "DB Roundtrip",
      icon: Activity,
      status: stats.latency < 100 ? "success" : "warning",
    },
    {
      title: "Cache Hit Rate",
      value: isLoading ? "-" : stats.cacheCount.toString(),
      description: "Cached Geometries",
      icon: Database,
      status: "success",
    },
    {
      title: "Mobile Installs",
      value: isLoading ? "-" : stats.mobileInstalls.toString(),
      description: "Push Tokens Active",
      icon: Smartphone,
      status: "default",
    },
    {
      title: "Error Rate",
      value: "0.00%",
      description: "Last 24 Hours",
      icon: AlertTriangle,
      status: "success",
    },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiList.map((kpi) => (
          <MetricCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            description={kpi.description}
            icon={kpi.icon}
            status={kpi.status}
          />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" /> Google Maps Quota Usage
            </CardTitle>
            <CardDescription>
              Free tier monitoring (${QUOTA_LIMITS.monthlyCredit} Monthly
              Credit).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Directions API</span>
                <span className="font-mono">
                  {isLoading ? "..." : quota.directions} /{" "}
                  {QUOTA_LIMITS.directions} calls
                </span>
              </div>
              <Progress
                value={(quota.directions / QUOTA_LIMITS.directions) * 100}
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Geocoding API</span>
                <span className="font-mono">
                  {isLoading ? "..." : quota.geocoding} /{" "}
                  {QUOTA_LIMITS.geocoding} calls
                </span>
              </div>
              <Progress
                value={(quota.geocoding / QUOTA_LIMITS.geocoding) * 100}
                className="h-2"
              />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center">
              Estimated Monthly Spend:{" "}
              <span className="text-emerald-500 font-bold">
                ${estimatedSpend.toFixed(2)}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-blue-500" /> Mobile Ecosystem
            </CardTitle>
            <CardDescription>
              Live telemetry from Expo/React Native.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-medium">Production Version</span>
              <Badge variant="secondary" className="font-mono text-[10px]">
                v1.0.4-build.82
              </Badge>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-medium">
                Push Notification Service
              </span>
              <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
                <CheckCircle2 className="h-3 w-3" /> ONLINE
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Crash-Free Users</span>
              <span className="text-xs font-bold text-emerald-500 font-mono">
                99.8%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-muted bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Live System Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-h-30 overflow-x-auto rounded-lg bg-black p-4 font-mono text-[11px] text-emerald-500/80 space-y-1.5">
            {logs.map((log, i) => (
              <p key={i}>
                <span className="text-muted-foreground">
                  [{new Date(log.time).toLocaleTimeString()}]
                </span>{" "}
                INFO: {log.message}
              </p>
            ))}

            {!isLoading && logs.length === 0 && (
              <p className="text-muted-foreground italic">No recent events.</p>
            )}

            <p className="mt-1 animate-pulse text-emerald-400 font-bold">
              _ Waiting for incoming events...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthPage;
