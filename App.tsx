
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Editor } from './pages/Editor';
import { SettingsPage } from './pages/Settings';
import { Library } from './pages/Library';
import { ContextManager } from './pages/ContextManager';
import { ChatHistory } from './pages/ChatHistory'; 
import { GeneralChat } from './pages/GeneralChat'; 
import { DevTools } from './pages/DevTools';
import { TraceViewer } from './pages/TraceViewer'; // Import
import { storageService } from './services/storage';
import { ErrorBoundary } from './components/ErrorBoundary';

const App = () => {
  useEffect(() => {
    // Apply theme on load
    const settings = storageService.getSettings();
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/editor/new" element={<Editor />} />
            <Route path="/editor/:id" element={<Editor />} />
            <Route path="/chats" element={<ChatHistory />} />
            <Route path="/assist" element={<GeneralChat />} /> 
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/library" element={<Library />} />
            <Route path="/context" element={<ContextManager />} />
            <Route path="/devtools" element={<DevTools />} />
            <Route path="/trace" element={<TraceViewer />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
