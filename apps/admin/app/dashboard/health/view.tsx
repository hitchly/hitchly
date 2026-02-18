"use client";

import type { RouterOutputs } from "@hitchly/api-types";
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
import { trpc } from "@/lib/trpc/client";

// TODO: make part of api
const QUOTA_CONFIG = {
  limits: {
    directions: 2500,
    geocoding: 5000,
    monthlyCredit: 200,
  },
  pricing: {
    perCall: 0.005,
  },
};

// TODO: make part of api
const MOBILE_ECOSYSTEM = {
  productionVersion: "v1.0.4-build.82",
  pushService: {
    status: "ONLINE",
    isHealthy: true,
  },
  crashFreeUsers: "99.8%",
};

interface KPI {
  title: string;
  value: string;
  description: string;
  icon: typeof Activity;
  status: "default" | "success" | "warning" | "error" | "info";
}

interface HealthViewProps {
  initialData: RouterOutputs["admin"]["infra"]["metrics"];
}

const HealthView = ({ initialData }: HealthViewProps) => {
  const { data } = trpc.admin.infra.metrics.useQuery(undefined, {
    initialData,
    refetchInterval: 5000,
  });

  const { kpis: stats, quota, logs } = data;

  const estimatedSpend = Math.max(
    0,
    Math.max(0, quota.directions - QUOTA_CONFIG.limits.directions) *
      QUOTA_CONFIG.pricing.perCall +
      Math.max(0, quota.geocoding - QUOTA_CONFIG.limits.geocoding) *
        QUOTA_CONFIG.pricing.perCall
  );

  const kpiList: KPI[] = [
    {
      title: "API Latency",
      value: `${String(stats.latency)}ms`,
      description: "DB Roundtrip",
      icon: Activity,
      status: stats.latency < 100 ? "success" : "warning",
    },
    {
      title: "Cache Hit Rate",
      value: stats.cacheCount.toString(),
      description: "Cached Geometries",
      icon: Database,
      status: "success",
    },
    {
      title: "Mobile Installs",
      value: stats.mobileInstalls.toString(),
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
    <div className="grid grid-cols-1 gap-8">
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
              Free tier monitoring (${QUOTA_CONFIG.limits.monthlyCredit} Monthly
              Credit).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Directions API</span>
                <span className="font-mono">
                  {quota.directions} / {QUOTA_CONFIG.limits.directions} calls
                </span>
              </div>
              <Progress
                value={
                  (quota.directions / QUOTA_CONFIG.limits.directions) * 100
                }
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Geocoding API</span>
                <span className="font-mono">
                  {quota.geocoding} / {QUOTA_CONFIG.limits.geocoding} calls
                </span>
              </div>
              <Progress
                value={(quota.geocoding / QUOTA_CONFIG.limits.geocoding) * 100}
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
                {MOBILE_ECOSYSTEM.productionVersion}
              </Badge>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-medium">
                Push Notification Service
              </span>
              <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
                {MOBILE_ECOSYSTEM.pushService.isHealthy ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                )}
                {MOBILE_ECOSYSTEM.pushService.status}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Crash-Free Users</span>
              <span className="text-xs font-bold text-emerald-500 font-mono">
                {MOBILE_ECOSYSTEM.crashFreeUsers}
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

            {logs.length === 0 && (
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

export default HealthView;
