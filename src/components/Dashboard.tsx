import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList } from 'recharts';
import { TrendingUp, FileText, Clock, CheckCircle, AlertCircle, Target, Users, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import AIInsights from './AIInsights';

// Sample data based on the uploaded Excel structure
const recordData = [
  { recordId: 'STD-1001', recordType: 'Standard', stage: 'Review', progress: 'WIP', progressPercent: 60 },
  { recordId: 'STD-1002', recordType: 'Standard', stage: 'Review', progress: 'WIP', progressPercent: 65 },
  { recordId: 'STD-1003', recordType: 'Standard', stage: 'Not Started', progress: 'Not Started', progressPercent: 0 },
  { recordId: 'STD-1004', recordType: 'Standard', stage: 'Completed', progress: 'WIP', progressPercent: 85 },
  { recordId: 'STD-1005', recordType: 'Standard', stage: 'Completed', progress: 'WIP', progressPercent: 90 },
  { recordId: 'BLK-2001', recordType: 'Bulk', stage: 'Intake', progress: 'Started', progressPercent: 30 },
  { recordId: 'BLK-2002', recordType: 'Bulk', stage: 'Review', progress: 'WIP', progressPercent: 70 },
  // Additional sample data for better visualization
  ...Array.from({ length: 30 }, (_, i) => ({
    recordId: `STD${String(i + 1).padStart(3, '0')}`,
    recordType: 'Standard',
    stage: ['Not Started', 'Intake', 'Review', 'Completed'][Math.floor(Math.random() * 4)],
    progress: ['Not Started', 'Started', 'WIP'][Math.floor(Math.random() * 3)],
    progressPercent: Math.floor(Math.random() * 101)
  })),
  ...Array.from({ length: 15 }, (_, i) => ({
    recordId: `BLK${String(i + 1).padStart(3, '0')}`,
    recordType: 'Bulk',
    stage: ['Not Started', 'Intake', 'Review', 'Completed'][Math.floor(Math.random() * 4)],
    progress: ['Not Started', 'Started', 'WIP'][Math.floor(Math.random() * 3)],
    progressPercent: Math.floor(Math.random() * 101)
  }))
];

// Target data for comparison
const targetData = {
  'Standard': { target: 400, actual: 343 },
  'Bulk': { target: 12000, actual: 10834 }
};

const Dashboard = () => {
  const [selectedRecordType, setSelectedRecordType] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedProgress, setSelectedProgress] = useState('all');

  // Filter data based on selections
  const filteredData = useMemo(() => {
    return recordData.filter(item => {
      if (selectedRecordType !== 'all' && item.recordType !== selectedRecordType) return false;
      if (selectedStage !== 'all' && item.stage !== selectedStage) return false;
      if (selectedProgress !== 'all') {
        const progressRange = getProgressRange(item.progressPercent);
        if (progressRange !== selectedProgress) return false;
      }
      return true;
    });
  }, [selectedRecordType, selectedStage, selectedProgress]);

  // Helper function to categorize progress
  const getProgressRange = (percent) => {
    if (percent === 0) return '0%';
    if (percent <= 25) return '1-25%';
    if (percent <= 50) return '26-50%';
    if (percent <= 75) return '51-75%';
    return '76-100%';
  };

  // Calculate KPIs
  const totalRecords = filteredData.length;
  const completedRecords = filteredData.filter(item => item.stage === 'Completed').length;
  const wipRecords = filteredData.filter(item => item.progress === 'WIP').length;
  const notStartedRecords = filteredData.filter(item => item.stage === 'Not Started').length;
  const avgProgress = totalRecords > 0 ? Math.round(filteredData.reduce((sum, item) => sum + item.progressPercent, 0) / totalRecords) : 0;

  // Calculate Target vs Actual for current filter
  const standardItems = filteredData.filter(item => item.recordType === 'Standard').length;
  const bulkItems = filteredData.filter(item => item.recordType === 'Bulk').length;

  // Prepare chart data
  const stageDistribution = useMemo(() => {
    const stages = ['Not Started', 'Intake', 'Review', 'Completed'];
    return stages.map(stage => ({
      stage: stage.replace('Extracted ', '').replace('Simplified ', 'Final '),
      count: filteredData.filter(item => item.stage === stage).length,
      percentage: totalRecords > 0 ? Math.round((filteredData.filter(item => item.stage === stage).length / totalRecords) * 100) : 0
    }));
  }, [filteredData, totalRecords]);

  const targetVsActualData = [
    {
      type: 'Standard',
      target: targetData['Standard'].target,
      actual: standardItems,
      difference: standardItems - targetData['Standard'].target,
      variance: ((standardItems - targetData['Standard'].target) / targetData['Standard'].target * 100).toFixed(1)
    },
    {
      type: 'Bulk',
      target: targetData['Bulk'].target,
      actual: bulkItems,
      difference: bulkItems - targetData['Bulk'].target,
      variance: ((bulkItems - targetData['Bulk'].target) / targetData['Bulk'].target * 100).toFixed(1)
    }
  ];

  const progressFunnelData = [
    { name: 'Total Items', value: totalRecords, fill: '#002f5f' },
    { name: 'Started', value: totalRecords - notStartedRecords, fill: '#0077c8' },
    { name: 'In Progress', value: wipRecords, fill: '#60a5fa' },
    { name: 'Completed', value: completedRecords, fill: '#22c55e' }
  ];

  const COLORS = ['#002f5f', '#0077c8', '#60a5fa', '#a7a9ac', '#1e40af', '#3b82f6'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-light to-gray-50">
      {/* Header */}
      <div className="bg-brand-primary text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-3xl font-bold">Process Tracker</div>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-white">Process Analytics Dashboard</h1>
              <p className="text-white text-lg">Interactive Performance Intelligence</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex">
        {/* Left Sidebar with Filters */}
        <div className="w-80 p-6 bg-white shadow-lg border-r border-brand-accent/20">
          <div className="sticky top-6">
            <div className="flex items-center gap-2 mb-6">
              <Filter className="w-5 h-5 text-brand-primary" />
              <h3 className="text-lg font-semibold text-brand-primary">Interactive Filters</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-brand-primary mb-3 block">Record Type</label>
                <div className="space-y-2">
                  {['all', 'Standard', 'Bulk'].map(type => (
                    <Button
                      key={type}
                      variant={selectedRecordType === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedRecordType(type)}
                      className={`w-full justify-start ${selectedRecordType === type ? 
                        "bg-brand-primary hover:bg-brand-primary/90" : 
                        "border-brand-accent text-brand-accent hover:bg-brand-accent/10"
                      }`}
                    >
                      {type === 'all' ? 'All Types' : type}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-brand-primary mb-3 block">Stage</label>
                <div className="space-y-2">
                  {['all', 'Not Started', 'Intake', 'Review', 'Completed'].map(stage => (
                    <Button
                      key={stage}
                      variant={selectedStage === stage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedStage(stage)}
                      className={`w-full justify-start text-left ${selectedStage === stage ? 
                        "bg-brand-primary hover:bg-brand-primary/90" : 
                        "border-brand-accent text-brand-accent hover:bg-brand-accent/10"
                      }`}
                    >
                      {stage === 'all' ? 'All Stages' : stage.replace('Extracted ', '').replace('Simplified ', 'Final ')}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-brand-primary mb-3 block">Progress Range</label>
                <div className="space-y-2">
                  {['all', '0%', '1-25%', '26-50%', '51-75%', '76-100%'].map(progress => (
                    <Button
                      key={progress}
                      variant={selectedProgress === progress ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedProgress(progress)}
                      className={`w-full justify-start ${selectedProgress === progress ? 
                        "bg-brand-primary hover:bg-brand-primary/90" : 
                        "border-brand-accent text-brand-accent hover:bg-brand-accent/10"
                      }`}
                    >
                      {progress === 'all' ? 'All Progress' : progress}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 space-y-8">
          {/* Target vs Actual Comparison Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {targetVsActualData.map((item, index) => (
              <Card key={index} className="shadow-lg border-brand-primary/20 bg-gradient-to-br from-white to-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-brand-primary">
                    <span className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      {item.type} Performance
                    </span>
                    {parseFloat(item.variance) >= 0 ? 
                      <ArrowUp className="w-5 h-5 text-green-600" /> : 
                      <ArrowDown className="w-5 h-5 text-red-600" />
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-brand-accent">{item.target.toLocaleString()}</div>
                      <div className="text-xs text-gray-600">Target</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-brand-primary">{item.actual.toLocaleString()}</div>
                      <div className="text-xs text-gray-600">Actual</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-xl font-bold ${item.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.difference >= 0 ? '+' : ''}{item.difference.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Difference</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <Badge className={`${parseFloat(item.variance) >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} hover:bg-opacity-80`}>
                      {item.variance}% variance
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="shadow-lg border-brand-primary/20 bg-gradient-to-br from-white to-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-brand-primary flex items-center font-semibold">
                  <FileText className="w-5 h-5 mr-2" />
                  Total Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-brand-primary">{totalRecords}</div>
                <div className="mt-2 text-xs text-gray-600">Active records in system</div>
              </CardContent>
            </Card>
            
            <Card className="shadow-lg border-green-400/20 bg-gradient-to-br from-white to-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-700 flex items-center font-semibold">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Completed Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-600">{completedRecords}</div>
                <div className="mt-2">
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                    {Math.round((completedRecords / totalRecords) * 100)}% completion
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-lg border-amber-400/20 bg-gradient-to-br from-white to-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-700 flex items-center font-semibold">
                  <Clock className="w-5 h-5 mr-2" />
                  In Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-amber-600">{wipRecords}</div>
                <div className="mt-2">
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs">
                    {Math.round((wipRecords / totalRecords) * 100)}% active
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-lg border-brand-accent/20 bg-gradient-to-br from-white to-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-brand-accent flex items-center font-semibold">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Avg. Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-brand-accent">{avgProgress}%</div>
                <div className="mt-2 text-xs text-gray-600">Overall completion rate</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Progress Funnel */}
            <Card className="shadow-lg border-brand-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-brand-primary flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Progress Funnel
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <FunnelChart>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "white",
                          border: "1px solid #0077c8",
                          borderRadius: "8px"
                        }}
                      />
                      <Funnel
                        dataKey="value"
                        data={progressFunnelData}
                        isAnimationActive
                      >
                        <LabelList position="center" fill="#fff" stroke="none" />
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Stage Distribution */}
            <Card className="shadow-lg border-brand-accent/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-brand-primary">Distribution by Stage</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stageDistribution} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#a7a9ac" opacity={0.3} />
                      <XAxis type="number" stroke="#a7a9ac" />
                      <YAxis dataKey="stage" type="category" width={75} tick={{ fontSize: 12 }} stroke="#a7a9ac" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "white",
                          border: "1px solid #0077c8",
                          borderRadius: "8px"
                        }}
                        formatter={(value, name) => [`${value} items (${stageDistribution.find(s => s.count === value)?.percentage}%)`, "Count"]}
                      />
                      <Bar dataKey="count" fill="#0077c8" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Insights Table */}
          <Card className="shadow-lg border-brand-neutral/20">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-brand-primary">Performance Insights Table</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-brand-primary text-white">
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">Record ID</th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">Stage</th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">Progress</th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredData.slice(0, 10).map((item, idx) => (
                      <tr key={idx} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4 text-brand-primary font-medium">{item.recordId}</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={item.recordType === 'Standard' ? 'border-brand-primary text-brand-primary' : 'border-brand-accent text-brand-accent'}>
                            {item.recordType}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                            ${item.stage === 'Completed' ? 'bg-green-100 text-green-800' :
                              item.stage === 'Review' ? 'bg-blue-100 text-blue-800' :
                                item.stage === 'Intake' ? 'bg-amber-100 text-amber-800' :
                                  'bg-gray-100 text-gray-800'
                            }`}>
                            {item.stage.replace('Extracted ', '').replace('Simplified ', 'Final ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-20 bg-gray-200 rounded-full h-2.5">
                              <div 
                                className="bg-brand-accent h-2.5 rounded-full transition-all duration-500" 
                                style={{ width: `${item.progressPercent}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-brand-primary min-w-[3rem]">{item.progressPercent}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium
                            ${item.progress === 'WIP' ? 'bg-amber-100 text-amber-800' :
                              item.progress === 'Started' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                            {item.progress}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredData.length > 10 && (
                <div className="p-4 bg-gray-50 text-center text-sm text-gray-600">
                  Showing 10 of {filteredData.length} items. Use filters to refine results.
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Pipeline Insights (Claude-powered) */}
          <AIInsights summary={`Total records: ${totalRecords}. Completed: ${completedRecords}. In progress (WIP): ${wipRecords}. Not started: ${notStartedRecords}. Average progress: ${avgProgress}%. By type — Standard: ${standardItems}, Bulk: ${bulkItems}. Stage distribution: ${stageDistribution.map(s => `${s.stage}: ${s.count}`).join(', ')}.`} />

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 border-t pt-6">
            <p className="font-medium text-lg">Process Tracker — Workflow Analytics Dashboard</p>
            <p className="text-xs mt-2">Interactive Intelligence • Real-time Performance Tracking • Decision-Ready Insights</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
