
// Adapter: Bridges the synchronous UI expectations (from original design) with the Async DB
// NOTE: UI Components must be updated to await these calls.

import { AppSettings, Blueprint, ContextItem, Folder, Project } from '../types';
import { db } from './db';
import { securityService } from './security';
import { projectManager } from '../core/projectManager';

// Default settings
export const defaultSettings: AppSettings = {
  theme: 'dark',
  activeModel: 'gemini',
  userName: 'Engineer',
  safety: {
      blockHarmful: true,
      piiRedaction: true
  }
};

export const storageService = {
  // Settings (Still Sync for Theme init, but Async for persistence)
  getSettings: (): AppSettings => {
    const stored = localStorage.getItem('kyoki_settings');
    return stored ? JSON.parse(stored) : defaultSettings;
  },

  saveSettings: async (settings: AppSettings) => {
    localStorage.setItem('kyoki_settings', JSON.stringify(settings));
    await db.setVal('settings', settings);
  },

  // API Keys (Secure Async)
  getApiKeys: async (): Promise<Record<string, string>> => {
    const enc = await db.getVal<string>('api_keys');
    if (!enc) return {};
    try {
        const json = await securityService.decrypt(enc);
        return json ? JSON.parse(json) : {};
    } catch { return {}; }
  },

  saveApiKeys: async (keys: Record<string, string>) => {
    const enc = await securityService.encrypt(JSON.stringify(keys));
    await db.setVal('api_keys', enc);
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
};
