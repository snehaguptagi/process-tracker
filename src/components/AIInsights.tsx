import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, KeyRound, Loader2, AlertCircle } from "lucide-react";

// Default model — change to any Claude model your API key can access.
const MODEL = "claude-sonnet-4-6";

interface AIInsightsProps {
  summary: string;
}

const AIInsights = ({ summary }: AIInsightsProps) => {
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("anthropic_api_key") || ""
  );
  const [showKey, setShowKey] = useState(
    () => !localStorage.getItem("anthropic_api_key")
  );
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState("");
  const [error, setError] = useState("");

  const saveKey = (k: string) => {
    setApiKey(k);
    localStorage.setItem("anthropic_api_key", k);
  };

  const generate = async () => {
    if (!apiKey) {
      setError("Enter your Anthropic API key first.");
      setShowKey(true);
      return;
    }
    setLoading(true);
    setError("");
    setInsight("");

    const prompt =
      "You are an operations analyst reviewing a work-item pipeline dashboard. " +
      "Using ONLY the figures below, write a tight analysis with three labelled sections:\n" +
      "1. Status — two sentences on overall pipeline health.\n" +
      "2. Bottlenecks — the 2 stages or record types most at risk, grounded in the numbers.\n" +
      "3. Actions — the 2 highest-leverage next moves.\n\n" +
      `Current pipeline:\n${summary}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 800,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `API error ${res.status}`);
      }
      setInsight(data?.content?.[0]?.text ?? "No response returned.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border border-brand-accent/20 mt-8">
      <CardHeader className="bg-brand-primary text-white rounded-t-lg">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span className="flex items-center">
            <Sparkles className="h-5 w-5 mr-3" />
            AI Pipeline Insights
          </span>
          <button
            onClick={() => setShowKey((s) => !s)}
            className="text-xs font-normal opacity-80 hover:opacity-100 flex items-center"
            aria-label="API key settings"
          >
            <KeyRound className="h-4 w-4 mr-1" />
            {apiKey ? "Change key" : "Set key"}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {showKey && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">
              Anthropic API key (stored only in your browser)
            </label>
            <Input
              type="password"
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={(e) => saveKey(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Get one at{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="text-brand-primary underline"
              >
                console.anthropic.com
              </a>
              .
            </p>
          </div>
        )}

        <Button onClick={generate} disabled={loading} className="bg-brand-primary hover:bg-brand-primary/90 text-white">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Analyze pipeline with AI
            </>
          )}
        </Button>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-md p-3">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {insight && (
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-4 border border-gray-200">
            {insight}
          </div>
        )}

        {!insight && !error && !loading && (
          <p className="text-sm text-gray-500">
            Claude reads the current filtered pipeline and flags bottlenecks + next actions.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AIInsights;
