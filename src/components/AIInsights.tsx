import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, AlertCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { getInsights, type Filters, type Insights } from "@/lib/api";

interface AIInsightsProps {
  filters: Filters;
}

/**
 * AI Pipeline Insights — calls the backend, which runs Claude when an
 * ANTHROPIC_API_KEY is configured server-side, or a deterministic heuristic
 * otherwise. Either way the read is grounded in the current filtered metrics.
 */
const AIInsights = ({ filters }: AIInsightsProps) => {
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState("");
  const [insights, setInsights] = useState<Insights | null>(null);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    setInsights(null);
    try {
      const res = await getInsights(filters);
      setEngine(res.engine);
      setInsights(res.insights);
    } catch {
      setError("Couldn't reach the backend. Is it running on port 8000?");
    }
    setLoading(false);
  };

  return (
    <Card className="shadow-lg border border-brand-accent/20 mt-8">
      <CardHeader className="bg-brand-primary text-white rounded-t-lg">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span className="flex items-center">
            <Sparkles className="h-5 w-5 mr-3" />
            AI Pipeline Insights
          </span>
          {engine && (
            <Badge variant="outline" className="text-xs font-normal border-white/40 text-white">
              {engine === "claude" ? "Claude" : "Heuristic"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <Button
          onClick={generate}
          disabled={loading}
          className="bg-brand-primary hover:bg-brand-primary/90 text-white"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing…</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" /> Analyze pipeline with AI</>
          )}
        </Button>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-md p-3">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {insights && (
          <div className="space-y-4">
            <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-200">
              {insights.status}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-brand-primary flex items-center gap-1 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Bottlenecks
                </p>
                <ul className="space-y-1.5">
                  {insights.bottlenecks.map((b, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-amber-500">•</span> {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-primary flex items-center gap-1 mb-2">
                  <ArrowRight className="h-4 w-4 text-brand-accent" /> Recommended actions
                </p>
                <ul className="space-y-1.5">
                  {insights.actions.map((a, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-brand-accent">→</span> {a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {!insights && !error && !loading && (
          <p className="text-sm text-gray-500">
            Reads the current filtered pipeline and flags bottlenecks + the next moves.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AIInsights;
