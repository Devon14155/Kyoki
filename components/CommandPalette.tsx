

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, FileText, PlusSquare, Settings, 
    Zap, Library, Database, X 
} from 'lucide-react';
import { storageService } from '../services/storage';
import { Blueprint } from '../types';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

interface PaletteItem {
    label: string;
    icon: any;
    action: () => void;
    meta?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        if (isOpen) {
            storageService.getBlueprints().then(setBlueprints);
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    const filteredBlueprints = blueprints
        .filter(b => b.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);

    const actions: PaletteItem[] = [
        { label: 'New Blueprint', icon: PlusSquare, action: () => navigate('/editor/new') },
        { label: 'Go to Library', icon: Library, action: () => navigate('/library') },
        { label: 'Go to Context', icon: Database, action: () => navigate('/context') },
        { label: 'Settings', icon: Settings, action: () => navigate('/settings') },
    ].filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

    const allItems: PaletteItem[] = [...actions, ...filteredBlueprints.map(b => ({
        label: b.title,
        icon: FileText,
        action: () => navigate(`/editor/${b.id}`),
        meta: b.status
    }))];

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % allItems.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (allItems[selectedIndex]) {
                    allItems[selectedIndex].action();
                    onClose();
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [allItems, selectedIndex, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center px-4 py-3 border-b border-slate-800">
                    <Search className="w-5 h-5 text-slate-500 mr-3" />
                    <input 
                        className="flex-1 bg-transparent border-none outline-none text-lg text-slate-200 placeholder-slate-500"
                        placeholder="Type a command or search..."
                        value={query}
                        onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                        autoFocus
                    />
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto py-2">
                    {allItems.length === 0 ? (
                        <div className="px-4 py-8 text-center text-slate-500">
                            No results found.
                        </div>
                    ) : (
                        allItems.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => { item.action(); onClose(); }}
                                className={`w-full flex items-center px-4 py-3 text-left transition-colors ${
                                    index === selectedIndex ? 'bg-blue-600/10 text-blue-400 border-l-2 border-blue-500' : 'text-slate-300 border-l-2 border-transparent hover:bg-slate-800'
                                }`}
                            >
                                <item.icon className={`w-4 h-4 mr-3 ${index === selectedIndex ? 'text-blue-400' : 'text-slate-500'}`} />
                                <span className="flex-1 font-medium">{item.label}</span>
                                {item.meta && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 capitalize">
                                        {item.meta}
                                    </span>
                                )}
                            </button>
                        ))
                    )}
                </div>
                <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex gap-2">
                        <span>↑↓ to navigate</span>
                        <span>↵ to select</span>
                        <span>esc to close</span>
                    </div>
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3"/> Kyoki Actions</span>
                </div>
            </div>
        </div>
    );
};
