import { useState } from 'react';
import { usePortal } from '../context/PortalContext';
import { VersionSnapshot } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  subPageId?: string | null;
}

export default function VersionHistoryModal({ isOpen, onClose, pageId, subPageId }: Props) {
  const { state, dispatch } = usePortal();
  const isDark = state.theme === 'dark';
  const [selected, setSelected] = useState<VersionSnapshot | null>(null);
  const [previewMode, setPreviewMode] = useState<'preview' | 'diff'>('preview');

  if (!isOpen) return null;

  const page = state.pages.find(p => p.id === pageId);
  const subPage = subPageId ? page?.subPages.find(sp => sp.id === subPageId) : null;
  const target = subPage || page;
  const versions = [...(target?.versions || [])].reverse(); // newest first
  const currentContent = target?.content || '';

  const handleRestore = (version: VersionSnapshot) => {
    if (!confirm('Restore this version? Current content will be replaced.')) return;
    // First save current as a version
    dispatch({ type: 'SAVE_VERSION', pageId, subPageId: subPageId || undefined, label: 'Auto-saved before restore' });
    dispatch({ type: 'RESTORE_VERSION', pageId, subPageId: subPageId || undefined, versionId: version.id });
    onClose();
  };

  const handleSaveCurrent = () => {
    const label = prompt('Label this version (optional):') ?? undefined;
    dispatch({ type: 'SAVE_VERSION', pageId, subPageId: subPageId || undefined, label });
  };

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '');

  const formatDate = (d: Date) => new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative w-full max-w-4xl mx-4 rounded-2xl shadow-2xl flex flex-col overflow-hidden ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`} style={{ maxHeight: '85vh' }}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-violet-50'}`}>
              <svg className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Version History</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{target?.title} · {versions.length} saved version{versions.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSaveCurrent} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-violet-700 hover:bg-violet-600 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}>
              📸 Save Snapshot
            </button>
            <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Version list */}
          <div className={`w-64 flex-shrink-0 border-r overflow-y-auto ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
            {/* Current version */}
            <button
              onClick={() => setSelected(null)}
              className={`w-full text-left px-4 py-3 border-b transition-colors ${!selected ? (isDark ? 'bg-indigo-700 text-white' : 'bg-indigo-50 border-indigo-100') : (isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-100 hover:bg-white')}`}
            >
              <div className="text-sm font-semibold">Current Version</div>
              <div className={`text-xs mt-0.5 ${!selected ? (isDark ? 'text-indigo-200' : 'text-indigo-500') : (isDark ? 'text-slate-400' : 'text-slate-400')}`}>{formatDate(target?.updatedAt || new Date())} · Now</div>
            </button>

            {versions.length === 0 && (
              <div className={`px-4 py-6 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                No saved versions yet.<br/>Click "Save Snapshot" to create one.
              </div>
            )}

            {versions.map((v, i) => (
              <button
                key={v.id}
                onClick={() => setSelected(v)}
                className={`w-full text-left px-4 py-3 border-b transition-colors ${selected?.id === v.id ? (isDark ? 'bg-indigo-700 text-white' : 'bg-indigo-50') : (isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-100 hover:bg-white')}`}
              >
                <div className="text-sm font-medium">{v.label || `Version ${versions.length - i}`}</div>
                <div className={`text-xs mt-0.5 ${selected?.id === v.id ? (isDark ? 'text-indigo-200' : 'text-indigo-500') : (isDark ? 'text-slate-400' : 'text-slate-400')}`}>
                  {formatDate(v.timestamp)}
                </div>
                <div className={`text-xs mt-0.5 truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {stripHtml(v.content).slice(0, 50) || '(empty)'}
                </div>
              </button>
            ))}
          </div>

          {/* Preview panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Preview toolbar */}
            <div className={`flex items-center gap-2 px-4 py-2 border-b flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
              <button onClick={() => setPreviewMode('preview')} className={`px-3 py-1 rounded-md text-sm ${previewMode === 'preview' ? (isDark ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800') : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>Preview</button>
              <button onClick={() => setPreviewMode('diff')} className={`px-3 py-1 rounded-md text-sm ${previewMode === 'diff' ? (isDark ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800') : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>Diff vs Current</button>
              {selected && (
                <button onClick={() => handleRestore(selected)} className="ml-auto px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white">
                  ↩ Restore This Version
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {previewMode === 'preview' ? (
                <div className={`prose max-w-none text-sm editor-content ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
                  dangerouslySetInnerHTML={{ __html: selected ? selected.content : currentContent }}
                />
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>SELECTED VERSION</div>
                    <div className={`p-3 rounded-lg border text-sm max-h-64 overflow-y-auto ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-green-50 border-green-200 text-slate-700'}`}>
                      {selected ? <div dangerouslySetInnerHTML={{ __html: selected.content || '<em>Empty</em>' }}/> : <em className="text-slate-400">Select a version from the left</em>}
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>CURRENT VERSION</div>
                    <div className={`p-3 rounded-lg border text-sm max-h-64 overflow-y-auto ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-blue-50 border-blue-200 text-slate-700'}`}>
                      <div dangerouslySetInnerHTML={{ __html: currentContent || '<em>Empty</em>' }}/>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
