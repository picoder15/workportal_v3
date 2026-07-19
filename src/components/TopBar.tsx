import { useState } from 'react';
import { usePortal } from '../context/PortalContext';
import SettingsModal from './SettingsModal';
import SearchModal from './SearchModal';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';

export default function TopBar() {
  const { state, dispatch } = usePortal();
  const isDark = state.theme === 'dark';
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const recentItems = state.recentPages.map(key => {
    if (key.includes(':')) {
      const [pageId, subPageId] = key.split(':');
      const page = state.pages.find(p => p.id === pageId);
      const subPage = page?.subPages.find(sp => sp.id === subPageId);
      return { pageId, subPageId, title: subPage ? `${page?.title} / ${subPage.title}` : page?.title, isSubPage: true };
    }
    const page = state.pages.find(p => p.id === key);
    return { pageId: key, title: page?.title, isSubPage: false };
  }).filter(item => item.title);

  const iconBtn = (title: string, onClick: () => void, active?: boolean, children?: React.ReactNode) => (
    <button onClick={onClick} title={title}
      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
        active
          ? isDark ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-700'
          : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
      }`}>
      {children}
    </button>
  );

  return (
    <>
      <header className={`flex items-center justify-between px-6 py-3 border-b flex-shrink-0 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} style={{ height: 56 }}>
        {/* Left: breadcrumb */}
        <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          <span>{state.sidebarTitle}</span>
          {state.currentView !== 'editor' && (
            <>
              <svg className="w-3 h-3 opacity-40" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>
              <span className="capitalize">{state.currentView}</span>
            </>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          {iconBtn('Search (Ctrl+K)', () => setSearchOpen(true), false,
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          )}

          {/* Recent pages */}
          <div className="relative">
            {iconBtn('Recent pages', () => setRecentOpen(!recentOpen), recentOpen,
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            )}
            {recentOpen && (
              <div className={`absolute right-0 mt-2 w-64 rounded-lg shadow-xl border z-50 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="p-2">
                  <div className="text-xs font-semibold uppercase tracking-wider px-2 py-1 text-slate-500">Recently viewed</div>
                  {recentItems.length === 0 ? <div className="px-2 py-3 text-sm text-slate-500">No recent pages</div> : (
                    recentItems.map((item, idx) => (
                      <button key={idx}
                        onClick={() => { dispatch({ type: 'SET_ACTIVE_PAGE', pageId: item.pageId, subPageId: item.isSubPage ? item.subPageId! : null }); setRecentOpen(false); }}
                        className={`w-full text-left px-2 py-1.5 rounded-md text-sm ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                        {item.title}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Graph */}
          {iconBtn('Graph View (Ctrl+G)', () => dispatch({ type: 'SET_VIEW', view: 'graph' }), state.currentView === 'graph',
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" strokeWidth="2"/><circle cx="3" cy="5" r="2" strokeWidth="2"/><circle cx="21" cy="5" r="2" strokeWidth="2"/><line x1="12" y1="9" x2="3" y2="6" strokeWidth="2"/><line x1="12" y1="9" x2="21" y2="6" strokeWidth="2"/><line x1="12" y1="15" x2="3" y2="18" strokeWidth="2"/><line x1="12" y1="15" x2="21" y2="18" strokeWidth="2"/></svg>
          )}

          {/* Calendar */}
          {iconBtn('Calendar View', () => dispatch({ type: 'SET_VIEW', view: 'calendar' }), state.currentView === 'calendar',
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          )}

          {/* Keyboard shortcuts */}
          {iconBtn('Keyboard Shortcuts', () => setShortcutsOpen(true), false,
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2" strokeWidth="2"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12"/></svg>
          )}

          {/* Theme toggle */}
          <button onClick={() => dispatch({ type: 'SET_THEME', theme: isDark ? 'light' : 'dark' })}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
            title={isDark ? 'Light Mode' : 'Dark Mode'}>
            {isDark
              ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/></svg>
              : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
            }
          </button>

          {/* Settings */}
          {iconBtn('Settings', () => setSettingsOpen(true), false,
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          )}

          {/* Dashboard */}
          {iconBtn('Dashboard (Ctrl+D)', () => dispatch({ type: 'SET_VIEW', view: 'dashboard' }), state.currentView === 'dashboard',
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
          )}
        </div>
      </header>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)}/>
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)}/>
      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)}/>
    </>
  );
}
