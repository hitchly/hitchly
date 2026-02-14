"use client";

import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  History,
  Search,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Payout {
  id: string;
  driver: string;
  amount: number;
  status: "paid" | "pending" | "action-required";
  stripeId: string;
  lastPayout: string;
}

const PAYMENT_KPIs = [
  {
    title: "Gross Volume",
    value: "$12,450",
    icon: Wallet,
    description: "total driver earnings",
    status: "default" as const,
  },
  {
    title: "Net Revenue",
    value: "$842.20",
    icon: CreditCard,
    description: "hitchly platform fees",
    status: "success" as const,
  },
  {
    title: "Active Connect",
    value: "124",
    icon: CheckCircle2,
    description: "verified accounts",
    status: "info" as const,
  },
  {
    title: "Payouts Pending",
    value: "$1,204",
    icon: History,
    description: "in-flight transfers",
    status: "warning" as const,
  },
];

const RAW_REVENUE_DATA = [
  { month: "Sep", total: 1200 },
  { month: "Oct", total: 1900 },
  { month: "Nov", total: 2400 },
  { month: "Dec", total: 1100 },
  { month: "Jan", total: 2800 },
  { month: "Feb", total: 3400 },
];

const REVENUE_DATA = RAW_REVENUE_DATA.map((item, index) => ({
  ...item,
  fill:
    index === RAW_REVENUE_DATA.length - 1
      ? "hsl(var(--primary))"
      : "hsl(var(--muted-foreground) / 0.2)",
}));

const DUMMY_PAYOUTS: Payout[] = [
  {
    id: "P1",
    driver: "Aidan Marshall",
    amount: 154.2,
    status: "paid",
    stripeId: "acct_1Ou",
    lastPayout: "Feb 12, 2026",
  },
  {
    id: "P2",
    driver: "Sarah Chen",
    amount: 89.5,
    status: "pending",
    stripeId: "acct_1Pv",
    lastPayout: "Pending",
  },
  {
    id: "P3",
    driver: "John Doe",
    amount: 0.0,
    status: "action-required",
    stripeId: "acct_1Qw",
    lastPayout: "N/A",
  },
  {
    id: "P4",
    driver: "Marcus Lee",
    amount: 210.0,
    status: "paid",
    stripeId: "acct_1Rx",
    lastPayout: "Feb 10, 2026",
  },
];

function PayoutStatus({ status }: { status: Payout["status"] }) {
  const styles = {
    paid: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    pending: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    "action-required":
      "bg-destructive/10 text-destructive border-destructive/20 animate-pulse font-bold",
  };

  const icons = {
    paid: <CheckCircle2 className="mr-1 h-3 w-3" />,
    pending: <History className="mr-1 h-3 w-3" />,
    "action-required": <AlertCircle className="mr-1 h-3 w-3" />,
  };

  return (
    <Badge variant="outline" className={styles[status]}>
      {icons[status]}
      {status.replace("-", " ")}
    </Badge>
  );
}

export default function PaymentsPage() {
  return (
    <div className="p-8 space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financials</h1>
          <p className="text-muted-foreground font-medium">
            Stripe Connect integrity and platform fee capture.
          </p>
        </div>
        <Button className="gap-2" variant="outline">
          Stripe Dashboard <ArrowUpRight className="h-4 w-4" />
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PAYMENT_KPIs.map((kpi) => (
          <MetricCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            description={kpi.description}
            status={kpi.status}
          />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Fee Accrual
            </CardTitle>
            <CardDescription>
              Monthly Hitchly platform fees (CAD).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-75">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REVENUE_DATA}>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${String(v)}`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="fill" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Connect Audit
                </CardTitle>
                <CardDescription>Driver payout status audit.</CardDescription>
              </div>
              <div className="relative w-32 shrink-0">
                <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Filter..."
                  className="h-8 pl-7 text-[10px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="text-[10px] uppercase tracking-wider">
                    Driver
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">
                    Amount
                  </TableHead>
                  <TableHead className="text-right text-[10px] uppercase tracking-wider">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DUMMY_PAYOUTS.map((payout) => (
                  <TableRow key={payout.id} className="group border-muted/50">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">
                          {payout.driver}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {payout.stripeId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-bold font-mono">
                      ${payout.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <PayoutStatus status={payout.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
