import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePortal } from '../context/PortalContext';
import TrackerView from './TrackerView';
import VersionHistoryModal from './VersionHistoryModal';
import ExportModal from './ExportModal';
import InternalLinkModal from './InternalLinkModal';
import TemplatesModal from './TemplatesModal';
import BacklinksPanel from './BacklinksPanel';

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  title: string;
  isDark: boolean;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, title, isDark, children }: ToolbarButtonProps) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-all duration-150 ${
        active
          ? isDark ? 'bg-indigo-600 text-white shadow-sm' : 'bg-indigo-100 text-indigo-700 shadow-sm'
          : isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );
}

function Divider({ isDark }: { isDark: boolean }) {
  return <div className={`w-px h-5 mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />;
}

// PiP Preview popup
function PiPPreview({ pageId, subPageId, anchor, x, y, onClose, isDark }: {
  pageId: string; subPageId?: string; anchor?: string;
  x: number; y: number; onClose: () => void; isDark: boolean;
}) {
  const { state, dispatch } = usePortal();
  const page = state.pages.find(p => p.id === pageId);
  const subPage = subPageId ? page?.subPages.find(sp => sp.id === subPageId) : null;
  const content = subPage?.content || page?.content || '';
  const title = subPage?.title || page?.title || '';
  const previewRef = useRef<HTMLDivElement>(null);

  // Scroll to anchor
  useEffect(() => {
    if (anchor && previewRef.current) {
      const elements = previewRef.current.querySelectorAll('h1,h2,h3,h4,p');
      elements.forEach(el => {
        if (el.textContent?.includes(anchor)) {
          el.scrollIntoView({ block: 'start' });
          (el as HTMLElement).style.backgroundColor = isDark ? '#4f46e5' : '#e0e7ff';
        }
      });
    }
  }, [anchor, isDark]);

  const left = Math.min(x, window.innerWidth - 360);
  const top = y + 8;

  return (
    <div
      className={`fixed z-[9999] w-80 rounded-xl shadow-2xl border overflow-hidden flex flex-col ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
      style={{ left, top, maxHeight: 320 }}
      onMouseEnter={onClose}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b flex-shrink-0 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}>
        <span className={`text-xs font-semibold truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>🔍 {title}</span>
        <button onClick={() => { dispatch({ type: 'SET_ACTIVE_PAGE', pageId, subPageId: subPageId || null }); onClose(); }}
          className="text-xs text-indigo-400 hover:text-indigo-300 ml-2 whitespace-nowrap">Open →</button>
      </div>
      {/* Content preview */}
      <div ref={previewRef} className={`flex-1 overflow-y-auto p-3 text-xs editor-content ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
        dangerouslySetInnerHTML={{ __html: content || '<p><em>Empty page</em></p>' }}
      />
    </div>
  );
}

// Link action modal (open or show mesh)
function LinkActionModal({ pageId, subPageId, anchor, onClose, isDark }: {
  pageId: string; subPageId?: string; anchor?: string;
  onClose: () => void; isDark: boolean;
}) {
  const { state, dispatch } = usePortal();
  const page = state.pages.find(p => p.id === pageId);
  const subPage = subPageId ? page?.subPages.find(sp => sp.id === subPageId) : null;
  const title = subPage?.title || page?.title || '';

  const openPage = () => {
    dispatch({ type: 'SET_ACTIVE_PAGE', pageId, subPageId: subPageId || null });
    onClose();
    // Scroll to anchor after navigation
    if (anchor) {
      setTimeout(() => {
        const els = document.querySelectorAll('.editor-content h1,.editor-content h2,.editor-content h3,.editor-content p');
        els.forEach(el => {
          if (el.textContent?.includes(anchor)) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            (el as HTMLElement).style.outline = '2px solid #6366f1';
            setTimeout(() => { (el as HTMLElement).style.outline = ''; }, 2000);
          }
        });
      }, 300);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      <div className="absolute inset-0" onClick={onClose}/>
      <div className={`relative w-72 rounded-xl shadow-2xl border p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <p className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>🔗 {title}{anchor ? ` › ${anchor}` : ''}</p>
        <div className="flex flex-col gap-2">
          <button onClick={openPage} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            Open Page
          </button>
          <button onClick={() => { dispatch({ type: 'SET_VIEW', view: 'graph' }); onClose(); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" strokeWidth="2"/><circle cx="3" cy="5" r="2" strokeWidth="2"/><circle cx="21" cy="5" r="2" strokeWidth="2"/><line x1="12" y1="9" x2="3" y2="6" strokeWidth="2"/><line x1="12" y1="9" x2="21" y2="6" strokeWidth="2"/></svg>
            Show in Graph
          </button>
          <button onClick={onClose} className={`w-full px-3 py-1.5 rounded-lg text-xs ${isDark ? 'text-slate-500 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-50'}`}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

interface EditorProps {
  pageId: string;
  subPageId?: string | null;
}

export default function Editor({ pageId, subPageId }: EditorProps) {
  const { state, dispatch } = usePortal();
  const isDark = state.theme === 'dark';
  const editorRef = useRef<HTMLDivElement>(null);
  const [isSaved, setIsSaved] = useState(true);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const saveTimeoutRef = useRef<number | null>(null);
  const isLoadingRef = useRef(false);
  const [newTag, setNewTag] = useState('');

  // New feature state
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showInternalLink, setShowInternalLink] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showBacklinks, setShowBacklinks] = useState(false);
  const [pipData, setPipData] = useState<{ pageId: string; subPageId?: string; anchor?: string; x: number; y: number } | null>(null);
  const [linkAction, setLinkAction] = useState<{ pageId: string; subPageId?: string; anchor?: string } | null>(null);
  const pipTimeoutRef = useRef<number | null>(null);

  const page = state.pages.find((p) => p.id === pageId);
  const subPage = subPageId ? page?.subPages.find((sp) => sp.id === subPageId) : null;
  const currentContent = subPage ? subPage.content : page?.content ?? '';
  const currentTitle = subPage ? subPage.title : page?.title ?? 'Untitled';
  const currentTarget = subPage || page;
  const isContentLocked = subPage ? subPage.contentLocked : page?.contentLocked;

  useEffect(() => {
    if (!editorRef.current) return;
    isLoadingRef.current = true;
    editorRef.current.innerHTML = currentContent;
    isLoadingRef.current = false;
    setIsSaved(true);
    setSavedAt(null);
  }, [pageId, subPageId]);

  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    if (document.queryCommandState('strikeThrough')) formats.add('strikeThrough');
    if (document.queryCommandState('insertUnorderedList')) formats.add('insertUnorderedList');
    if (document.queryCommandState('insertOrderedList')) formats.add('insertOrderedList');
    setActiveFormats(formats);
  }, []);

  const autoSave = useCallback(() => {
    if (isLoadingRef.current || !editorRef.current) return;
    const content = editorRef.current.innerHTML;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setIsSaved(false);
    saveTimeoutRef.current = window.setTimeout(() => {
      if (subPageId) dispatch({ type: 'SAVE_SUBPAGE_CONTENT', pageId, subPageId, content });
      else dispatch({ type: 'SAVE_PAGE_CONTENT', pageId, content });
      setIsSaved(true);
      setSavedAt(new Date());
    }, 800);
  }, [dispatch, pageId, subPageId]);

  const execFormat = (command: string, value?: string) => {
    if (isContentLocked) return;
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    updateActiveFormats();
    autoSave();
  };

  const handleManualSave = useCallback(() => {
    if (isContentLocked || !editorRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const content = editorRef.current.innerHTML;
    if (subPageId) dispatch({ type: 'SAVE_SUBPAGE_CONTENT', pageId, subPageId, content });
    else dispatch({ type: 'SAVE_PAGE_CONTENT', pageId, content });
    setIsSaved(true);
    setSavedAt(new Date());
  }, [dispatch, isContentLocked, pageId, subPageId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleManualSave(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); execFormat('bold'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); execFormat('italic'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); execFormat('underline'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') { e.preventDefault(); setShowInternalLink(true); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'h') { e.preventDefault(); setShowVersionHistory(true); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); setShowExport(true); }
  };

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const toggleContentLock = () => {
    if (subPage) dispatch({ type: 'SET_CONTENT_LOCK', target: 'subpage', pageId, subPageId, locked: !subPage.contentLocked });
    else dispatch({ type: 'SET_CONTENT_LOCK', target: 'page', pageId, locked: !page?.contentLocked });
  };

  const addTag = () => {
    if (newTag.trim()) {
      if (subPage) dispatch({ type: 'ADD_TAG', target: 'subpage', pageId, subPageId, tag: newTag.trim() });
      else if (page) dispatch({ type: 'ADD_TAG', target: 'page', pageId, tag: newTag.trim() });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    if (subPage) dispatch({ type: 'REMOVE_TAG', target: 'subpage', pageId, subPageId, tag });
    else if (page) dispatch({ type: 'REMOVE_TAG', target: 'page', pageId, tag });
  };

  // Image upload
  const handleImageUpload = () => {
    if (isContentLocked) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        editorRef.current?.focus();
        document.execCommand('insertHTML', false, `<img src="${src}" alt="${file.name}" style="max-width:100%;border-radius:8px;margin:8px 0;" />`);
        autoSave();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Internal link insertion
  const handleInsertLink = (lPageId: string, lPageTitle: string, lSubPageId?: string, lSubPageTitle?: string, anchor?: string) => {
    editorRef.current?.focus();
    const label = anchor ? `${lSubPageTitle || lPageTitle} › ${anchor}` : (lSubPageTitle || lPageTitle);
    const anchorAttr = anchor ? ` data-anchor="${anchor}"` : '';
    const spAttr = lSubPageId ? ` data-spid="${lSubPageId}"` : '';
    const html = `<a class="portal-internal-link" data-pid="${lPageId}"${spAttr}${anchorAttr} href="#" onclick="return false;">${label}</a>&nbsp;`;
    document.execCommand('insertHTML', false, html);
    autoSave();
  };

  // Template apply
  const handleApplyTemplate = (content: string) => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = content;
    autoSave();
  };

  // Hover on internal links → PiP
  const handleEditorMouseOver = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('.portal-internal-link');
    if (!target) { if (pipTimeoutRef.current) clearTimeout(pipTimeoutRef.current); return; }
    const el = target as HTMLElement;
    const pid = el.getAttribute('data-pid');
    if (!pid) return;
    const spid = el.getAttribute('data-spid') || undefined;
    const anchor = el.getAttribute('data-anchor') || undefined;
    const rect = el.getBoundingClientRect();
    if (pipTimeoutRef.current) clearTimeout(pipTimeoutRef.current);
    pipTimeoutRef.current = window.setTimeout(() => {
      setPipData({ pageId: pid, subPageId: spid, anchor, x: rect.left, y: rect.bottom });
    }, 400);
  };

  const handleEditorMouseOut = (e: React.MouseEvent) => {
    const related = e.relatedTarget as HTMLElement;
    if (related?.closest?.('.pip-preview')) return;
    if (pipTimeoutRef.current) clearTimeout(pipTimeoutRef.current);
    setPipData(null);
  };

  // Click on internal link → action modal
  const handleEditorClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('.portal-internal-link');
    if (!target) return;
    e.preventDefault();
    const el = target as HTMLElement;
    const pid = el.getAttribute('data-pid');
    if (!pid) return;
    const spid = el.getAttribute('data-spid') || undefined;
    const anchor = el.getAttribute('data-anchor') || undefined;
    setLinkAction({ pageId: pid, subPageId: spid, anchor });
    setPipData(null);
  };

  const wordCount = currentContent.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(w => w.length > 0).length;
  const charCount = currentContent.replace(/<[^>]*>/g, '').length;

  if (!page) return null;
  if (subPage?.isTracker) return <TrackerView pageId={pageId} />;

  return (
    <div className={`flex h-full transition-colors duration-300 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
      {/* Main editor column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Editor Top Bar */}
        <div className={`flex items-center justify-between px-6 py-3 border-b flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span className={isDark ? 'text-slate-200 font-medium' : 'text-slate-700 font-medium'}>{page.title}</span>
            {subPage && (<><svg className="w-4 h-4 opacity-40" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg><span className={isDark ? 'text-slate-200 font-medium' : 'text-slate-700 font-medium'}>{subPage.title}</span></>)}
          </div>
          <div className="flex items-center gap-2">
            {!isSaved ? (
              <span className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"/>Saving...</span>
            ) : savedAt ? (
              <span className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}><span className="w-1.5 h-1.5 rounded-full bg-green-400"/>Saved at {formatTime(savedAt)}</span>
            ) : null}

            {/* Version History */}
            <button onClick={() => setShowVersionHistory(true)} title="Version History (Ctrl+H)" className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </button>

            {/* Export */}
            <button onClick={() => setShowExport(true)} title="Export (Ctrl+E)" className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            </button>

            {/* Backlinks */}
            <button onClick={() => setShowBacklinks(v => !v)} title="Backlinks panel" className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${showBacklinks ? (isDark ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-700') : (isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-500 hover:bg-slate-100')}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
            </button>

            <button onClick={handleManualSave} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${isDark ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`} title="Save (Ctrl+S)">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
              Save
            </button>
            <button onClick={toggleContentLock} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${isContentLocked ? 'text-amber-500' : 'text-slate-400'}`} title={isContentLocked ? 'Unlock content' : 'Lock content'}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isContentLocked ? "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" : "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"}/></svg>
            </button>
          </div>
        </div>

        {/* Tags row */}
        <div className={`px-6 py-2 border-b flex items-center gap-2 flex-wrap ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <span className="text-xs text-slate-500">🏷️</span>
          {(currentTarget?.tags || []).map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
              {tag}<button onClick={() => removeTag(tag)} className="hover:text-red-500">×</button>
            </span>
          ))}
          <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Add tag..." className={`text-xs px-2 py-0.5 rounded border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}/>
          <button onClick={addTag} className="text-xs px-2 py-0.5 rounded bg-indigo-500 text-white">+</button>
        </div>

        {/* Toolbar */}
        <div className={`flex items-center gap-0.5 px-4 py-2 border-b flex-shrink-0 flex-wrap ${isDark ? 'border-slate-700' : 'border-slate-100 bg-slate-50'}`} style={{ background: isDark ? '#0f172a' : undefined }}>
          <ToolbarButton onClick={() => execFormat('bold')} active={activeFormats.has('bold')} title="Bold (Ctrl+B)" isDark={isDark}><strong>B</strong></ToolbarButton>
          <ToolbarButton onClick={() => execFormat('italic')} active={activeFormats.has('italic')} title="Italic (Ctrl+I)" isDark={isDark}><em>I</em></ToolbarButton>
          <ToolbarButton onClick={() => execFormat('underline')} active={activeFormats.has('underline')} title="Underline (Ctrl+U)" isDark={isDark}><span className="underline">U</span></ToolbarButton>
          <ToolbarButton onClick={() => execFormat('strikeThrough')} active={activeFormats.has('strikeThrough')} title="Strikethrough" isDark={isDark}><span className="line-through">S</span></ToolbarButton>
          <Divider isDark={isDark}/>
          <ToolbarButton onClick={() => execFormat('formatBlock', 'h1')} title="Heading 1" isDark={isDark}><span className="text-xs font-bold">H1</span></ToolbarButton>
          <ToolbarButton onClick={() => execFormat('formatBlock', 'h2')} title="Heading 2" isDark={isDark}><span className="text-xs font-bold">H2</span></ToolbarButton>
          <ToolbarButton onClick={() => execFormat('formatBlock', 'h3')} title="Heading 3" isDark={isDark}><span className="text-xs font-bold">H3</span></ToolbarButton>
          <ToolbarButton onClick={() => execFormat('formatBlock', 'p')} title="Paragraph" isDark={isDark}><span className="text-xs">¶</span></ToolbarButton>
          <Divider isDark={isDark}/>
          <ToolbarButton onClick={() => execFormat('insertUnorderedList')} active={activeFormats.has('insertUnorderedList')} title="Bullet List" isDark={isDark}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => execFormat('insertOrderedList')} active={activeFormats.has('insertOrderedList')} title="Numbered List" isDark={isDark}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
          </ToolbarButton>
          <Divider isDark={isDark}/>
          <ToolbarButton onClick={() => execFormat('justifyLeft')} title="Align Left" isDark={isDark}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8M4 18h12"/></svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => execFormat('justifyCenter')} title="Align Center" isDark={isDark}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M8 12h8M6 18h12"/></svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => execFormat('justifyRight')} title="Align Right" isDark={isDark}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M12 12h8M8 18h12"/></svg>
          </ToolbarButton>
          <Divider isDark={isDark}/>
          <ToolbarButton onClick={() => execFormat('indent')} title="Indent" isDark={isDark}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16M9 9l3 3-3 3"/></svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => execFormat('outdent')} title="Outdent" isDark={isDark}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16M15 9l-3 3 3 3"/></svg>
          </ToolbarButton>
          <Divider isDark={isDark}/>

          {/* Internal Link */}
          <ToolbarButton onClick={() => setShowInternalLink(true)} title="Insert Internal Link (Ctrl+L)" isDark={isDark}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
          </ToolbarButton>

          {/* Image upload */}
          <ToolbarButton onClick={handleImageUpload} title="Insert Image" isDark={isDark}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </ToolbarButton>

          {/* Templates */}
          <ToolbarButton onClick={() => setShowTemplates(true)} title="Insert Template" isDark={isDark}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>
          </ToolbarButton>

          <ToolbarButton onClick={() => execFormat('removeFormat')} title="Clear Formatting" isDark={isDark}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </ToolbarButton>
        </div>

        {/* Page Title */}
        <div className="px-10 pt-8 pb-2 flex-shrink-0">
          <h1 className={`text-3xl font-bold outline-none ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentTitle}</h1>
          <div className={`mt-1 text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            {subPage ? `Sub page of "${page.title}" · Updated: ${new Date(subPage.updatedAt).toLocaleDateString()}` : `Updated: ${new Date(page.updatedAt).toLocaleDateString()}`}
            {isContentLocked && <span className="ml-2 text-amber-500">(View-only)</span>}
          </div>
          <div className={`mt-4 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}/>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-10 py-4">
          <div
            ref={editorRef}
            contentEditable={!isContentLocked}
            suppressContentEditableWarning
            onInput={autoSave}
            onKeyDown={handleKeyDown}
            onKeyUp={updateActiveFormats}
            onMouseUp={updateActiveFormats}
            onFocus={updateActiveFormats}
            onMouseOver={handleEditorMouseOver}
            onMouseOut={handleEditorMouseOut}
            onClick={handleEditorClick}
            spellCheck={true}
            className={`min-h-full outline-none text-base leading-relaxed focus:outline-none editor-content ${isDark ? 'text-slate-200' : 'text-slate-800'} ${isContentLocked ? 'opacity-80 cursor-default' : ''}`}
            data-placeholder="Start writing here… (Ctrl+L for internal links, toolbar for formatting)"
            style={{ minHeight: '60vh' }}
          />
        </div>

        {/* Footer */}
        <div className={`px-10 py-2 text-xs border-t ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
          📝 Words: {wordCount} | Characters: {charCount} | Versions: {(currentTarget?.versions || []).length}
        </div>
      </div>

      {/* Backlinks panel */}
      {showBacklinks && (
        <BacklinksPanel pageId={pageId} subPageId={subPageId} onClose={() => setShowBacklinks(false)}/>
      )}

      {/* PiP preview */}
      {pipData && (
        <div className="pip-preview" onMouseLeave={() => setPipData(null)}>
          <PiPPreview {...pipData} onClose={() => setPipData(null)} isDark={isDark}/>
        </div>
      )}

      {/* Link action modal */}
      {linkAction && (
        <LinkActionModal {...linkAction} onClose={() => setLinkAction(null)} isDark={isDark}/>
      )}

      {/* Modals */}
      <VersionHistoryModal isOpen={showVersionHistory} onClose={() => setShowVersionHistory(false)} pageId={pageId} subPageId={subPageId}/>
      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} pageId={pageId} subPageId={subPageId}/>
      <InternalLinkModal isOpen={showInternalLink} onClose={() => setShowInternalLink(false)} onInsert={handleInsertLink}/>
      <TemplatesModal isOpen={showTemplates} onClose={() => setShowTemplates(false)} onApply={handleApplyTemplate}/>
    </div>
  );
}
