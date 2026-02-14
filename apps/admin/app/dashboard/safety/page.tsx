"use client";

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

const SAFETY_KPIs = [
  {
    title: "Unresolved Reports",
    value: "08",
    icon: ShieldAlert,
    status: "error" as const,
  },
  {
    title: "Avg Resolution",
    value: "4.2h",
    icon: Timer,
    status: "info" as const,
  },
  {
    title: "Trust Score",
    value: "98.4%",
    icon: Users,
    status: "success" as const,
  },
];

interface IncidentReport {
  id: string;
  reporter: string;
  accused: string;
  type: "harassment" | "dangerous-driving" | "unauthorized-vehicle" | "other";
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved";
  timestamp: string;
  tripId: string;
}

const DUMMY_INCIDENTS: IncidentReport[] = [
  {
    id: "INC-001",
    reporter: "Sarah C.",
    accused: "Mark L.",
    type: "dangerous-driving",
    severity: "high",
    status: "investigating",
    timestamp: "2026-02-13 14:20",
    tripId: "T-882",
  },
  {
    id: "INC-002",
    reporter: "John D.",
    accused: "Aidan M.",
    type: "unauthorized-vehicle",
    severity: "medium",
    status: "open",
    timestamp: "2026-02-13 16:45",
    tripId: "T-901",
  },
  {
    id: "SOS-99",
    reporter: "Unknown",
    accused: "System Alert",
    type: "other",
    severity: "critical",
    status: "open",
    timestamp: "2026-02-13 21:05",
    tripId: "T-112",
  },
];

function SeverityBadge({ severity }: { severity: IncidentReport["severity"] }) {
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
}

function StatusIcon({ status }: { status: IncidentReport["status"] }) {
  if (status === "resolved")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "investigating")
    return <Clock className="h-4 w-4 text-amber-500" />;
  return <AlertCircle className="h-4 w-4 text-destructive" />;
}

export default function SafetyPage() {
  return (
    <div className="p-8 space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Safety Operations
          </h1>
          <p className="text-muted-foreground font-medium">
            Monitor community reports and emergency SOS signals.
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {SAFETY_KPIs.map((kpi) => (
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
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[100px] text-[10px] uppercase tracking-wider">
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
              {DUMMY_INCIDENTS.map((incident) => (
                <TableRow key={incident.id} className="group">
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
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold capitalize">
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
}

function IncidentActions({ incident }: { incident: IncidentReport }) {
  const handleAction = (action: string) => {
    const perform = () => {
      // eslint-disable-next-line no-console
      console.log(`Action: ${action} for Incident: ${incident.id}`);
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
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Safety Protocol
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => {
            handleAction("view");
          }}
        >
          <FileText className="mr-2 h-4 w-4" /> View Full Report
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            handleAction("trip");
          }}
        >
          <Car className="mr-2 h-4 w-4" /> Audit Trip Telemetry
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            handleAction("investigate");
          }}
        >
          <Clock className="mr-2 h-4 w-4" /> Mark Investigating
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            handleAction("resolve");
          }}
          className="text-emerald-500 focus:text-emerald-500 focus:bg-emerald-500/10"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Resolved
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            handleAction("ban");
          }}
          className="text-destructive font-semibold focus:bg-destructive/10 focus:text-destructive"
        >
          <ShieldAlert className="mr-2 h-4 w-4" /> Suspend Reported User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
