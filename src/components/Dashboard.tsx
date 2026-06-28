import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  Building2, ShieldCheck, Users, Banknote, Rocket, CheckCircle2, Circle,
  ExternalLink, Loader2, AlertCircle, MapPin, Flag, ChevronRight, Quote,
} from 'lucide-react';
import NextStepPanel from './AIInsights';
import {
  getJourney, getProfile, updateProfile, setProgress, itemsFor,
  type Geography, type Dimension,
} from '@/lib/api';

const DIM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2, ShieldCheck, Users, Banknote, Rocket,
};

const GEO_OPTIONS: { id: Geography; label: string }[] = [
  { id: 'india', label: '🇮🇳 India' },
  { id: 'us', label: '🇺🇸 United States' },
  { id: 'both', label: '🌐 Both' },
];

const Dashboard = () => {
  const qc = useQueryClient();
  const [viewStage, setViewStage] = useState<string | null>(null);

  const journeyQ = useQuery({ queryKey: ['journey'], queryFn: getJourney });
  const profileQ = useQuery({ queryKey: ['profile'], queryFn: getProfile });

  const profileM = useMutation({
    mutationFn: updateProfile,
    onSuccess: (p) => { qc.setQueryData(['profile'], p); },
    onError: () => toast({ title: 'Could not update profile', variant: 'destructive' }),
  });
  const progressM = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => setProgress(id, done),
    onSuccess: (p) => { qc.setQueryData(['profile'], p); },
    onError: () => toast({ title: 'Could not save progress', variant: 'destructive' }),
  });

  if (journeyQ.isError || profileQ.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-brand-light">
        <Card className="max-w-lg border-red-200">
          <CardContent className="p-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-semibold text-red-600">Can't reach the backend.</p>
              <p className="mt-1">Start it on port 8000:</p>
              <pre className="mt-2 bg-gray-100 rounded p-2 text-xs whitespace-pre-wrap">cd backend
python3 -m venv .venv &amp;&amp; source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const journey = journeyQ.data;
  const profile = profileQ.data;
  if (!journey || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-light">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  const geo = profile.geography;
  const completed = new Set(profile.completed);
  const activeStageId = viewStage ?? profile.stage;
  const stage = journey.stages.find((s) => s.id === activeStageId) ?? journey.stages[0];
  const isCurrent = stage.id === profile.stage;
  const profileKey = `${profile.stage}:${geo}:${profile.completed.length}`;

  const stageBlocks = journey.playbook[stage.id] ?? {};
  const dimsForStage: Dimension[] = journey.dimensions.filter((d) => stageBlocks[d.id]);
  const companies = journey.companies.filter((c) => c.stage === stage.id);

  const doneCount = (sid: string) => {
    const s = journey.stages.find((x) => x.id === sid);
    if (!s) return 0;
    return s.milestones.filter((m) => completed.has(m.id)).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-light to-gray-50">
      {/* Header */}
      <div className="bg-brand-primary text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-3xl font-bold">{journey.meta.title}</div>
              <p className="text-white/80 text-sm mt-1 max-w-2xl">{journey.meta.subtitle}</p>
            </div>
            {/* Geography selector */}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-white/70" />
              {GEO_OPTIONS.map((g) => (
                <Button
                  key={g.id}
                  size="sm"
                  variant={geo === g.id ? 'default' : 'outline'}
                  onClick={() => profileM.mutate({ geography: g.id })}
                  className={geo === g.id
                    ? 'bg-white text-brand-primary hover:bg-white/90'
                    : 'border-white/40 text-white hover:bg-white/10 bg-transparent'}
                >
                  {g.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stage rail */}
      <div className="bg-white border-b border-brand-accent/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 overflow-x-auto">
          <div className="flex items-stretch gap-2 min-w-max">
            {journey.stages.map((s, i) => {
              const done = doneCount(s.id);
              const total = s.milestones.length;
              const allDone = total > 0 && done === total;
              const isActive = s.id === stage.id;
              const isYou = s.id === profile.stage;
              return (
                <div key={s.id} className="flex items-center">
                  <button
                    onClick={() => setViewStage(s.id)}
                    className={`text-left rounded-lg border px-3 py-2 transition-all min-w-[150px] ${
                      isActive
                        ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary'
                        : 'border-gray-200 hover:border-brand-accent'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${allDone ? 'text-green-600' : 'text-brand-accent'}`}>
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold text-brand-primary truncate">{s.name}</span>
                      {isYou && <Flag className="w-3 h-3 text-brand-accent flex-shrink-0" />}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{done}/{total} done</div>
                  </button>
                  {i < journey.stages.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-gray-300 mx-0.5 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stage header */}
          <Card className="shadow-lg border-brand-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl text-brand-primary flex items-center gap-2">
                    {stage.name}
                    {isCurrent && <Badge className="bg-brand-accent text-white">You are here</Badge>}
                  </CardTitle>
                  <p className="text-brand-accent font-medium mt-1">{stage.tagline}</p>
                </div>
                {!isCurrent && (
                  <Button
                    size="sm"
                    className="bg-brand-primary hover:bg-brand-primary/90 flex-shrink-0"
                    onClick={() => profileM.mutate({ stage: stage.id })}
                  >
                    Set as my stage
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 leading-relaxed">{stage.focus}</p>
              {/* Milestones */}
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-brand-primary">Milestones</p>
                {stage.milestones.map((m) => {
                  const isDone = completed.has(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => progressM.mutate({ id: m.id, done: !isDone })}
                      className="w-full flex items-start gap-2 text-left rounded-md p-2 hover:bg-gray-50 transition-colors"
                    >
                      {isDone
                        ? <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        : <Circle className="w-5 h-5 text-gray-300 mt-0.5 flex-shrink-0" />}
                      <span className={`text-sm ${isDone ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                        {m.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Playbook per dimension */}
          {dimsForStage.map((dim) => {
            const block = stageBlocks[dim.id];
            const items = itemsFor(block, geo);
            if (items.length === 0) return null;
            const Icon = DIM_ICONS[dim.icon] ?? Rocket;
            return (
              <Card key={dim.id} className="shadow-lg border-brand-accent/20">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-brand-primary flex items-center gap-2 text-lg">
                    <Icon className="w-5 h-5 text-brand-accent" /> {dim.label}
                  </CardTitle>
                  {block.summary && <p className="text-sm text-gray-600 mt-1">{block.summary}</p>}
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {items.map((it, i) => (
                    <div key={i} className="rounded-lg border border-gray-200 p-3 hover:border-brand-accent/40 transition-colors">
                      <p className="text-sm font-semibold text-brand-primary">{it.action}</p>
                      <a
                        href={it.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-brand-accent hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        {it.where} <ExternalLink className="h-3 w-3" />
                      </a>
                      {it.note && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{it.note}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {/* Company precedents */}
          {companies.length > 0 && (
            <Card className="shadow-lg border-brand-neutral/20">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-brand-primary flex items-center gap-2 text-lg">
                  <Quote className="w-5 h-5 text-brand-neutral" /> How top companies did it
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {companies.map((c) => (
                  <div key={c.name} className="border-l-2 border-brand-accent/40 pl-3">
                    <p className="text-sm font-semibold text-brand-primary">{c.name} <span className="font-normal text-gray-500">— {c.does}</span></p>
                    <p className="text-sm text-gray-700 mt-1">{c.move}</p>
                    <p className="text-sm text-brand-accent mt-1">Lesson: {c.lesson}</p>
                    <a
                      href={c.source}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-gray-400 hover:text-brand-accent hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      source <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="lg:sticky lg:top-6 space-y-6">
            <NextStepPanel profileKey={profileKey} />
            <Card className="border-gray-200 bg-gray-50/50">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 leading-relaxed">{journey.meta.disclaimer}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-gray-500 border-t pt-6 pb-8 max-w-7xl mx-auto px-6">
        <p className="font-medium text-lg text-brand-primary">{journey.meta.title}</p>
        <p className="text-xs mt-2">Stage-aware playbook · India &amp; US · grounded in real sources and how the best did it</p>
      </div>
    </div>
  );
};

export default Dashboard;
