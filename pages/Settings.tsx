import React, { useState, useEffect, useRef } from 'react';
import { storageService } from '../services/storage';
import { projectManager } from '../core/projectManager';
import { checkApiKey } from '../services/aiService';
import { AppSettings, ModelType } from '../types';
import { Button, Input, Card, Switch } from '../components/UI';
import { Key, ShieldCheck, AlertCircle, CheckCircle2, Moon, Sun, Lock, EyeOff, FileCode, HardDrive, Download, Upload, Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SettingsPage = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(storageService.getSettings());
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [keyInput, setKeyInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const [devMode, setDevMode] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    storageService.getApiKeys().then(loadedKeys => {
        setKeys(loadedKeys);
        setKeyInput(loadedKeys[settings.activeModel] || '');
    });
    setDevMode(localStorage.getItem('kyoki_dev_mode') === 'true');
  }, [settings.activeModel]);

  const saveSettings = (newSettings: AppSettings) => {
      setSettings(newSettings);
      storageService.saveSettings(newSettings);
      if (newSettings.theme === 'dark') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  };

  const toggleDevMode = (enabled: boolean) => {
      setDevMode(enabled);
      localStorage.setItem('kyoki_dev_mode', String(enabled));
  };

  const handleSaveKey = async () => {
    if (!keyInput.trim()) return;
    setIsVerifying(true);
    setVerifyStatus('idle');
    const isValid = await checkApiKey(keyInput, settings.activeModel);
    setIsVerifying(false);
    if (isValid) {
        setVerifyStatus('success');
        const newKeys = { ...keys, [settings.activeModel]: keyInput };
        setKeys(newKeys);
        await storageService.saveApiKeys(newKeys);
        storageService.saveSettings(settings);
        setTimeout(() => setVerifyStatus('idle'), 3000);
    } else {
        setVerifyStatus('error');
    }
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

  const models: {id: ModelType, name: string}[] = [
    { id: 'gemini', name: 'Google Gemini 2.5' },
    { id: 'openai', name: 'OpenAI GPT-4' },
    { id: 'claude', name: 'Anthropic Claude 3' },
    { id: 'kimi', name: 'Kimi (Moonshot)' },
    { id: 'glm', name: 'GLM-4 (Zhipu)' },
  ];

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Settings</h1>
        <p className="text-slate-600 dark:text-slate-400">Manage your BYOK keys, theme, and safety preferences.</p>
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
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Model Configuration</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {models.map(m => (
                <div 
                    key={m.id}
                    onClick={() => {
                        saveSettings({...settings, activeModel: m.id});
                        setKeyInput(keys[m.id] || '');
                        setVerifyStatus('idle');
                    }}
                    className={`cursor-pointer p-4 rounded-xl border transition-all ${
                        settings.activeModel === m.id 
                        ? 'bg-blue-50 dark:bg-blue-600/10 border-blue-500 ring-1 ring-blue-500/50' 
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                    }`}
                >
                    <div className="flex justify-between items-center mb-2">
                        <span className={`font-medium ${settings.activeModel === m.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{m.name}</span>
                        {keys[m.id] && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                    </div>
                </div>
            ))}
        </div>

        <div className="space-y-4 pt-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                API Key for <span className="text-blue-600 dark:text-blue-500 font-bold capitalize">{settings.activeModel}</span>
            </label>
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Input 
                        type="password" 
                        placeholder={`sk-...`}
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        className="pr-10"
                    />
                    {keys[settings.activeModel] && (
                        <div className="absolute right-3 top-3 text-emerald-500">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                    )}
                </div>
                <Button onClick={handleSaveKey} isLoading={isVerifying} disabled={!keyInput}>
                    {keys[settings.activeModel] ? 'Update Key' : 'Save Key'}
                </Button>
            </div>
            
            {verifyStatus === 'success' && (
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>API Key verified and encrypted.</span>
                </div>
            )}
             {verifyStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-200 dark:border-red-500/20">
                    <AlertCircle className="w-4 h-4" />
                    <span>Failed to verify API key.</span>
                </div>
            )}
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