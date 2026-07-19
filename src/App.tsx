import { useEffect, useState } from 'react';
import { usePortal, PortalProvider } from './context/PortalContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Editor from './components/Editor';
import WelcomeScreen from './components/WelcomeScreen';
import Dashboard from './components/Dashboard';
import GraphView from './components/GraphView';
import CalendarView from './components/CalendarView';
import SearchModal from './components/SearchModal';

function PortalApp() {
  const { state, dispatch } = usePortal();
  const isDark = state.theme === 'dark';
  const { activePageId, activeSubPageId, currentView } = state;
  const [searchOpen, setSearchOpen] = useState(false);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      const shortcuts = state.shortcuts || [];

      const match = (id: string) => {
        const s = shortcuts.find(s => s.id === id);
        if (!s || !s.enabled) return false;
        const parts = s.keys.toLowerCase().split('+');
        const keyPart = parts[parts.length - 1];
        const needsShift = parts.includes('shift');
        const needsAlt = parts.includes('alt');
        return e.key.toLowerCase() === keyPart && (!needsShift || e.shiftKey) && (!needsAlt || e.altKey);
      };

      if (match('search')) { e.preventDefault(); setSearchOpen(true); }
      if (match('new_page')) { e.preventDefault(); dispatch({ type: 'ADD_PAGE' }); }
      if (match('dashboard')) { e.preventDefault(); dispatch({ type: 'SET_VIEW', view: 'dashboard' }); }
      if (match('graph')) { e.preventDefault(); dispatch({ type: 'SET_VIEW', view: 'graph' }); }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.shortcuts, dispatch]);

  const renderMain = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'graph': return <GraphView />;
      case 'calendar': return <CalendarView />;
      default:
        if (activePageId) {
          return <Editor key={`${activePageId}-${activeSubPageId ?? 'main'}`} pageId={activePageId} subPageId={activeSubPageId} />;
        }
        return <WelcomeScreen />;
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-hidden">
          {renderMain()}
        </main>
      </div>
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <PortalProvider>
      <PortalApp />
    </PortalProvider>
  );
}
