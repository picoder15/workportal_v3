import { usePortal } from '../context/PortalContext';

interface Props { open: boolean; onClose: () => void; }

export default function SettingsModal({ open, onClose }: Props) {
  const { state, dispatch } = usePortal();
  const isDark = state.theme === 'dark';

  if (!open) return null;

  const handleClearData = () => {
    if (confirm('Delete ALL pages and data? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const exportWorkspace = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'portal-backup.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const importWorkspace = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/json';
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try { dispatch({ type: 'LOAD_STATE', state: JSON.parse(ev.target?.result as string) }); }
        catch { alert('Invalid file'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const copySyncId = () => {
    const id = `portal_${btoa(state.sidebarTitle).slice(0, 8)}_${Date.now().toString(36)}`;
    navigator.clipboard.writeText(id);
    alert('Sync ID copied! Note: cross-device sync requires a shared server. Cross-tab sync (same browser) works automatically.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative w-full max-w-md mx-4 rounded-2xl shadow-2xl flex flex-col overflow-hidden ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`} style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-5 border-b flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-indigo-50'}`}>
              <svg className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Settings</h2>
          </div>
          <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Appearance */}
          <div>
            <h3 className={`text-xs font-semibold uppercase tracking-widest mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Appearance</h3>
            <div className="grid grid-cols-2 gap-3">
              {(['light', 'dark'] as const).map(t => (
                <button key={t} onClick={() => dispatch({ type: 'SET_THEME', theme: t })}
                  className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${state.theme === t ? 'border-indigo-500 ' + (t === 'light' ? 'bg-indigo-50' : 'bg-indigo-900/30') : isDark ? 'border-slate-600 bg-slate-700/50 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className={`w-full h-14 rounded-lg border overflow-hidden flex ${t === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className={`w-1/3 h-full ${t === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}/>
                    <div className="flex-1 p-1.5 space-y-1">
                      <div className={`h-1.5 rounded-full w-3/4 ${t === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}/>
                      <div className={`h-1.5 rounded-full w-1/2 ${t === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}/>
                    </div>
                  </div>
                  <span className={`text-sm font-medium capitalize ${state.theme === t ? (t === 'dark' ? 'text-indigo-400' : 'text-indigo-700') : isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t}</span>
                  {state.theme === t && <div className="absolute top-2 right-2 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center"><svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg></div>}
                </button>
              ))}
            </div>
          </div>

          {/* Workspace */}
          <div>
            <h3 className={`text-xs font-semibold uppercase tracking-widest mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Workspace</h3>
            <div className={`rounded-xl border p-4 space-y-2 ${isDark ? 'border-slate-700 bg-slate-700/30' : 'border-slate-200 bg-slate-50'}`}>
              {[
                { label: 'Total Pages', value: state.pages.length },
                { label: 'Sub Pages', value: state.pages.reduce((a, p) => a + p.subPages.filter(sp => !sp.isTracker).length, 0) },
                { label: 'Pinned Pages', value: state.pinnedPages.length },
                { label: 'Workspace Name', value: state.sidebarTitle },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{label}</span>
                  <span className={`text-sm font-semibold truncate max-w-32 ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</span>
                </div>
              ))}
              <div className="pt-2 space-y-2">
                <button onClick={exportWorkspace} className={`w-full flex items-center gap-2 justify-center px-4 py-2 rounded-xl border text-sm font-medium ${isDark ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}>💾 Export Workspace</button>
                <button onClick={importWorkspace} className={`w-full flex items-center gap-2 justify-center px-4 py-2 rounded-xl border text-sm font-medium ${isDark ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}>📂 Import Workspace</button>
              </div>
            </div>
          </div>

          {/* Sync */}
          <div>
            <h3 className={`text-xs font-semibold uppercase tracking-widest mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Sync</h3>
            <div className={`rounded-xl border p-4 space-y-3 ${isDark ? 'border-slate-700 bg-slate-700/30' : 'border-slate-200 bg-slate-50'}`}>
              <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <div className="w-2 h-2 rounded-full bg-green-400"/>
                <span>Cross-tab sync active (same browser)</span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Changes sync automatically across all open tabs in the same browser via BroadcastChannel.
              </p>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                For cross-device sync, use Export Workspace on one device and Import Workspace on another.
              </p>
              <button onClick={copySyncId} className={`w-full flex items-center gap-2 justify-center px-4 py-2 rounded-xl border text-sm font-medium ${isDark ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}>🔗 Copy Workspace ID</button>
            </div>
          </div>

          {/* Danger Zone */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 text-red-500">Danger Zone</h3>
            <button onClick={handleClearData} className="w-full flex items-center gap-2 justify-center px-4 py-2.5 rounded-xl border-2 border-red-500/40 text-red-500 hover:bg-red-500/10 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              Clear All Data
            </button>
          </div>
        </div>

        <div className={`px-6 py-4 border-t flex items-center justify-between flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Portal App v2.0</span>
          <button onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>Close</button>
        </div>
      </div>
    </div>
  );
}
