import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  helper?: React.ReactNode;
  trend?: { dir: "up" | "down" | "flat"; text: string };
  className?: string;
  intent?: "default" | "warning" | "success" | "danger";
  icon?: React.ReactNode;
  id?: string;
}

const intentRing: Record<NonNullable<KpiCardProps["intent"]>, string> = {
  default: "",
  warning: "ring-1 ring-chart-3/20",
  success: "ring-1 ring-chart-5/20",
  danger: "ring-1 ring-destructive/20",
};

export function KpiCard({ id, label, value, helper, trend, className, intent = "default", icon, ...props }: KpiCardProps & React.HTMLAttributes<HTMLDivElement>) {
  const trendColor =
    trend?.dir === "up" ? "text-chart-5" : trend?.dir === "down" ? "text-destructive" : "text-muted-foreground";
  return (
    <Card id={id} className={cn("p-5", intentRing[intent], className)} {...props}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      </div>
      <div className="mt-3 text-2xl font-semibold leading-tight tracking-tight">{value}</div>
      {(helper || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend ? <span className={cn("font-medium", trendColor)}>{trend.text}</span> : null}
          {helper ? <span className="text-muted-foreground">{helper}</span> : null}
        </div>
      )}
    </Card>
  );
}
