import { useState } from 'react';
import { usePortal } from '../context/PortalContext';
import { ShortcutDef } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: Props) {
  const { state, dispatch } = usePortal();
  const isDark = state.theme === 'dark';
  const [editing, setEditing] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState('');

  if (!isOpen) return null;

  const shortcuts = state.shortcuts || [];

  const startRecording = (shortcutId: string) => {
    setEditing(shortcutId);
    setRecording(true);
    setRecordedKeys('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, shortcutId: string) => {
    if (!recording) return;
    e.preventDefault();
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    const key = e.key;
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      parts.push(key.toUpperCase());
      const keyStr = parts.join('+');
      setRecordedKeys(keyStr);
      dispatch({ type: 'UPDATE_SHORTCUT', id: shortcutId, keys: keyStr });
      setRecording(false);
      setEditing(null);
    }
  };

  const toggleEnabled = (s: ShortcutDef) => {
    dispatch({ type: 'UPDATE_SHORTCUT', id: s.id, enabled: !s.enabled });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl flex flex-col ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`} style={{ maxHeight: '80vh' }}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Keyboard Shortcuts</h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Click a shortcut key to change it</p>
          </div>
          <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {shortcuts.map(s => (
            <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isDark ? 'border-slate-700 bg-slate-700/40' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                {/* Enable/disable toggle */}
                <button onClick={() => toggleEnabled(s)} className={`w-8 h-4 rounded-full flex items-center transition-colors ${s.enabled ? 'bg-indigo-500' : isDark ? 'bg-slate-600' : 'bg-slate-300'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform mx-0.5 ${s.enabled ? 'translate-x-4' : ''}`}/>
                </button>
                <span className={`text-sm ${s.enabled ? (isDark ? 'text-slate-200' : 'text-slate-700') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>{s.label}</span>
              </div>

              {/* Key badge */}
              {editing === s.id && recording ? (
                <div
                  className="px-3 py-1 rounded-lg text-xs font-mono bg-indigo-600 text-white animate-pulse outline-none"
                  tabIndex={0}
                  autoFocus
                  onKeyDown={e => handleKeyDown(e, s.id)}
                  onBlur={() => { setRecording(false); setEditing(null); }}
                >
                  Press keys…
                </div>
              ) : (
                <button
                  onClick={() => startRecording(s.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono border transition-colors ${
                    s.enabled
                      ? isDark ? 'border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      : isDark ? 'border-slate-700 bg-slate-800 text-slate-600' : 'border-slate-100 bg-slate-100 text-slate-400'
                  }`}
                  title="Click to record new shortcut"
                >
                  {s.keys}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t text-xs flex items-center justify-between ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
          <span>Toggle the switch to enable/disable a shortcut</span>
          <button onClick={onClose} className={`px-3 py-1.5 rounded-lg ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>Close</button>
        </div>
      </div>
    </div>
  );
}
