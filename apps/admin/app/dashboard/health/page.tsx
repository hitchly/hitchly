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

const SYSTEM_KPIs = [
  {
    title: "API Latency",
    value: "42ms",
    description: "P95 Response Time",
    icon: Activity,
    status: "success" as const,
  },
  {
    title: "Cache Hit Rate",
    value: "84.2%",
    description: "Drizzle Route Cache",
    icon: Database,
    status: "success" as const,
  },
  {
    title: "Mobile Installs",
    value: "152",
    description: "Active iOS/Android",
    icon: Smartphone,
    status: "default" as const,
  },
  {
    title: "Error Rate",
    value: "0.04%",
    description: "Last 24 Hours",
    icon: AlertTriangle,
    status: "warning" as const,
  },
];

const MAPS_QUOTA = {
  monthlyCredit: 200,
  estimatedSpend: 0.0,
  endpoints: [
    { name: "Directions API", current: 420, limit: 2500 },
    { name: "Geocoding API", current: 1120, limit: 5000 },
  ],
};

const MOBILE_HEALTH = {
  version: "v1.0.4-build.82",
  pushServiceStatus: "ONLINE",
  crashFreeRate: "99.8%",
};

const SYSTEM_LOGS = [
  {
    level: "INFO",
    message: "Route cache hit for key 43.2644,-79.9177",
    type: "default",
  },
  {
    level: "WARN",
    message: "Maps API latency exceeded 150ms",
    type: "warning",
  },
  {
    level: "INFO",
    message: "User verified via @mcmaster.ca domain (ID: u_9921)",
    type: "default",
  },
];

export default function HealthPage() {
  const currentTime = new Date().toLocaleTimeString();

  return (
    <div className="p-8 space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground font-medium">
            Infrastructure monitoring and service quotas.
          </p>
        </div>
        <Badge
          variant="outline"
          className="gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
        >
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          All Systems Operational
        </Badge>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {SYSTEM_KPIs.map((kpi) => (
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
              Free tier monitoring (${MAPS_QUOTA.monthlyCredit} Monthly Credit).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {MAPS_QUOTA.endpoints.map((api) => (
              <div key={api.name} className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>{api.name}</span>
                  <span className="font-mono">
                    {api.current} / {api.limit} calls
                  </span>
                </div>
                <Progress
                  value={(api.current / api.limit) * 100}
                  className="h-2"
                />
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center">
              Estimated Monthly Spend:{" "}
              <span className="text-emerald-500 font-bold">
                ${MAPS_QUOTA.estimatedSpend.toFixed(2)}
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
                {MOBILE_HEALTH.version}
              </Badge>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-medium">
                Push Notification Service
              </span>
              <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
                <CheckCircle2 className="h-3 w-3" />{" "}
                {MOBILE_HEALTH.pushServiceStatus}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Crash-Free Users</span>
              <span className="text-xs font-bold text-emerald-500 font-mono">
                {MOBILE_HEALTH.crashFreeRate}
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
          <div className="rounded-lg bg-black p-4 font-mono text-[11px] text-emerald-500/80 space-y-1.5 overflow-x-auto">
            {SYSTEM_LOGS.map((log, i) => (
              <p
                key={i}
                className={log.type === "warning" ? "text-amber-500" : ""}
              >
                <span className="text-muted-foreground">[{currentTime}]</span>{" "}
                {log.level}: {log.message}
              </p>
            ))}
            <p className="text-emerald-400 font-bold animate-pulse">
              _ Waiting for incoming events...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
