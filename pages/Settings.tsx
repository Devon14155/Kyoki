
import React, { useState, useEffect, useRef } from 'react';
import { storageService } from '../services/storage';
import { projectManager } from '../core/projectManager';
import { checkApiKey } from '../services/aiService';
import { AppSettings, ProviderId } from '../types';
import { Button, Input, Card, Switch, Badge } from '../components/UI';
import { Key, ShieldCheck, AlertCircle, CheckCircle2, Moon, Sun, Lock, EyeOff, HardDrive, Download, Upload, Terminal, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PROVIDERS, MODELS } from '../services/modelRegistry';

export const SettingsPage = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(storageService.getSettings());
  const [keys, setKeys] = useState<Record<string, string>>({});
  
  // Verification State
  const [verifyingProvider, setVerifyingProvider] = useState<string | null>(null);
  const [verifyResults, setVerifyResults] = useState<Record<string, 'success' | 'error' | 'idle'>>({});

  const [devMode, setDevMode] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    storageService.getApiKeys().then(loadedKeys => {
        setKeys(loadedKeys);
    });
    setDevMode(localStorage.getItem('kyoki_dev_mode') === 'true');
  }, []);

  const saveSettings = (newSettings: AppSettings) => {
      setSettings(newSettings);
      storageService.saveSettings(newSettings);
      if (newSettings.theme === 'dark') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  };

  const handleKeyChange = (providerId: string, val: string) => {
      setKeys(prev => ({ ...prev, [providerId]: val }));
      // Mark as changed/unverified
      setVerifyResults(prev => ({ ...prev, [providerId]: 'idle' }));
  };

  const saveKey = async (providerId: string) => {
      const key = keys[providerId];
      setVerifyingProvider(providerId);
      
      const success = await checkApiKey(key, providerId);
      
      setVerifyingProvider(null);
      setVerifyResults(prev => ({ ...prev, [providerId]: success ? 'success' : 'error' }));

      if (success) {
          await storageService.saveApiKeys(keys);
          // Enable provider
          const newSettings = { ...settings };
          newSettings.providers[providerId as ProviderId].enabled = true;
          saveSettings(newSettings);
      }
  };

  const toggleDevMode = (enabled: boolean) => {
      setDevMode(enabled);
      localStorage.setItem('kyoki_dev_mode', String(enabled));
  };
  
  const handleExport = async () => {
      if (!passphrase.trim()) {
          alert("Please enter a passphrase to encrypt your backup.");
          return;
      }
      setIsExporting(true);
      try {
          const projects = await storageService.getProjects();
          if (projects.length > 0) {
            const blob = await projectManager.exportProjectBundle(projects[0].id, passphrase);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kyoki_backup_${projects[0].id.slice(0,8)}_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          } else {
              alert("No projects to export.");
          }
      } catch (e) {
          console.error(e);
          alert("Export failed.");
      } finally {
          setIsExporting(false);
      }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!passphrase.trim()) {
          alert("Please enter the passphrase to decrypt this backup.");
          return;
      }
      setIsImporting(true);
      try {
          await projectManager.importProjectBundle(file, passphrase);
          alert("Import successful! Reloading...");
          window.location.reload();
      } catch (e) {
          console.error(e);
          alert("Import failed. Check your passphrase.");
      } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-12 space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Settings</h1>
        <p className="text-slate-600 dark:text-slate-400">Configure your AI providers (BYOK), defaults, and security.</p>
      </div>

      <Card className="flex items-center justify-between">
          <div className="flex items-center gap-3">
              {settings.theme === 'dark' ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
              <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-200">Interface Theme</h3>
                  <p className="text-xs text-slate-500">Toggle between Light and Dark mode.</p>
              </div>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-950 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
              <button 
                onClick={() => saveSettings({ ...settings, theme: 'light' })}
                className={`px-3 py-1 text-xs rounded transition-colors ${settings.theme === 'light' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
              >
                  Light
              </button>
              <button 
                onClick={() => saveSettings({ ...settings, theme: 'dark' })}
                className={`px-3 py-1 text-xs rounded transition-colors ${settings.theme === 'dark' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
              >
                  Dark
              </button>
          </div>
      </Card>

      <Card className="space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
            <Key className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">AI Providers (BYOK)</h2>
        </div>
        
        <div className="space-y-4">
            {PROVIDERS.map(p => {
                const isVerified = verifyResults[p.id] === 'success';
                const isError = verifyResults[p.id] === 'error';
                const hasKey = !!keys[p.id] || p.id === 'google';
                
                return (
                    <div key={p.id} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${settings.providers[p.id].enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                <span className="font-semibold text-slate-900 dark:text-slate-200">{p.name}</span>
                                {isVerified && <Badge color="green">Active</Badge>}
                            </div>
                            {p.id !== 'google' && (
                                <Switch 
                                    checked={settings.providers[p.id].enabled}
                                    onChange={(c) => {
                                        const newS = {...settings};
                                        newS.providers[p.id].enabled = c;
                                        saveSettings(newS);
                                    }}
                                />
                            )}
                        </div>
                        
                        {p.id === 'google' ? (
                            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-xs bg-blue-50 dark:bg-blue-900/10 p-2 rounded">
                                <CheckCircle2 className="w-4 h-4"/> Managed via Environment
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Input 
                                    type="password" 
                                    placeholder={p.id === 'ollama' ? 'Local URL (optional)' : `API Key for ${p.name}`}
                                    value={keys[p.id] || ''}
                                    onChange={(e) => handleKeyChange(p.id, e.target.value)}
                                    className="text-xs"
                                />
                                <Button 
                                    size="sm" 
                                    variant="secondary"
                                    isLoading={verifyingProvider === p.id}
                                    onClick={() => saveKey(p.id)}
                                >
                                    {isVerified ? 'Updated' : 'Test & Save'}
                                </Button>
                            </div>
                        )}
                        {isError && <p className="text-xs text-red-500 mt-2">Connection failed. Check key.</p>}
                    </div>
                );
            })}
        </div>
      </Card>
      
      <Card className="space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Default Models</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {Object.entries(settings.defaults).map(([task, currentId]) => (
                   <div key={task}>
                       <label className="block text-xs font-medium text-slate-500 uppercase mb-1">{task} Model</label>
                       <select 
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-sm"
                          value={currentId}
                          onChange={(e) => {
                              const newS = {...settings};
                              // @ts-ignore
                              newS.defaults[task] = e.target.value;
                              saveSettings(newS);
                          }}
                       >
                           {MODELS.map(m => (
                               <option key={m.id} value={m.id}>{m.name} ({m.providerId})</option>
                           ))}
                       </select>
                   </div>
               ))}
          </div>
      </Card>

      <Card className="space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <Lock className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Safety & Privacy</h2>
          </div>
          
          <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-slate-400" />
                      <div>
                          <p className="font-medium text-slate-900 dark:text-slate-200">Strict Safety Filter</p>
                          <p className="text-xs text-slate-500">Block potentially harmful content generation.</p>
                      </div>
                  </div>
                  <Switch 
                    checked={settings.safety.blockHarmful} 
                    onChange={c => saveSettings({...settings, safety: {...settings.safety, blockHarmful: c}})}
                  />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                      <EyeOff className="w-5 h-5 text-slate-400" />
                      <div>
                          <p className="font-medium text-slate-900 dark:text-slate-200">PII Redaction</p>
                          <p className="text-xs text-slate-500">Attempt to detect and redact personally identifiable info.</p>
                      </div>
                  </div>
                  <Switch 
                    checked={settings.safety.piiRedaction} 
                    onChange={c => saveSettings({...settings, safety: {...settings.safety, piiRedaction: c}})}
                  />
              </div>
          </div>
      </Card>

      <Card className="space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <HardDrive className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Data Management</h2>
          </div>
          <div className="space-y-4">
              <div className="flex flex-col gap-2">
                  <label className="text-sm text-slate-500 dark:text-slate-400">Encryption Passphrase</label>
                  <Input 
                    type="password"
                    placeholder="Enter passphrase for backup..."
                    value={passphrase}
                    onChange={e => setPassphrase(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Required for both exporting and importing.</p>
              </div>
              <div className="flex gap-4">
                  <Button variant="secondary" onClick={handleExport} isLoading={isExporting} className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Export Backup
                  </Button>
                  <div className="relative flex-1">
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept=".json" 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleImport}
                        disabled={isImporting}
                      />
                      <Button variant="secondary" isLoading={isImporting} className="w-full">
                          <Upload className="w-4 h-4 mr-2" />
                          Import Backup
                      </Button>
                  </div>
              </div>
          </div>
      </Card>

      <Card className="flex items-center justify-between border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-amber-500" />
              <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">Developer Mode</h3>
                  <p className="text-xs text-slate-500">Access internals, tests, and raw logs.</p>
              </div>
          </div>
          <div className="flex items-center gap-4">
             <Switch checked={devMode} onChange={toggleDevMode} />
             {devMode && (
                 <Button size="sm" variant="secondary" onClick={() => navigate('/devtools')}>
                     Open Console
                 </Button>
             )}
          </div>
      </Card>
    </div>
  );
};
