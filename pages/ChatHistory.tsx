
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storage';
import { Conversation, Blueprint } from '../types';
import { Card, Badge, Input } from '../components/UI';
import { MessageSquare, Clock, Search, Bot, User, ArrowRight, Trash2 } from 'lucide-react';

export const ChatHistory = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [blueprints, setBlueprints] = useState<Record<string, Blueprint>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [convs, bps] = await Promise.all([
          storageService.getConversations(),
          storageService.getBlueprints()
        ]);
        
        // Map blueprints for title lookup
        const bpMap: Record<string, Blueprint> = {};
        bps.forEach(b => bpMap[b.id] = b);
        
        setBlueprints(bpMap);
        setConversations(convs.sort((a, b) => b.metadata.updatedAt - a.metadata.updatedAt));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm('Delete this conversation history?')) {
          await storageService.deleteConversation(id);
          setConversations(prev => prev.filter(c => c.id !== id));
      }
  };

  const filtered = conversations.filter(c => {
      const title = blueprints[c.blueprintId]?.title || c.title || 'Untitled';
      const lastMsg = c.messages[c.messages.length - 1]?.content || '';
      return title.toLowerCase().includes(search.toLowerCase()) || lastMsg.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) return <div className="p-12 text-center text-slate-500">Loading Threads...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-12 space-y-8">
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Team Chats</h1>
            <p className="text-slate-600 dark:text-slate-400">History of your architecture discussions with the agent team.</p>
          </div>
      </div>

      <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          <Input 
             placeholder="Search messages or blueprints..." 
             className="pl-10"
             value={search}
             onChange={e => setSearch(e.target.value)}
          />
      </div>

      <div className="grid grid-cols-1 gap-4">
          {filtered.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No conversations found.</p>
              </div>
          ) : (
              filtered.map(conv => {
                  const bp = blueprints[conv.blueprintId];
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  const agentCount = conv.messages.filter(m => m.role === 'assistant').length;
                  
                  return (
                      <div 
                        key={conv.id}
                        onClick={() => navigate(`/editor/${conv.blueprintId}`)}
                        className="group bg-surface border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer relative"
                      >
                          <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                      <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div>
                                      <h3 className="font-semibold text-slate-900 dark:text-white text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                          {bp?.title || conv.title || 'Untitled Session'}
                                      </h3>
                                      <div className="flex items-center gap-2 text-xs text-slate-500">
                                          <Badge color={bp?.status === 'completed' ? 'green' : 'blue'}>{bp?.status || 'Active'}</Badge>
                                          <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(conv.metadata.updatedAt).toLocaleDateString()}</span>
                                          <span>• {conv.messages.length} messages</span>
                                      </div>
                                  </div>
                              </div>
                              <button 
                                onClick={(e) => handleDelete(e, conv.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              >
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                          
                          <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-3 text-sm text-slate-600 dark:text-slate-300 line-clamp-2 font-mono border border-slate-100 dark:border-slate-800/50">
                              {lastMsg ? (
                                  <span className="flex items-center gap-2">
                                      {lastMsg.role === 'user' ? <User className="w-3 h-3 text-slate-400"/> : <Bot className="w-3 h-3 text-blue-500"/>}
                                      <span className="opacity-80">{lastMsg.content.slice(0, 200)}</span>
                                  </span>
                              ) : (
                                  <span className="italic opacity-50">Empty conversation</span>
                              )}
                          </div>
                          
                          <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                              <ArrowRight className="w-6 h-6 text-blue-500" />
                          </div>
                      </div>
                  );
              })
          )}
      </div>
    </div>
  );
};
