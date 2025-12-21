import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './UI';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-2xl shadow-xl p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-500" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Something went wrong</h1>
              <p className="text-slate-500 dark:text-slate-400">
                Kyoki encountered an unexpected error. The application has been paused to prevent data loss.
              </p>
            </div>

            <div className="p-4 bg-slate-100 dark:bg-slate-950 rounded-lg text-left overflow-auto max-h-32">
                <p className="font-mono text-xs text-red-600 dark:text-red-400 break-words">
                    {this.state.error?.message}
                </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Button 
                variant="secondary" 
                onClick={() => window.location.href = '/'}
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
              <Button 
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Explicit cast to resolve potential type issues with React.Component
    return this.props.children;
  }
}