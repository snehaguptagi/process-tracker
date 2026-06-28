import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, AlertCircle, ArrowRight, ExternalLink, Quote } from "lucide-react";
import { getNextStep, type NextStep } from "@/lib/api";

interface NextStepPanelProps {
  /** Bump this to invalidate a stale recommendation when the profile changes. */
  profileKey: string;
}

/**
 * Suggests the single most suitable next move for the founder's current stage,
 * geography and progress. Runs Claude when ANTHROPIC_API_KEY is configured
 * server-side, or a deterministic heuristic otherwise — both grounded ONLY in
 * the sourced knowledge base (every link comes from a real, cited source).
 */
const NextStepPanel = ({ profileKey }: NextStepPanelProps) => {
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState("");
  const [step, setStep] = useState<NextStep | null>(null);
  const [error, setError] = useState("");
  const [forKey, setForKey] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    setStep(null);
    try {
      const res = await getNextStep();
      setEngine(res.engine);
      setStep(res.next_step);
      setForKey(profileKey);
    } catch {
      setError("Couldn't reach the backend. Is it running on port 8000?");
    }
    setLoading(false);
  };

  const stale = step !== null && forKey !== profileKey;

  return (
    <Card className="shadow-lg border border-brand-accent/20" id="next-step">
      <CardHeader className="bg-brand-primary text-white rounded-t-lg">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span className="flex items-center">
            <Sparkles className="h-5 w-5 mr-3" />
            Your most suitable next step
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
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Thinking…</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" /> Suggest my next step</>
          )}
        </Button>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-md p-3">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {stale && (
          <p className="text-xs text-amber-600">
            Your profile changed — re-run to refresh this recommendation.
          </p>
        )}

        {step && (
          <div className="space-y-4">
            <div className="rounded-lg p-4 border border-brand-accent/30 bg-gradient-to-br from-white to-blue-50">
              <p className="text-base font-semibold text-brand-primary flex items-start gap-2">
                <ArrowRight className="h-5 w-5 text-brand-accent mt-0.5 flex-shrink-0" />
                {step.step}
              </p>
              <p className="text-sm text-gray-700 mt-2 leading-relaxed">{step.why}</p>
            </div>

            {step.where.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-brand-primary mb-2">Where to do it</p>
                <ul className="space-y-1.5">
                  {step.where.map((w, i) => (
                    <li key={i}>
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-brand-accent hover:underline inline-flex items-center gap-1"
                      >
                        {w.label} <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step.precedent && (
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                <p className="text-sm font-semibold text-brand-primary flex items-center gap-1 mb-1">
                  <Quote className="h-4 w-4 text-brand-neutral" /> How {step.precedent.company} did it
                </p>
                <p className="text-sm text-gray-700">{step.precedent.lesson}</p>
                <a
                  href={step.precedent.source}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand-accent hover:underline inline-flex items-center gap-1 mt-1"
                >
                  source <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {!step && !error && !loading && (
          <p className="text-sm text-gray-500">
            Reads your stage, geography and progress, then recommends the single highest-leverage
            move — with real links and a precedent from a company that did it.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default NextStepPanel;
