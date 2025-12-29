
// Adapter: Bridges the synchronous UI expectations (from original design) with the Async DB
// NOTE: UI Components must be updated to await these calls.

import { AppSettings, Blueprint, ContextItem, Folder, Project, Conversation, ProviderId } from '../types';
import { db } from './db';
import { securityService } from './security';
import { projectManager } from '../core/projectManager';
import { PROVIDERS } from './modelRegistry';

// Initialize default provider configs
const defaultProviders: Record<ProviderId, any> = {
    google: { enabled: true, apiKey: '', defaultModelId: 'gemini-3-flash-preview' },
    openai: { enabled: false, apiKey: '', defaultModelId: 'gpt-5.2' },
    anthropic: { enabled: false, apiKey: '', defaultModelId: 'claude-opus-4-5-20251101' },
    deepseek: { enabled: false, apiKey: '', defaultModelId: 'deepseek-chat' },
    grok: { enabled: false, apiKey: '', defaultModelId: 'grok-beta' },
    kimi: { enabled: false, apiKey: '', defaultModelId: 'moonshot-v1-128k' },
    glm: { enabled: false, apiKey: '', defaultModelId: 'glm-4' },
    ollama: { enabled: true, apiKey: 'local', defaultModelId: 'llama3.3', baseUrl: 'http://localhost:11434' },
    nanobanana: { enabled: false, apiKey: '', defaultModelId: 'nanobanana-pro' },
    mistral: { enabled: false, apiKey: '', defaultModelId: 'mistral-large-latest' },
    cohere: { enabled: false, apiKey: '', defaultModelId: 'command-r-plus' }
};

// Default settings
export const defaultSettings: AppSettings = {
  theme: 'light',
  activeModel: 'gemini-3-flash-preview',
  userName: 'Engineer',
  providers: defaultProviders,
  safety: {
      blockHarmful: true,
      piiRedaction: true,
      costThreshold: 5.0,
      autoSwitchVision: true
  },
  defaults: {
      chat: 'gemini-3-flash-preview',
      coding: 'gpt-5.2-codex',
      vision: 'gpt-5.2',
      reasoning: 'deepseek-reasoner',
      longContext: 'gemini-3-pro-preview'
  }
};

export const storageService = {
  // Settings (Still Sync for Theme init, but Async for persistence)
  getSettings: (): AppSettings => {
    const stored = localStorage.getItem('kyoki_settings_v2');
    if (!stored) return defaultSettings;
    try {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure new fields exist
        return { ...defaultSettings, ...parsed, providers: { ...defaultSettings.providers, ...parsed.providers } };
    } catch {
        return defaultSettings;
    }
  },

  saveSettings: async (settings: AppSettings) => {
    localStorage.setItem('kyoki_settings_v2', JSON.stringify(settings));
    await db.setVal('settings', settings);
  },

  // API Keys (Secure Async) - Encrypted per provider
  getApiKeys: async (): Promise<Record<string, string>> => {
    const enc = await db.getVal<string>('api_keys_v2');
    if (!enc) return {};
    try {
        const json = await securityService.decrypt(enc);
        return json ? JSON.parse(json) : {};
    } catch { return {}; }
  },

  saveApiKeys: async (keys: Record<string, string>) => {
    const enc = await securityService.encrypt(JSON.stringify(keys));
    await db.setVal('api_keys_v2', enc);
  },

  // Projects
  getProjects: async (): Promise<Project[]> => projectManager.listProjects(),
  createProject: async (name: string) => projectManager.createProject(name),
  deleteProject: async (id: string) => projectManager.deleteProject(id),

  // Blueprints
  getBlueprints: async (projectId?: string): Promise<Blueprint[]> => {
      const all = await db.getAll<Blueprint>('blueprints');
      if (projectId) return all.filter(b => b.projectId === projectId);
      return all;
  },
  
  getBlueprint: async (id: string): Promise<Blueprint | undefined> => {
      return db.get<Blueprint>('blueprints', id);
  },

  saveBlueprint: async (blueprint: Blueprint, snapshot = false) => {
      if (snapshot) {
           const prev = await db.get<Blueprint>('blueprints', blueprint.id);
           if (prev && prev.content !== blueprint.content) {
               const ver = {
                   id: crypto.randomUUID(),
                   timestamp: Date.now(),
                   content: prev.content,
                   author: 'User'
               };
               blueprint.versions = [ver, ...(prev.versions || [])].slice(0, 50);
           }
      }
      await db.put('blueprints', blueprint);
  },

  deleteBlueprint: async (id: string) => {
      await db.delete('blueprints', id);
  },

  // Folders
  getFolders: async (): Promise<Folder[]> => db.getAll<Folder>('folders'),
  saveFolder: async (f: Folder) => db.put('folders', f),
  deleteFolder: async (id: string) => db.delete('folders', id),

  // Context
  getContextItems: async (): Promise<ContextItem[]> => db.getAll<ContextItem>('context'),
  saveContextItem: async (c: ContextItem) => db.put('context', c),
  deleteContextItem: async (id: string) => db.delete('context', id),

  // Conversations
  getConversations: async (): Promise<Conversation[]> => db.getAll<Conversation>('conversations'),
  deleteConversation: async (id: string) => db.delete('conversations', id),
};
