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
} from "lucide-react";

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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Unresolved Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">08</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Avg Resolution Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.2h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              System Trust Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">98.4%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Incident Log</CardTitle>
              <CardDescription>
                Review and resolve community reported issues.
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by User or Trip ID..."
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DUMMY_INCIDENTS.map((incident) => (
                <TableRow key={incident.id}>
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
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
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
    // Sync wrapper for future tRPC mutations
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
        <DropdownMenuLabel>Incident Management</DropdownMenuLabel>
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
          className="text-emerald-500"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Resolved
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            handleAction("ban");
          }}
          className="text-destructive font-semibold"
        >
          <ShieldAlert className="mr-2 h-4 w-4" /> Suspend Reported User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
