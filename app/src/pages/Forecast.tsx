import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, AlertCircle, ArrowDown, ArrowUp } from "lucide-react";
import { Money } from "@/components/shared/Money";

export function Forecast() {
  const data = [
    { day: "Mon", val: 80, event: "Payroll" },
    { day: "Tue", val: 75, event: null },
    { day: "Wed", val: 45, event: "Vendor Pay" },
    { day: "Thu", val: 42, event: null },
    { day: "Fri", val: 38, event: "Cloud SaaS" },
    { day: "Sat", val: 55, event: "Auto-Sweep" },
    { day: "Sun", val: 62, event: null },
  ];

  return (
    <div id="forecast-section" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card id="forecast-chart" data-tour="forecast-chart" className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                7-Day Liquidity Projection
              </CardTitle>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-xs">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">Projected Balance</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full flex items-end justify-between gap-2 pt-4">
              {data.map((d, i) => (
                <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-2 group relative">
                  {d.event && (
                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <div className="bg-black/80 backdrop-blur-md border border-white/10 p-2 rounded-md shadow-xl whitespace-nowrap">
                        <p className="text-[10px] font-bold text-white uppercase">{d.event}</p>
                        <p className="text-[10px] text-white/60">Estimated -$12k</p>
                      </div>
                    </div>
                  )}
                  <div 
                    className="w-full bg-primary/20 hover:bg-primary/40 transition-colors rounded-t-sm relative"
                    style={{ height: `${d.val}%` }}
                  >
                    {d.val < 40 && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                        <AlertCircle className="h-4 w-4 text-chart-3" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">{d.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card id="forecast-intelligence" data-tour="forecast-intelligence" className="border-chart-3/20 bg-chart-3/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-chart-3">AI Intelligence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm font-bold leading-tight">Liquidity Gap Detected</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                "Based on scheduled vendor payments on Wednesday and Friday, your Base Operating wallet will drop below the $50k target floor."
              </p>
              <div data-tour="forecast-recommendation" className="p-3 bg-black/20 rounded-lg border border-chart-3/10 flex items-start gap-3">
                <div className="mt-0.5 p-1 rounded bg-chart-3/20 text-chart-3">
                  <TrendingUp className="h-3 w-3" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold">Recommended Rebalance</p>
                  <p className="text-[10px] text-muted-foreground">Move <Money amount={25080} /> from ETH Reserve to Base Operating by Tuesday 10:00 AM.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Flow Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-chart-5/10 text-chart-5"><ArrowUp className="h-3 w-3" /></div>
                  <span className="text-xs">Scheduled Inflow</span>
                </div>
                <span className="text-xs font-bold text-chart-5">+$12,500</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-destructive/10 text-destructive"><ArrowDown className="h-3 w-3" /></div>
                  <span className="text-xs">Scheduled Outflow</span>
                </div>
                <span className="text-xs font-bold text-destructive">-$54,200</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
