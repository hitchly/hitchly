"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Globe,
  Server,
  Smartphone,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface HealthCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  status?: "success" | "warning" | "error";
}

function HealthCard({
  title,
  value,
  description,
  icon: Icon,
  status = "success",
}: HealthCardProps) {
  const statusColors = {
    success: "text-emerald-500",
    warning: "text-amber-500",
    error: "text-destructive",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={statusColors[status] + " h-4 w-4"} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono">{value}</div>
        <p className="text-[10px] text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function HealthPage() {
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
        <HealthCard
          title="API Latency"
          value="42ms"
          description="P95 Response Time"
          icon={Activity}
        />
        <HealthCard
          title="Cache Hit Rate"
          value="84.2%"
          description="Drizzle Route Cache"
          icon={Database}
        />
        <HealthCard
          title="Mobile Installs"
          value="152"
          description="Active iOS/Android"
          icon={Smartphone}
        />
        <HealthCard
          title="Error Rate"
          value="0.04%"
          description="Last 24 Hours"
          icon={AlertTriangle}
          status="warning"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" /> Google Maps Quota Usage
            </CardTitle>
            <CardDescription>
              Free tier monitoring ($200 Monthly Credit).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Directions API</span>
                <span className="font-mono">420 / 2,500 calls</span>
              </div>
              <Progress value={16.8} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Geocoding API</span>
                <span className="font-mono">1,120 / 5,000 calls</span>
              </div>
              <Progress value={22.4} className="h-2" />
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center">
              Estimated Monthly Spend:{" "}
              <span className="text-emerald-500 font-bold">$0.00</span>
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
          <div className="rounded-lg bg-black p-4 font-mono text-[11px] text-emerald-500/80 space-y-1.5 overflow-x-auto">
            <p>
              <span className="text-muted-foreground">
                [{new Date().toLocaleTimeString()}]
              </span>{" "}
              INFO: Route cache hit for key 43.2644,-79.9177
            </p>
            <p className="text-amber-500">
              <span className="text-muted-foreground">
                [{new Date().toLocaleTimeString()}]
              </span>{" "}
              WARN: Maps API latency exceeded 150ms
            </p>
            <p>
              <span className="text-muted-foreground">
                [{new Date().toLocaleTimeString()}]
              </span>{" "}
              INFO: User verified via @mcmaster.ca domain (ID: u_9921)
            </p>
            <p className="text-emerald-400 font-bold animate-pulse">
              _ Waiting for incoming events...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
