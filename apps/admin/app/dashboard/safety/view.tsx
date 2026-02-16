"use client";

import type { RouterOutputs } from "@hitchly/api-types";
import {
  AlertCircle,
  Car,
  CheckCircle2,
  Clock,
  FileText,
  MoreHorizontal,
  Search,
  ShieldAlert,
  Timer,
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
import { trpc } from "@/lib/trpc/client";

type MetricsData = RouterOutputs["admin"]["safety"]["metrics"];
type IncidentReport = MetricsData["incidents"][number];

interface SafetyKPI {
  title: string;
  value: string;
  icon: LucideIcon;
  status: "error" | "info" | "success";
}

const SeverityBadge = ({
  severity,
}: {
  severity: IncidentReport["severity"];
}) => {
  const styles = {
    low: "bg-muted text-muted-foreground border-transparent",
    medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    critical:
      "bg-destructive/10 text-destructive border-destructive/20 animate-pulse font-bold",
  };

  return (
    <Badge variant="outline" className={styles[severity]}>
      {severity.toUpperCase()}
    </Badge>
  );
};

const StatusIcon = ({ status }: { status: IncidentReport["status"] }) => {
  if (status === "resolved")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "investigating")
    return <Clock className="h-4 w-4 text-amber-500" />;
  return <AlertCircle className="h-4 w-4 text-destructive" />;
};

const IncidentActions = ({ incident }: { incident: IncidentReport }) => {
  const utils = trpc.useUtils();
  const rawId = parseInt(incident.id.replace("INC-", ""), 10);

  const updateStatus = trpc.admin.safety.updateStatus.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`Incident status updated to ${vars.status}`);
      void utils.admin.safety.metrics.invalidate();
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Safety Protocol
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => toast.info("Full report telemetry requested.")}
        >
          <FileText className="mr-2 h-4 w-4" /> View Full Report
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            window.open(
              `/dashboard/operations?trip=${incident.tripId}`,
              "_blank"
            )
          }
        >
          <Car className="mr-2 h-4 w-4" /> Audit Trip Telemetry
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            updateStatus.mutate({ id: rawId, status: "investigating" });
          }}
        >
          <Clock className="mr-2 h-4 w-4" /> Mark Investigating
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            updateStatus.mutate({ id: rawId, status: "resolved" });
          }}
          className="text-emerald-500 focus:text-emerald-500 focus:bg-emerald-500/10"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Resolved
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface SafetyViewProps {
  initialData: MetricsData;
}

const SafetyView = ({ initialData }: SafetyViewProps) => {
  const [data] = trpc.admin.safety.metrics.useSuspenseQuery(undefined, {
    initialData,
    refetchInterval: 5000,
  });

  const { kpis, incidents: incidentList } = data;

  const safetyKPIs: SafetyKPI[] = [
    {
      title: "Unresolved Reports",
      value: String(kpis.unresolvedReports).padStart(2, "0"),
      icon: ShieldAlert,
      status: "error",
    },
    {
      title: "Avg Resolution",
      value: kpis.avgResolutionTime,
      icon: Timer,
      status: "info",
    },
    {
      title: "Trust Score",
      value: kpis.trustScore,
      icon: Users,
      status: "success",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        {safetyKPIs.map((kpi) => (
          <MetricCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            status={kpi.status}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Incident Log
              </CardTitle>
              <CardDescription>
                Review and resolve community reported issues.
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by User or Trip ID..."
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-25 text-[10px] uppercase tracking-wider">
                  ID
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">
                  Severity
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">
                  Details
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">
                  Timestamp
                </TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidentList.map((incident) => (
                <TableRow key={incident.id} className="group border-muted/50">
                  <TableCell className="font-mono text-xs font-bold">
                    {incident.id}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StatusIcon status={incident.status} />
                      <span className="text-xs capitalize font-medium">
                        {incident.status}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <SeverityBadge severity={incident.severity} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span className="font-semibold capitalize">
                        {incident.type.replace("-", " ")}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Reporter: {incident.reporter} | Trip: {incident.tripId}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                    {incident.timestamp}
                  </TableCell>
                  <TableCell className="text-right">
                    <IncidentActions incident={incident} />
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

export default SafetyView;
