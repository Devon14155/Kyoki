
import React, { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip, Mic, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatInputBarProps {
  onSendMessage: (message: string) => void;
  isGenerating: boolean;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({ onSendMessage, isGenerating }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
  };
  
  // Handle send
  const handleSend = () => {
    if (input.trim() && !isGenerating) {
      onSendMessage(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };
  
  // Keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="sticky bottom-0 w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 bg-slate-100 dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all shadow-sm">
          
          <button className="p-2 text-slate-400 hover:text-blue-500 transition-colors rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 shrink-0">
            <Paperclip className="w-5 h-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Describe the software you want to build..."
            className="w-full max-h-[150px] py-2.5 bg-transparent border-none focus:ring-0 resize-none text-slate-900 dark:text-slate-100 placeholder-slate-500 text-sm leading-relaxed"
            rows={1}
            disabled={isGenerating}
          />

          <div className="flex items-center gap-1 shrink-0">
             <button className="p-2 text-slate-400 hover:text-blue-500 transition-colors rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800">
                <Mic className="w-5 h-5" />
             </button>
             <motion.button
                onClick={handleSend}
                disabled={!input.trim() || isGenerating}
                whileTap={{ scale: 0.95 }}
                className={`p-2 rounded-xl transition-all ${
                    input.trim() 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                }`}
             >
                {isGenerating ? <Sparkles className="w-5 h-5 animate-pulse" /> : <Send className="w-5 h-5" />}
             </motion.button>
          </div>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-2">
            Kyoki AI Agents can make mistakes. Please verify architecture decisions.
        </p>
      </div>
    </div>
  );
};
