"use client";

import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  History,
  Search,
  Wallet,
  type LucideIcon,
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
import { trpc } from "@/lib/trpc";

interface Payout {
  id: string;
  driver: string;
  amount: number;
  status: "paid" | "pending" | "action-required";
  stripeId: string;
  lastPayout: string;
}

interface FinancialKPI {
  title: string;
  value: string;
  icon: LucideIcon;
  description: string;
  status: "default" | "success" | "info" | "warning";
}

const PayoutStatus = ({ status }: { status: Payout["status"] }) => {
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
};

const FinancesPage = () => {
  const { data, isLoading } = trpc.admin.finances.metrics.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const stats = data?.kpis ?? {
    grossVolume: 0,
    netRevenue: 0,
    activeConnect: 0,
    payoutsPending: 0,
  };
  const chartData = (data?.revenueChart ?? []).map((item, index, arr) => ({
    ...item,
    fill:
      index === arr.length - 1
        ? "hsl(var(--primary))"
        : "hsl(var(--muted-foreground) / 0.2)",
  }));
  const payoutList = (data?.payouts ?? []) as Payout[];

  const paymentKPIs: FinancialKPI[] = [
    {
      title: "Gross Volume",
      value: isLoading ? "-" : `$${stats.grossVolume.toLocaleString()}`,
      icon: Wallet,
      description: "total driver earnings",
      status: "default",
    },
    {
      title: "Net Revenue",
      value: isLoading ? "-" : `$${stats.netRevenue.toFixed(2)}`,
      icon: CreditCard,
      description: "hitchly platform fees",
      status: "success",
    },
    {
      title: "Active Connect",
      value: isLoading ? "-" : String(stats.activeConnect),
      icon: CheckCircle2,
      description: "verified accounts",
      status: "info",
    },
    {
      title: "Payouts Pending",
      value: isLoading ? "-" : `$${stats.payoutsPending.toLocaleString()}`,
      icon: History,
      description: "in-flight transfers",
      status: "warning",
    },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {paymentKPIs.map((kpi) => (
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
              <BarChart data={chartData}>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${String(v)}`}
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
                <Bar dataKey="total" radius={[4, 4, 0, 0]} />
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
                {payoutList.map((payout) => (
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
};

export default FinancesPage;
