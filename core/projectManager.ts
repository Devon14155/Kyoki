
import { db } from '../services/db';
import { Project, Blueprint, ContextItem, VectorDocument, AppSettings } from '../types';
import { securityService } from '../services/security';

export const projectManager = {
    async createProject(name: string): Promise<Project> {
        const project: Project = {
            id: crypto.randomUUID(),
            name,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            settings: {
                providerOrder: ['gemini', 'openai'],
                tokenCap: 50000
            }
        };
        await db.put('projects', project);
        return project;
    },

    async listProjects(): Promise<Project[]> {
        return db.getAll<Project>('projects');
    },

    async getProject(id: string): Promise<Project | undefined> {
        return db.get<Project>('projects', id);
    },

    async deleteProject(id: string): Promise<void> {
        await db.delete('projects', id);
        // Cascade delete blueprints
        const allBps = await db.getAll<Blueprint>('blueprints');
        for (const bp of allBps) {
            if (bp.projectId === id) {
                await db.delete('blueprints', bp.id);
            }
        }
    },

    // --- Export / Import ---

    async exportProjectBundle(projectId: string, passphrase?: string): Promise<Blob> {
        // 1. Gather Data
        const project = await this.getProject(projectId);
        if (!project) throw new Error("Project not found");

        const allBps = await db.getAll<Blueprint>('blueprints');
        const projectBps = allBps.filter(b => b.projectId === projectId);
        
        // Include Context for completeness? Spec says "Full" includes everything.
        const context = await db.getAll<ContextItem>('context');
        
        // We'll export settings too, but keys are device-bound so they aren't portable safely without re-encryption
        // Spec says "export settings.json (encrypted)". We'll include public settings.
        const settings = await db.getVal<AppSettings>('settings');

        const bundleObj = {
            meta: {
                version: 1,
                exportedAt: Date.now(),
                encrypted: !!passphrase
            },
            project,
            blueprints: projectBps,
            context,
            settings: { ...settings, activeModel: undefined } // Sanitize
        };

        const jsonStr = JSON.stringify(bundleObj);
        
        // 2. Encrypt if passphrase provided
        let finalData = jsonStr;
        if (passphrase) {
            finalData = await securityService.encryptWithPassphrase(jsonStr, passphrase);
        }

        return new Blob([finalData], { type: 'application/json' });
    },

    async importProjectBundle(file: File, passphrase?: string): Promise<void> {
        const text = await file.text();
        let jsonStr = text;

        // 1. Decrypt if needed
        try {
            if (passphrase) {
                jsonStr = await securityService.decryptWithPassphrase(text, passphrase);
            }
            const bundle = JSON.parse(jsonStr);

            // 2. Validate & Merge
            if (!bundle.project || !bundle.blueprints) throw new Error("Invalid bundle structure");

            // Merge Project (Overwrite or New ID? Local-first implies overwrite if ID matches, or create copy)
            // For simplicity, we overwrite if ID matches, assuming "Restore" intent.
            await db.put('projects', bundle.project);

            for (const bp of bundle.blueprints) {
                await db.put('blueprints', bp);
            }
            
            if (bundle.context) {
                for (const ctx of bundle.context) {
                    await db.put('context', ctx);
                }
            }
            
        } catch (e) {
            console.error("Import failed", e);
            throw new Error("Import failed: Invalid passphrase or corrupted file.");
        }
    }
};
