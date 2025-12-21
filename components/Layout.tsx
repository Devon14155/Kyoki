
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusSquare, 
  Settings, 
  Library, 
  Database, 
  Menu, 
  X,
  Zap,
  Search,
  MessageSquare
} from 'lucide-react';
import { CommandPalette } from './CommandPalette';

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storagePercent, setStoragePercent] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setIsCmdKOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    // Calculate LocalStorage usage
    const calculateStorage = () => {
        let total = 0;
        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += (localStorage[key].length * 2); 
            }
        }
        const limit = 5 * 1024 * 1024;
        const usedKB = Math.round(total / 1024);
        const percent = Math.min(100, Math.round((total / limit) * 100));
        
        setStorageUsed(usedKB);
        setStoragePercent(percent);
    };

    calculateStorage();
    const interval = setInterval(calculateStorage, 5000); 
    return () => clearInterval(interval);
  }, [location.pathname]);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: PlusSquare, label: 'New Blueprint', path: '/editor/new' },
    { icon: MessageSquare, label: 'Team Chat', path: '/chats' },
    { icon: Library, label: 'Library', path: '/library' },
    { icon: Database, label: 'Context', path: '/context' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full bg-surface">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Kyoki</span>
      </div>

      <div className="px-4 mb-4">
        <button 
            onClick={() => setIsCmdKOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
            <div className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                <span>Search...</span>
            </div>
            <div className="flex gap-1">
                <kbd className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono">⌘</kbd>
                <kbd className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono">K</kbd>
            </div>
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileNavOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive 
                  ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-600/20' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="bg-slate-100 dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">STORAGE</span>
                <span className="text-xs text-slate-600 dark:text-slate-500">{storagePercent}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                    className={`h-full w-1/4 rounded-full transition-all duration-500 ${storagePercent > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${storagePercent}%` }}
                ></div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 flex justify-between">
                <span>Local encrypted</span>
                <span>{storageUsed} KB</span>
            </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background text-slate-900 dark:text-slate-100 print:bg-white print:text-black print:h-auto">
      <CommandPalette isOpen={isCmdKOpen} onClose={() => setIsCmdKOpen(false)} />
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-surface backdrop-blur-xl print:hidden">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 z-50 print:hidden">
         <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">Kyoki</span>
         </div>
         <div className="flex items-center gap-3">
             <button onClick={() => setIsCmdKOpen(true)} className="p-2 text-slate-500 dark:text-slate-400">
                <Search className="w-5 h-5" />
             </button>
             <button onClick={() => setIsMobileNavOpen(true)} className="p-2 text-slate-500 dark:text-slate-400">
                <Menu className="w-6 h-6" />
             </button>
         </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex print:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileNavOpen(false)}></div>
            <div className="relative w-64 h-full bg-surface border-r border-slate-200 dark:border-slate-800">
                <button onClick={() => setIsMobileNavOpen(false)} className="absolute top-4 right-4 text-slate-500 dark:text-slate-400">
                    <X className="w-6 h-6" />
                </button>
                <NavContent />
            </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-16 scroll-smooth print:pt-0 print:overflow-visible relative">
        {children}
      </main>
    </div>
  );
};
