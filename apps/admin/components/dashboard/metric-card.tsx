"use client";

import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  status?: "default" | "success" | "warning" | "error" | "info";
  trend?: string;
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  status = "default",
  trend,
}: MetricCardProps) {
  const statusColors = {
    default: "text-muted-foreground",
    success: "text-emerald-500",
    warning: "text-amber-500",
    error: "text-destructive",
    info: "text-blue-500",
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          {trend && (
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {trend}
            </span>
          )}
          <Icon className={cn("h-4 w-4", statusColors[status])} />
        </div>
      </CardHeader>
      <CardContent>
        {/* String() cast here satisfies the ESLint restrict-template-expressions rule */}
        <div className="text-2xl font-bold font-mono">{String(value)}</div>
        {description && (
          <p className="text-[10px] text-muted-foreground mt-1 lowercase italic">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
