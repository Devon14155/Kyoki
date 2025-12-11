import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storage';
import { Blueprint, Folder } from '../types';
import { Button, Input, Badge } from '../components/UI';
import { Search, Trash2, Folder as FolderIcon, FolderPlus, Box, Calendar, FolderOpen, ArrowRight } from 'lucide-react';

export const Library = () => {
  const navigate = useNavigate();
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [search, setSearch] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
      const [bps, flds] = await Promise.all([
          storageService.getBlueprints(),
          storageService.getFolders()
      ]);
      setBlueprints(bps);
      setFolders(flds);
  };

  const handleCreateFolder = async () => {
      if (!newFolderName.trim()) return;
      const newFolder: Folder = {
          id: crypto.randomUUID(),
          name: newFolderName,
          createdAt: Date.now()
      };
      await storageService.saveFolder(newFolder);
      setNewFolderName('');
      setIsCreatingFolder(false);
      refreshData();
  };

  const handleDeleteFolder = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm('Delete folder? Blueprints will be moved to "All Blueprints".')) {
          await storageService.deleteFolder(id);
          if (activeFolderId === id) setActiveFolderId(null);
          refreshData();
      }
  };

  const handleDeleteBlueprint = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this blueprint?')) {
        await storageService.deleteBlueprint(id);
        setBlueprints(prev => prev.filter(b => b.id !== id));
    }
  };

  const handleMoveToFolder = async (e: React.MouseEvent, blueprint: Blueprint, folderId: string | undefined) => {
      e.stopPropagation();
      await storageService.saveBlueprint({ ...blueprint, folderId });
      refreshData();
  };

  const filtered = blueprints
    .filter(b => activeFolderId ? b.folderId === activeFolderId : true)
    .filter(b => b.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Mobile Folder Nav */}
      <div className="md:hidden flex overflow-x-auto gap-2 p-4 bg-surface border-b border-slate-200 dark:border-slate-800 scrollbar-hide">
          <button 
            onClick={() => setActiveFolderId(null)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${activeFolderId === null ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400'}`}
          >
              <Box className="w-4 h-4" />
              All
          </button>
          {folders.map(f => (
              <button 
                key={f.id}
                onClick={() => setActiveFolderId(f.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${activeFolderId === f.id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400'}`}
              >
                  <FolderIcon className="w-4 h-4" />
                  {f.name}
              </button>
          ))}
      </div>

      {/* Desktop Sidebar Folders */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-surface p-4 flex flex-col hidden md:flex shrink-0">
          <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Folders</h2>
              <button onClick={() => setIsCreatingFolder(true)} className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">
                  <FolderPlus className="w-4 h-4" />
              </button>
          </div>
          
          {isCreatingFolder && (
              <div className="mb-4">
                  <Input 
                    autoFocus
                    placeholder="Folder name..." 
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                    onBlur={() => setIsCreatingFolder(false)}
                    className="text-sm py-1"
                  />
              </div>
          )}

          <div className="space-y-1 flex-1 overflow-y-auto">
              <button 
                onClick={() => setActiveFolderId(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${activeFolderId === null ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                  <Box className="w-4 h-4" />
                  All Blueprints
              </button>
              {folders.map(f => (
                  <div key={f.id} className="group relative">
                      <button 
                        onClick={() => setActiveFolderId(f.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${activeFolderId === f.id ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                      >
                          <FolderIcon className="w-4 h-4" />
                          <span className="truncate">{f.name}</span>
                      </button>
                      <button 
                        onClick={(e) => handleDeleteFolder(e, f.id)}
                        className="absolute right-2 top-2 hidden group-hover:block text-slate-400 hover:text-red-500"
                      >
                          <Trash2 className="w-3 h-3" />
                      </button>
                  </div>
              ))}
          </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-12 overflow-y-auto bg-background">
          <div className="max-w-5xl mx-auto space-y-8">
              <div className="flex items-center justify-between">
                 <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        {activeFolderId ? (
                            <>
                                <FolderOpen className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
                                {folders.find(f => f.id === activeFolderId)?.name}
                            </>
                        ) : 'All Blueprints'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {filtered.length} items found
                    </p>
                 </div>
                 <Button onClick={() => navigate('/editor/new')} size="sm" className="md:px-4 md:py-2">+ New</Button>
              </div>

              <div className="relative">
                 <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                 <Input 
                    placeholder="Search blueprints..." 
                    className="pl-10 bg-white dark:bg-slate-900" 
                    value={search} 
                    onChange={e => setSearch(e.target.value)}
                 />
              </div>

              <div className="grid grid-cols-1 gap-4">
                 {filtered.length === 0 ? (
                     <div className="text-center py-20 text-slate-500 bg-surface rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        {search ? 'No matches found.' : 'This folder is empty.'}
                     </div>
                 ) : (
                     filtered.map(bp => (
                         <div 
                            key={bp.id} 
                            onClick={() => navigate(`/editor/${bp.id}`)}
                            className="group bg-surface border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:border-blue-500/50 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                         >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-950 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-800 group-hover:border-blue-500/30 shrink-0">
                                    <Box className="w-6 h-6 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{bp.title}</h3>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <Badge color={bp.status === 'completed' ? 'green' : 'yellow'}>{bp.status}</Badge>
                                        {bp.folderId && (
                                            <Badge color="purple">
                                                {folders.find(f => f.id === bp.folderId)?.name}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-600">
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(bp.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-2 md:mt-0" onClick={e => e.stopPropagation()}>
                                 <div className="relative group/move">
                                     <button className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900" title="Move to Folder">
                                         <FolderIcon className="w-4 h-4" />
                                     </button>
                                     <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 hidden group-hover/move:block z-10">
                                         <button onClick={(e) => handleMoveToFolder(e, bp, undefined)} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
                                             No Folder
                                         </button>
                                         {folders.map(f => (
                                             <button key={f.id} onClick={(e) => handleMoveToFolder(e, bp, f.id)} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                 {f.name}
                                             </button>
                                         ))}
                                     </div>
                                 </div>
                                 <button 
                                    onClick={(e) => handleDeleteBlueprint(e, bp.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                 >
                                     <Trash2 className="w-4 h-4" />
                                 </button>
                            </div>
                         </div>
                     ))
                 )}
              </div>
          </div>
      </div>
    </div>
  );
};