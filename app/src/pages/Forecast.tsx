import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useStore } from "@/store";
import { Activity } from "lucide-react";

export function Forecast() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Predictive Forecast</h1>
        <p className="text-sm text-muted-foreground mt-1">AI balance projections</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            7-Day Projection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-dashed border rounded-md">
            <p className="text-sm text-muted-foreground text-center">
              Perplexity AI Recommendation:<br/>
              Based on scheduled payroll and sweep patterns, your balance will drop to $50k by Wednesday.<br/>
              Recommend rebalancing by Tuesday.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
