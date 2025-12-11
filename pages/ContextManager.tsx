import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storage';
import { vectorStore } from '../services/vectorStore';
import { ContextItem } from '../types';
import { Card, Button, Input, Badge } from '../components/UI';
import { Upload, FileText, Trash2, Database, AlertCircle, RefreshCw } from 'lucide-react';

export const ContextManager = () => {
  const [items, setItems] = useState<ContextItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  // Need keys for embedding
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState(storageService.getSettings());

  useEffect(() => {
    storageService.getContextItems().then(setItems);
    storageService.getApiKeys().then(setKeys);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2000000) { // 2MB limit
        setError('File too large. Please upload text files under 2MB.');
        return;
    }

    setUploading(true);
    setError('');

    const reader = new FileReader();
    reader.onload = async (event) => {
        const content = event.target?.result as string;
        const newItem: ContextItem = {
            id: crypto.randomUUID(),
            name: file.name,
            type: 'file',
            content: content,
            size: file.size,
            createdAt: Date.now(),
            embeddingStatus: 'pending'
        };
        
        try {
            await storageService.saveContextItem(newItem);
            
            // Auto-Embed if key available
            const apiKey = keys[settings.activeModel];
            if (apiKey && (settings.activeModel === 'gemini' || settings.activeModel === 'openai')) {
                 try {
                     await vectorStore.addDocument(newItem.id, content, apiKey, settings.activeModel);
                     newItem.embeddingStatus = 'embedded';
                     await storageService.saveContextItem(newItem);
                 } catch (embedErr) {
                     console.error("Embedding failed", embedErr);
                     newItem.embeddingStatus = 'failed';
                     await storageService.saveContextItem(newItem);
                 }
            }

            const updated = await storageService.getContextItems();
            setItems(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setUploading(false);
        }
    };
    reader.readAsText(file);
  };

  const handleDelete = async (id: string) => {
      await storageService.deleteContextItem(id);
      await vectorStore.deleteForContext(id);
      setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Context & Knowledge</h1>
        <p className="text-slate-600 dark:text-slate-400">Upload technical docs to RAG (Retrieval Augmented Generation) knowledge base.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Upload Card */}
          <div className="md:col-span-1">
             <Card className="h-full border-dashed border-2 bg-slate-50 dark:bg-slate-900/20 flex flex-col items-center justify-center text-center space-y-4 min-h-[200px]">
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <Upload className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">Upload Document</h3>
                    <p className="text-xs text-slate-500 mt-1">.txt, .md, .json (Max 2MB)</p>
                </div>
                <div className="relative">
                    <input 
                        type="file" 
                        accept=".txt,.md,.json"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploading}
                    />
                    <Button size="sm" isLoading={uploading} variant="secondary">Select File</Button>
                </div>
                {error && <p className="text-xs text-red-500 dark:text-red-400 px-4">{error}</p>}
             </Card>
          </div>

          {/* Stats Card */}
          <div className="md:col-span-2 space-y-4">
              <div className="bg-surface border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex items-center justify-between shadow-sm">
                   <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-lg">
                            <Database className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Total Context Items</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{items.length}</p>
                        </div>
                   </div>
                   <div className="text-right">
                        <p className="text-sm text-slate-500">Storage Used</p>
                        <p className="text-xl font-mono text-slate-700 dark:text-slate-300">
                            {(items.reduce((acc, i) => acc + i.size, 0) / 1024).toFixed(1)} KB
                        </p>
                   </div>
              </div>

              {/* List */}
              <div className="space-y-2">
                 {items.length === 0 ? (
                     <p className="text-center text-slate-500 py-8">No context items yet.</p>
                 ) : (
                     items.map(item => (
                         <div key={item.id} className="flex items-center justify-between p-4 bg-surface border border-slate-200 dark:border-slate-800 rounded-lg group hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm">
                             <div className="flex items-center gap-3">
                                 <FileText className="w-5 h-5 text-blue-500" />
                                 <div>
                                     <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.name}</p>
                                        {item.embeddingStatus === 'embedded' && <Badge color="green">Indexed</Badge>}
                                        {item.embeddingStatus === 'failed' && <Badge color="red">Index Failed</Badge>}
                                        {item.embeddingStatus === 'pending' && <Badge color="yellow">Pending</Badge>}
                                     </div>
                                     <p className="text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleDateString()} • {item.type.toUpperCase()}</p>
                                 </div>
                             </div>
                             <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                 <Trash2 className="w-4 h-4" />
                             </button>
                         </div>
                     ))
                 )}
              </div>
          </div>
      </div>
    </div>
  );
};