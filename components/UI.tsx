
import React, { useEffect, useState, useId, useMemo } from 'react';
import { RefreshCw, HelpCircle, Copy, Check } from 'lucide-react';
import mermaid from 'mermaid';

// Initialize mermaid
mermaid.initialize({ 
    startOnLoad: false, 
    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
    securityLevel: 'loose',
    fontFamily: 'Inter, sans-serif'
});

// --- Mermaid Diagram ---
const MermaidDiagram: React.FC<{ code: string }> = React.memo(({ code }) => {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const id = useId().replace(/:/g, ''); 

  useEffect(() => {
    let mounted = true;
    const render = async () => {
        try {
            const { svg } = await mermaid.render(`mermaid-${id}`, code);
            if (mounted) {
                setSvg(svg);
                setError('');
            }
        } catch (e) {
            console.error("Mermaid Render Fail", e);
            if (mounted) setError('Failed to render diagram. Syntax might be invalid.');
        }
    };
    render();
    return () => { mounted = false; };
  }, [code, id]);

  if (error) {
      return (
          <div className="p-4 border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 rounded-lg text-xs text-red-600 dark:text-red-400 font-mono my-4">
              {error}
              <pre className="mt-2 opacity-50">{code}</pre>
          </div>
      );
  }

  return (
      <div className="my-6 overflow-x-auto bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex justify-center">
          <div dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
  );
});

// --- Card ---
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, ...props }) => (
  <div 
    onClick={onClick}
    className={`bg-surface border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', isLoading, className = '', children, ...props }) => {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary hover:bg-blue-700 text-white focus:ring-blue-500",
    secondary: "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-100 focus:ring-slate-500 border border-slate-200 dark:border-slate-700",
    ghost: "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-500 border border-red-500/50"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
};

// --- Switch ---
export const Switch = ({ checked, onChange, disabled }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
      checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span className="sr-only">Use setting</span>
    <span
      aria-hidden="true"
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

// --- Badge ---
export interface BadgeProps {
  children?: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'slate' | 'red' | 'purple';
}

export const Badge = ({ children, color = 'blue' }: BadgeProps) => {
  const colors = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    yellow: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    slate: "bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600",
    red: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
};

// --- Input ---
export const Input = ({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    className={`w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors ${className}`}
    {...props}
  />
);

// --- CodeBlock ---
export const CodeBlock: React.FC<{ language: string, code: string }> = ({ language, code }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-4 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 group">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 uppercase font-mono">{language || 'text'}</span>
            <button 
                onClick={handleCopy}
                className="text-xs flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
            </button>
            </div>
            <pre className="p-4 overflow-x-auto text-sm font-mono text-slate-800 dark:text-slate-200 leading-relaxed bg-white dark:bg-transparent">
            <code>{code}</code>
            </pre>
        </div>
    );
};

// --- Table Parser ---
const parseTable = (block: string, key: number) => {
  const rows = block.trim().split('\n');
  const headers = rows[0].split('|').map(c => c.trim()).filter(c => c);
  const data = rows.slice(2).map(r => r.split('|').map(c => c.trim()).filter(c => c));
  
  return (
    <div key={key} className="my-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase text-xs">
          <tr>
            {headers.map((h, i) => <th key={i} className="px-6 py-3">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {data.map((row, i) => (
            <tr key={i} className="bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/50">
               {row.map((cell, j) => <td key={j} className="px-6 py-4 font-mono text-slate-700 dark:text-slate-300">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- Diff Viewer ---
interface DiffViewerProps {
    oldText: string;
    newText: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ oldText, newText }) => {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    
    const maxLines = Math.max(oldLines.length, newLines.length);
    const renderLines = [];
    
    for (let i = 0; i < maxLines; i++) {
        const oldL = oldLines[i];
        const newL = newLines[i];
        
        if (oldL === newL) {
            renderLines.push(
                <div key={i} className="flex text-xs font-mono opacity-60">
                    <div className="w-10 text-right pr-2 select-none border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-600">{i+1}</div>
                    <div className="pl-4 whitespace-pre-wrap text-slate-800 dark:text-slate-300">{newL}</div>
                </div>
            );
        } else {
            if (oldL !== undefined) {
                renderLines.push(
                    <div key={`rem-${i}`} className="flex text-xs font-mono bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                        <div className="w-10 text-right pr-2 select-none border-r border-slate-200 dark:border-slate-800 text-red-600 dark:text-red-700">-</div>
                        <div className="pl-4 whitespace-pre-wrap">{oldL}</div>
                    </div>
                );
            }
            if (newL !== undefined) {
                renderLines.push(
                    <div key={`add-${i}`} className="flex text-xs font-mono bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                        <div className="w-10 text-right pr-2 select-none border-r border-slate-200 dark:border-slate-800 text-green-600 dark:text-green-700">+</div>
                        <div className="pl-4 whitespace-pre-wrap">{newL}</div>
                    </div>
                );
            }
        }
    }

    return (
        <div className="w-full h-full overflow-auto bg-white dark:bg-slate-950 p-4 border rounded-lg border-slate-200 dark:border-slate-800">
            {renderLines}
        </div>
    );
};

interface MarkdownViewProps {
    content: string;
    onSectionAction?: (title: string, content: string, action: 'explain' | 'regenerate') => void;
    onHeadersParsed?: (headers: { id: string, title: string, level: number }[]) => void;
}

export const MarkdownView: React.FC<MarkdownViewProps> = React.memo(({ content, onSectionAction, onHeadersParsed }) => {
  // Use useMemo to avoid re-parsing massive strings on every render cycle unless content specifically changes
  const parts = useMemo(() => content.split(/(```[\s\S]*?```)/g), [content]);
  
  // Parse headers effect - simplified to run only when content length changes significantly to avoid layout thrashing
  useEffect(() => {
      if (onHeadersParsed) {
          const lines = content.split('\n');
          const headers = lines
            .filter(line => line.startsWith('# ') || line.startsWith('## '))
            .map((line, index) => ({
                id: `sec-${index}`,
                title: line.replace(/^#+\s/, ''),
                level: line.startsWith('## ') ? 2 : 1
            }));
          onHeadersParsed(headers);
      }
  }, [content.length, onHeadersParsed]); // Depend on length as a proxy for structural changes to reduce frequency

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w*)\n([\s\S]*?)\n?```/); // Improved regex to handle trailing newlines gracefully
          if (match) {
            const lang = match[1];
            const code = match[2];
            if (lang === 'mermaid') {
                return <MermaidDiagram key={index} code={code} />;
            }
            return <CodeBlock key={index} language={lang} code={code} />;
          }
          // Fallback for empty blocks
          return null;
        } else {
          const sections = part.split(/^(#+ .*)/m);
          return sections.map((sec, sIdx) => {
              if (sec.startsWith('# ')) { // H1
                  const title = sec.replace(/^#\s/, '');
                  const id = `sec-${title.replace(/\s+/g, '-').toLowerCase()}`;
                  return (
                    <div key={`${index}-${sIdx}`} id={id} className="group relative mt-8 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
                            {onSectionAction && (
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                    <button onClick={() => onSectionAction(title, '', 'explain')} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800" title="Explain">
                                        <HelpCircle className="w-4 h-4"/>
                                    </button>
                                    <button onClick={() => onSectionAction(title, '', 'regenerate')} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800" title="Regenerate">
                                        <RefreshCw className="w-4 h-4"/>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                  );
              }
              if (sec.startsWith('## ')) {
                  const title = sec.replace(/^##\s/, '');
                  return <h2 key={`${index}-${sIdx}`} className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-6 mb-3">{title}</h2>;
              }
              if (sec.startsWith('### ')) {
                  return <h3 key={`${index}-${sIdx}`} className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-4 mb-2">{sec.replace(/^###\s/, '')}</h3>;
              }
              
              const paragraphs = sec.split(/\n\n+/);
              return (
                <div key={`${index}-${sIdx}`}>
                  {paragraphs.map((para, pIndex) => {
                     const line = para.trim();
                     if (!line) return null;

                     if (line.startsWith('- ') || line.startsWith('* ')) {
                        const items = line.split('\n').filter(l => l.trim());
                        return (
                            <ul key={pIndex} className="list-disc list-outside ml-6 space-y-1 my-3 text-slate-700 dark:text-slate-300">
                                {items.map((item, i) => <li key={i}>{item.replace(/^[-*]\s/, '')}</li>)}
                            </ul>
                        );
                     }
                     if (/^\d+\./.test(line)) {
                        const items = line.split('\n').filter(l => l.trim());
                        return (
                            <ol key={pIndex} className="list-decimal list-outside ml-6 space-y-1 my-3 text-slate-700 dark:text-slate-300">
                                {items.map((item, i) => <li key={i}>{item.replace(/^\d+\.\s/, '')}</li>)}
                            </ol>
                        );
                     }
                     if (line.includes('|') && line.includes('---')) {
                        return parseTable(line, pIndex);
                     }
                     return <p key={pIndex} className="text-slate-700 dark:text-slate-300 leading-7 mb-3 whitespace-pre-line">{line}</p>;
                  })}
                </div>
              );
          });
        }
      })}
    </div>
  );
}, (prev, next) => prev.content === next.content); // Custom comparator for strict equality check optimization
