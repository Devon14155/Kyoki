import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, MarkdownView } from '../components/UI';
import { runner, TestResult } from '../tests/testRunner';
import { registerCoreTests } from '../tests/core.test';
import { registerIntegrationTests } from '../tests/integration.test';
import { Terminal, BookOpen, Activity, Play, CheckCircle2, XCircle, Database, Server, Cpu } from 'lucide-react';
import { storageService } from '../services/storage';

// Import Docs from TS file to avoid bundler issues
import { DOCS_README, DOCS_ARCH, DOCS_RUNBOOK } from '../docs/content';

// Register Tests once
let testsRegistered = false;

export const DevTools = () => {
  const activeTabClass = "bg-blue-600 text-white";
  const inactiveTabClass = "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200";
  const [activeTab, setActiveTab] = useState<'tests' | 'docs' | 'health'>('tests');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [dbStats, setDbStats] = useState<any>({});
  const [docFile, setDocFile] = useState<'readme' | 'arch' | 'runbook'>('readme');

  useEffect(() => {
    if (!testsRegistered) {
        registerCoreTests();
        registerIntegrationTests();
        testsRegistered = true;
    }
    loadStats();
  }, []);

  const loadStats = async () => {
      const bps = await storageService.getBlueprints();
      const ctx = await storageService.getContextItems();
      const projs = await storageService.getProjects();
      setDbStats({
          blueprints: bps.length,
          context: ctx.length,
          projects: projs.length,
          storage: 'IndexedDB (Async)',
          userAgent: navigator.userAgent
      });
  };

  const runTests = async () => {
      setIsRunning(true);
      setTestResults([]);
      // Small delay to allow UI to update
      setTimeout(async () => {
          const results = await runner.runAll();
          setTestResults(results);
          setIsRunning(false);
      }, 100);
  };

  const docs = {
      readme: DOCS_README,
      arch: DOCS_ARCH,
      runbook: DOCS_RUNBOOK
  };

  const docTitles = {
      readme: 'README',
      arch: 'Architecture',
      runbook: 'Runbook'
  };

  const passedCount = testResults.filter(r => r.status === 'pass').length;
  const failedCount = testResults.filter(r => r.status === 'fail').length;

  return (
    <div className="h-full flex flex-col p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Terminal className="w-8 h-8 text-amber-500" />
                Developer Console
            </h1>
            <p className="text-slate-600 dark:text-slate-400">System Internals, Testing Suite, and Documentation.</p>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-800">
              {(['tests', 'docs', 'health'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab ? activeTabClass : inactiveTabClass}`}
                  >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
              ))}
          </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          {/* --- TESTS TAB --- */}
          {activeTab === 'tests' && (
              <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                      <div>
                          <h2 className="font-semibold text-slate-900 dark:text-white">In-Browser Test Suite</h2>
                          <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-slate-500">Total: {testResults.length}</span>
                              <span className="text-xs text-emerald-600 dark:text-emerald-400">Passed: {passedCount}</span>
                              <span className="text-xs text-red-600 dark:text-red-400">Failed: {failedCount}</span>
                          </div>
                      </div>
                      <Button onClick={runTests} isLoading={isRunning} size="sm">
                          <Play className="w-4 h-4 mr-2" />
                          Run Suite
                      </Button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {testResults.length === 0 && !isRunning && (
                          <div className="text-center py-20 text-slate-400">
                              Click "Run Suite" to execute tests.
                          </div>
                      )}
                      
                      {testResults.map((res, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                              <div className="flex items-center gap-3">
                                  {res.status === 'pass' 
                                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    : <XCircle className="w-5 h-5 text-red-500" />
                                  }
                                  <div>
                                      <div className="flex items-center gap-2">
                                          <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{res.suite}</span>
                                          <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{res.name}</span>
                                      </div>
                                      {res.error && (
                                          <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-mono pl-1">{res.error}</p>
                                      )}
                                  </div>
                              </div>
                              <span className="text-xs font-mono text-slate-400">{res.duration.toFixed(1)}ms</span>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* --- DOCS TAB --- */}
          {activeTab === 'docs' && (
              <div className="flex h-full">
                  <div className="w-48 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 p-2 flex flex-col gap-1">
                      {(['readme', 'arch', 'runbook'] as const).map(d => (
                          <button
                            key={d}
                            onClick={() => setDocFile(d)}
                            className={`px-3 py-2 text-sm text-left rounded-md transition-colors ${
                                docFile === d 
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                            }`}
                          >
                              {docTitles[d]}
                          </button>
                      ))}
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-slate-950">
                      <div className="max-w-3xl mx-auto">
                          <MarkdownView content={docs[docFile]} />
                      </div>
                  </div>
              </div>
          )}

          {/* --- HEALTH TAB --- */}
          {activeTab === 'health' && (
              <div className="p-8 h-full overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-3 mb-2">
                              <Database className="w-5 h-5 text-blue-500" />
                              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Database</h3>
                          </div>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">{dbStats.storage}</p>
                          <p className="text-sm text-slate-500 mt-1">Engine Active</p>
                      </div>

                      <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-3 mb-2">
                              <Server className="w-5 h-5 text-emerald-500" />
                              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Projects</h3>
                          </div>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">{dbStats.projects || 0}</p>
                          <p className="text-sm text-slate-500 mt-1">Active Projects</p>
                      </div>

                      <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-3 mb-2">
                              <Terminal className="w-5 h-5 text-purple-500" />
                              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Blueprints</h3>
                          </div>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">{dbStats.blueprints || 0}</p>
                          <p className="text-sm text-slate-500 mt-1">Generated Artifacts</p>
                      </div>

                      <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-3 mb-2">
                              <Cpu className="w-5 h-5 text-amber-500" />
                              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Context</h3>
                          </div>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">{dbStats.context || 0}</p>
                          <p className="text-sm text-slate-500 mt-1">RAG Documents</p>
                      </div>
                  </div>

                  <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Environment Details</h3>
                      <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto">
                          <pre>{JSON.stringify(dbStats, null, 2)}</pre>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};