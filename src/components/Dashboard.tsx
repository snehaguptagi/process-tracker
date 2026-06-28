import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  FunnelChart, Funnel, LabelList,
} from 'recharts';
import {
  TrendingUp, FileText, Clock, CheckCircle, Target, Users, ArrowUp, ArrowDown,
  Filter, Plus, Trash2, AlertTriangle, RefreshCw, Loader2, AlertCircle,
} from 'lucide-react';
import AIInsights from './AIInsights';
import {
  getConfig, getItems, getMetrics, createItem, updateItem, deleteItem, reseed,
  type Filters,
} from '@/lib/api';

const BANDS = ['all', '0%', '1-25%', '26-50%', '51-75%', '76-100%'];

const Dashboard = () => {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<Filters>({ type: 'all', stage: 'all', band: 'all' });
  const [newType, setNewType] = useState('');
  const [newStage, setNewStage] = useState('Not Started');

  const configQ = useQuery({ queryKey: ['config'], queryFn: getConfig });
  const itemsQ = useQuery({ queryKey: ['items', filters], queryFn: () => getItems(filters) });
  const metricsQ = useQuery({ queryKey: ['metrics', filters], queryFn: () => getMetrics(filters) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['items'] });
    qc.invalidateQueries({ queryKey: ['metrics'] });
  };

  const createM = useMutation({
    mutationFn: createItem,
    onSuccess: (it) => { toast({ title: 'Item added', description: `${it.record_id} · ${it.stage}` }); refresh(); },
    onError: () => toast({ title: 'Could not add item', variant: 'destructive' }),
  });
  const updateM = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { stage?: string; progress_percent?: number } }) => updateItem(id, body),
    onSuccess: refresh,
    onError: () => toast({ title: 'Update failed', variant: 'destructive' }),
  });
  const deleteM = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => { toast({ title: 'Item deleted' }); refresh(); },
  });
  const seedM = useMutation({
    mutationFn: reseed,
    onSuccess: (d) => { toast({ title: 'Demo data reset', description: `${d.count} items` }); refresh(); },
  });

  const config = configQ.data;
  const items = itemsQ.data ?? [];
  const metrics = metricsQ.data;

  // --- connection / loading states ---
  if (configQ.isError) {
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

  if (!config || !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-light">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  const funnelData = [
    { name: 'Total', value: metrics.total, fill: '#002f5f' },
    { name: 'Started', value: metrics.total - metrics.not_started, fill: '#0077c8' },
    { name: 'In Progress', value: metrics.in_progress, fill: '#60a5fa' },
    { name: 'Completed', value: metrics.completed, fill: '#22c55e' },
  ];

  const setFilter = (key: keyof Filters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const FilterGroup = ({ label, k, options }: { label: string; k: keyof Filters; options: string[] }) => (
    <div>
      <label className="text-sm font-medium text-brand-primary mb-3 block">{label}</label>
      <div className="space-y-2">
        {options.map((opt) => (
          <Button
            key={opt}
            variant={filters[k] === opt ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(k, opt)}
            className={`w-full justify-start text-left ${filters[k] === opt
              ? 'bg-brand-primary hover:bg-brand-primary/90'
              : 'border-brand-accent text-brand-accent hover:bg-brand-accent/10'}`}
          >
            {opt === 'all' ? `All ${label}s` : opt}
          </Button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-light to-gray-50">
      {/* Header */}
      <div className="bg-brand-primary text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-3xl font-bold">Process Tracker</div>
          <div className="text-right">
            <h1 className="text-2xl md:text-3xl font-bold">Workflow Analytics Dashboard</h1>
            <p className="text-white/80 text-sm">{metrics.total} items in view · {config.stages.length}-stage pipeline</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <div className="w-80 p-6 bg-white shadow-lg border-r border-brand-accent/20">
          <div className="sticky top-6 space-y-6">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-brand-primary" />
              <h3 className="text-lg font-semibold text-brand-primary">Filters</h3>
            </div>
            <FilterGroup label="Type" k="type" options={['all', ...config.types]} />
            <FilterGroup label="Stage" k="stage" options={['all', ...config.stages]} />
            <FilterGroup label="Progress" k="band" options={BANDS} />

            {/* Add item */}
            <div className="pt-4 border-t">
              <label className="text-sm font-medium text-brand-primary mb-3 block">Add item</label>
              <div className="space-y-2">
                <select
                  value={newType || config.types[0]}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full rounded-md border border-brand-accent/40 p-2 text-sm"
                >
                  {config.types.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  className="w-full rounded-md border border-brand-accent/40 p-2 text-sm"
                >
                  {config.stages.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <Button
                  size="sm"
                  className="w-full bg-brand-primary hover:bg-brand-primary/90"
                  disabled={createM.isPending}
                  onClick={() => createM.mutate({ record_type: newType || config.types[0], stage: newStage })}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full border-brand-neutral text-brand-neutral hover:bg-brand-neutral/10"
              disabled={seedM.isPending}
              onClick={() => seedM.mutate()}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${seedM.isPending ? 'animate-spin' : ''}`} /> Reset demo data
            </Button>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 p-6 space-y-8">
          {/* Target vs Actual */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {metrics.target_vs_actual.map((item) => (
              <Card key={item.type} className="shadow-lg border-brand-primary/20 bg-gradient-to-br from-white to-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-brand-primary">
                    <span className="flex items-center gap-2"><Target className="w-5 h-5" /> {item.type} — completed vs goal</span>
                    {item.variance >= 0 ? <ArrowUp className="w-5 h-5 text-green-600" /> : <ArrowDown className="w-5 h-5 text-red-600" />}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div><div className="text-xl font-bold text-brand-accent">{item.target.toLocaleString()}</div><div className="text-xs text-gray-600">Goal</div></div>
                    <div><div className="text-xl font-bold text-brand-primary">{item.actual.toLocaleString()}</div><div className="text-xs text-gray-600">Completed</div></div>
                    <div><div className={`text-xl font-bold ${item.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>{item.difference >= 0 ? '+' : ''}{item.difference}</div><div className="text-xs text-gray-600">Gap</div></div>
                  </div>
                  <div className="text-center">
                    <Badge className={item.variance >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{item.variance}% vs goal</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Kpi icon={<FileText className="w-5 h-5 mr-2" />} label="Total Records" value={metrics.total} sub="Active in current view" color="text-brand-primary" />
            <Kpi icon={<CheckCircle className="w-5 h-5 mr-2" />} label="Completed" value={metrics.completed} badge={`${metrics.completion_rate}% completion`} color="text-green-600" />
            <Kpi icon={<Clock className="w-5 h-5 mr-2" />} label="In Progress" value={metrics.in_progress} badge={`${metrics.stuck_total} stuck > ${metrics.stuck_days_threshold}d`} color="text-amber-600" />
            <Kpi icon={<TrendingUp className="w-5 h-5 mr-2" />} label="Avg. Progress" value={`${metrics.avg_progress}%`} sub="Mean completion" color="text-brand-accent" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="shadow-lg border-brand-primary/20">
              <CardHeader className="pb-2"><CardTitle className="text-brand-primary flex items-center gap-2"><Users className="w-5 h-5" /> Progress Funnel</CardTitle></CardHeader>
              <CardContent className="pt-4">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <FunnelChart>
                      <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #0077c8', borderRadius: '8px' }} />
                      <Funnel dataKey="value" data={funnelData} isAnimationActive>
                        <LabelList position="center" fill="#fff" stroke="none" dataKey="name" />
                        <LabelList position="right" fill="#002f5f" stroke="none" dataKey="value" />
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-brand-accent/20">
              <CardHeader className="pb-2"><CardTitle className="text-brand-primary">Distribution by Stage</CardTitle></CardHeader>
              <CardContent className="pt-4">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.stage_distribution} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#a7a9ac" opacity={0.3} />
                      <XAxis type="number" stroke="#a7a9ac" allowDecimals={false} />
                      <YAxis dataKey="stage" type="category" width={75} tick={{ fontSize: 12 }} stroke="#a7a9ac" />
                      <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #0077c8', borderRadius: '8px' }} formatter={(v: number) => [`${v} items`, 'Count']} />
                      <Bar dataKey="count" fill="#0077c8" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Aging / bottleneck */}
          <Card className="shadow-lg border-amber-300/40">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-brand-primary flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> Aging &amp; Bottleneck</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                {metrics.bottleneck ? (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                    <p className="text-sm text-gray-600">Top bottleneck</p>
                    <p className="text-xl font-bold text-amber-700">{metrics.bottleneck.stage}</p>
                    <p className="text-sm text-gray-700 mt-1">{metrics.bottleneck.reason}</p>
                  </div>
                ) : <p className="text-sm text-gray-500">No bottleneck in the current view.</p>}
                <div className="mt-4 space-y-2">
                  {metrics.aging_by_stage.filter((s) => s.count > 0).map((s) => (
                    <div key={s.stage} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{s.stage}</span>
                      <span className="text-gray-500">{s.count} open · avg {s.avg_days}d · {s.stuck} stuck</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-brand-primary mb-2">Oldest open items</p>
                {metrics.oldest_open.length === 0 ? (
                  <p className="text-sm text-gray-500">Nothing aging — all open items are fresh.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {metrics.oldest_open.map((o) => (
                      <li key={o.record_id} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-brand-primary">{o.record_id}</span>
                        <span className="text-gray-500">{o.stage} · {o.days_in_stage}d</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Records table */}
          <Card className="shadow-lg border-brand-neutral/20">
            <CardHeader className="pb-2 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-brand-primary">Records {itemsQ.isFetching && <Loader2 className="inline w-4 h-4 ml-2 animate-spin text-brand-accent" />}</CardTitle>
              <span className="text-sm text-gray-500">{items.length} shown</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-brand-primary text-white">
                      {['Record ID', 'Type', 'Stage', 'Progress', 'Status', ''].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-500">No items match these filters. Add one or reset the demo data.</td></tr>
                    )}
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-5 py-3 text-brand-primary font-medium">{item.record_id}</td>
                        <td className="px-5 py-3">
                          <Badge variant="outline" className={item.record_type === 'Standard' ? 'border-brand-primary text-brand-primary' : 'border-brand-accent text-brand-accent'}>{item.record_type}</Badge>
                        </td>
                        <td className="px-5 py-3">
                          <select
                            value={item.stage}
                            onChange={(e) => updateM.mutate({ id: item.id, body: { stage: e.target.value } })}
                            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
                          >
                            {config.stages.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <button className="w-6 h-6 rounded border text-gray-600 disabled:opacity-40" disabled={item.progress_percent <= 0}
                              onClick={() => updateM.mutate({ id: item.id, body: { progress_percent: Math.max(0, item.progress_percent - 10) } })}>−</button>
                            <div className="w-16 bg-gray-200 rounded-full h-2.5">
                              <div className="bg-brand-accent h-2.5 rounded-full transition-all" style={{ width: `${item.progress_percent}%` }} />
                            </div>
                            <button className="w-6 h-6 rounded border text-gray-600 disabled:opacity-40" disabled={item.progress_percent >= 100}
                              onClick={() => updateM.mutate({ id: item.id, body: { progress_percent: Math.min(100, item.progress_percent + 10) } })}>+</button>
                            <span className="text-xs font-medium text-brand-primary w-9">{item.progress_percent}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            item.progress === 'Done' ? 'bg-green-100 text-green-800'
                              : item.progress === 'In Progress' ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-800'}`}>{item.progress}</span>
                        </td>
                        <td className="px-5 py-3">
                          <button className="text-gray-400 hover:text-red-600" onClick={() => deleteM.mutate(item.id)} aria-label="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* AI insights — analyzes the current filtered view */}
          <AIInsights filters={filters} />

          <div className="text-center text-sm text-gray-500 border-t pt-6">
            <p className="font-medium text-lg">Process Tracker — Workflow Analytics Dashboard</p>
            <p className="text-xs mt-2">Live pipeline · add, move &amp; track items · AI bottleneck insights</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Kpi = ({ icon, label, value, sub, badge, color }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; badge?: string; color: string;
}) => (
  <Card className="shadow-lg border-brand-primary/10 bg-gradient-to-br from-white to-blue-50">
    <CardHeader className="pb-2">
      <CardTitle className={`text-sm flex items-center font-semibold ${color}`}>{icon}{label}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className={`text-4xl font-bold ${color}`}>{value}</div>
      {badge ? <div className="mt-2"><Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 text-xs">{badge}</Badge></div>
        : <div className="mt-2 text-xs text-gray-600">{sub}</div>}
    </CardContent>
  </Card>
);

export default Dashboard;
