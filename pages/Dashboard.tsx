import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../components/UI';
import { Blueprint, IndustryPreset, Project } from '../types';
import { storageService } from '../services/storage';
import { ArrowRight, Clock, Star, Zap, Box, Activity, GraduationCap, Coins, Server, Globe, FolderPlus } from 'lucide-react';

const PRESETS: IndustryPreset[] = [
    { 
        id: 'fintech', 
        name: 'FinTech Core', 
        description: 'High-frequency ledger, ACID compliance, Fraud detection.', 
        icon: 'Coins', 
        promptTemplate: 'Generate a blueprint for a secure, high-frequency FinTech ledger system with ACID compliance, audit trails, and real-time fraud detection.' 
    },
    { 
        id: 'healthtech', 
        name: 'HealthTech HIPAA', 
        description: 'FHIR compatible, EMR integration, Privacy-first.', 
        icon: 'Activity', 
        promptTemplate: 'Generate a HIPAA-compliant HealthTech platform architecture for EMR integration, supporting FHIR standards and strict patient data privacy.' 
    },
    { 
        id: 'edtech', 
        name: 'EdTech Platform', 
        description: 'Video streaming, Gamification, Real-time collaboration.', 
        icon: 'GraduationCap', 
        promptTemplate: 'Generate a scalable EdTech platform blueprint featuring low-latency video streaming, gamification engine, and real-time classroom collaboration tools.' 
    },
    { 
        id: 'saas', 
        name: 'AI SaaS', 
        description: 'Vector DBs, GPU orchestration, Multi-tenant.', 
        icon: 'Zap', 
        promptTemplate: 'Generate a modern AI SaaS architecture using Vector Databases, Multi-tenancy, and auto-scaling GPU orchestration for inference workloads.' 
    },
    { 
        id: 'realtime', 
        name: 'Real-Time Apps', 
        description: 'WebSockets, Redis Pub/Sub, Edge computing.', 
        icon: 'Globe', 
        promptTemplate: 'Generate a global Real-Time messaging architecture utilizing WebSockets, Redis Pub/Sub, and Edge Computing for sub-50ms latency.' 
    },
    { 
        id: 'erp', 
        name: 'Enterprise ERP', 
        description: 'Microservices, Event Sourcing, Data Warehouse.', 
        icon: 'Server', 
        promptTemplate: 'Generate an Enterprise ERP blueprint based on Event Sourcing, Domain-Driven Design microservices, and a Data Lakehouse for analytics.' 
    },
];

const IconMap: Record<string, React.FC<any>> = {
    Coins, Activity, GraduationCap, Zap, Globe, Server
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const [recents, setRecents] = useState<Blueprint[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
        try {
            const [bps, projs] = await Promise.all([
                storageService.getBlueprints(),
                storageService.getProjects()
            ]);
            setRecents(bps.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3));
            setProjects(projs);
        } finally {
            setLoading(false);
        }
    };
    load();
  }, []);

  const handleStartNew = async (prompt?: string) => {
    let projectId = projects[0]?.id;
    if (!projectId) {
        const p = await storageService.createProject('Default Project');
        projectId = p.id;
    }
    const url = prompt 
        ? `/editor/new?prompt=${encodeURIComponent(prompt)}&pid=${projectId}` 
        : `/editor/new?pid=${projectId}`;
    navigate(url);
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading Workspace...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-12 space-y-12 pb-24">
      
      {/* Hero Section */}
      <div className="space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
          Generate a New <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-500">Blueprint</span>
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
          Describe the software architecture you want to build. Kyoki uses advanced multi-agent reasoning to produce FAANG-level engineering specifications.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <div className="relative flex-1 max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Zap className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
            <input 
                type="text" 
                placeholder="e.g. A serverless microservices architecture for a real-time chat application..." 
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-lg transition-all"
                onKeyDown={(e) => {
                    if(e.key === 'Enter') {
                        handleStartNew(e.currentTarget.value);
                    }
                }}
            />
          </div>
          <Button size="lg" onClick={() => handleStartNew()} className="shadow-lg shadow-blue-900/20 h-[60px]">
            Start Blank Blueprint
          </Button>
        </div>
      </div>

      {/* Industry Presets */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Industry Standard Presets</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRESETS.map(preset => {
                const Icon = IconMap[preset.icon] || Box;
                return (
                    <button 
                        key={preset.id}
                        onClick={() => handleStartNew(preset.promptTemplate)}
                        className="flex flex-col items-start p-5 bg-surface border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-500/50 rounded-xl transition-all text-left group"
                    >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-950 flex items-center justify-center mb-3 group-hover:bg-blue-600/10 dark:group-hover:bg-blue-600/20 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            <Icon className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                        </div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-white mb-1">{preset.name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400">{preset.description}</p>
                    </button>
                );
            })}
        </div>
      </div>

      {/* Recents */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Recent Blueprints</h2>
          {recents.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => navigate('/library')}>View All</Button>
          )}
        </div>

        {recents.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/20">
             <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-800">
                <Zap className="w-8 h-8 text-slate-400 dark:text-slate-600" />
             </div>
             <p className="text-slate-500 dark:text-slate-400 mb-4">No blueprints generated yet.</p>
             <Button variant="secondary" onClick={() => handleStartNew()}>Create your first one</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recents.map((bp) => (
              <Card key={bp.id} onClick={() => navigate(`/editor/${bp.id}`)} className="group hover:border-blue-500/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-blue-500 dark:text-blue-400 -rotate-45" />
                </div>
                <div className="space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <Box className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        {bp.status === 'completed' ? <Badge color="green">Completed</Badge> : <Badge color="yellow">Draft</Badge>}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">{bp.title}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-500 mt-1 line-clamp-2">{bp.description}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(bp.updatedAt).toLocaleDateString()}</span>
                        </div>
                        <span className="uppercase">{bp.modelUsed}</span>
                    </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};