import { useState, useRef, useEffect } from 'react';
import { usePortal } from '../context/PortalContext';
import { Page } from '../types';

interface EditableTitleProps {
  value: string;
  onSave: (val: string) => void;
  className?: string;
  placeholder?: string;
  locked?: boolean;
}

function EditableTitle({ value, onSave, className = '', placeholder = 'Untitled', locked = false }: EditableTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);
  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim() || placeholder;
    setDraft(trimmed);
    if (trimmed !== value) onSave(trimmed);
  };

  if (locked) return <span className={`truncate ${className}`}>{value || placeholder}</span>;
  if (editing) return (
    <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
      onClick={e => e.stopPropagation()}
      className={`bg-transparent outline-none border-b border-current w-full ${className}`} placeholder={placeholder}/>
  );

  return (
    <span className={`cursor-text truncate flex items-center gap-1 group/title ${className}`} onClick={e => { e.stopPropagation(); setEditing(true); }} title="Click to rename">
      <span className="truncate">{value || placeholder}</span>
      <svg className="w-3 h-3 flex-shrink-0 opacity-0 group-hover/title:opacity-60 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
      </svg>
    </span>
  );
}

function PageItem({ page }: { page: Page }) {
  const { state, dispatch } = usePortal();
  const isActive = state.activePageId === page.id && !state.activeSubPageId;
  const [hovered, setHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDark = state.theme === 'dark';
  const isPinned = state.pinnedPages.includes(page.id);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); }
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  return (
    <div>
      <div
        className={`group relative flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer transition-all duration-150 ${
          isActive ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800')
          : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'
        }`}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onClick={() => dispatch({ type: 'SET_ACTIVE_PAGE', pageId: page.id, subPageId: null })}
      >
        {/* Expand */}
        <button onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_PAGE_EXPAND', pageId: page.id }); }}
          className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}>
          <svg className={`w-3 h-3 transition-transform duration-200 ${page.isExpanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
          </svg>
        </button>

        {/* Icon + pin badge */}
        <div className="relative flex-shrink-0">
          <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          {isPinned && <span className="absolute -top-1 -right-1 text-[8px]">📌</span>}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0 text-sm font-medium">
          <EditableTitle value={page.title} onSave={newTitle => dispatch({ type: 'RENAME_PAGE', pageId: page.id, title: newTitle, oldTitle: page.title })} locked={page.nameLocked}/>
        </div>

        {/* Actions */}
        {(hovered || showMenu) && (
          <div className="flex items-center gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
            {/* Pin/unpin */}
            <button onClick={() => dispatch({ type: isPinned ? 'UNPIN_PAGE' : 'PIN_PAGE', pageId: page.id })}
              className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'} ${isPinned ? 'text-amber-400' : 'text-slate-400'}`}
              title={isPinned ? 'Unpin' : 'Pin to top'}>
              <span className="text-[10px]">{isPinned ? '📌' : '📍'}</span>
            </button>

            {/* Lock */}
            <button onClick={() => dispatch({ type: 'SET_NAME_LOCK', target: 'page', pageId: page.id, locked: !page.nameLocked })}
              className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'} ${page.nameLocked ? 'text-amber-500' : 'text-slate-400'}`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={page.nameLocked ? "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" : "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"}/></svg>
            </button>

            {/* Move */}
            <button onClick={() => dispatch({ type: 'MOVE_PAGE', pageId: page.id, direction: 'up' })} className={`w-5 h-5 flex items-center justify-center rounded ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/></svg>
            </button>
            <button onClick={() => dispatch({ type: 'MOVE_PAGE', pageId: page.id, direction: 'down' })} className={`w-5 h-5 flex items-center justify-center rounded ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </button>

            {/* Add subpage */}
            <button onClick={() => dispatch({ type: 'ADD_SUBPAGE', pageId: page.id })} className={`w-5 h-5 flex items-center justify-center rounded ${isDark ? 'hover:bg-slate-600 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'}`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
            </button>

            {/* Delete menu */}
            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowMenu(!showMenu)} className={`w-5 h-5 flex items-center justify-center rounded ${isDark ? 'hover:bg-slate-600 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'}`}>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"/></svg>
              </button>
              {showMenu && (
                <div className={`absolute right-0 top-6 z-50 w-36 rounded-lg shadow-xl border py-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <button onClick={() => { dispatch({ type: 'DELETE_PAGE', pageId: page.id }); setShowMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${isDark ? 'text-red-400 hover:bg-slate-700' : 'text-red-500 hover:bg-red-50'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    Delete Page
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sub pages */}
      {page.isExpanded && page.subPages.length > 0 && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-dashed pl-2 border-opacity-40 border-slate-400">
          {page.subPages.map(sp => {
            const isSubActive = state.activePageId === page.id && state.activeSubPageId === sp.id;
            if (sp.isTracker) {
              return (
                <div key={sp.id} className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer ${isSubActive ? (isDark ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 border border-amber-200') : (isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100')}`}
                  onClick={() => dispatch({ type: 'SET_ACTIVE_PAGE', pageId: page.id, subPageId: sp.id })}>
                  <span className="text-xs">📋</span>
                  <span className="text-xs font-medium truncate">{sp.title}</span>
                </div>
              );
            }
            return (
              <RegularSubPageItem key={sp.id} subPage={sp} pageId={page.id} isActive={isSubActive} isDark={isDark}
                onSelect={() => dispatch({ type: 'SET_ACTIVE_PAGE', pageId: page.id, subPageId: sp.id })}
                onRename={newTitle => dispatch({ type: 'RENAME_SUBPAGE', pageId: page.id, subPageId: sp.id, title: newTitle, oldTitle: sp.title })}
                onDelete={() => dispatch({ type: 'DELETE_SUBPAGE', pageId: page.id, subPageId: sp.id })}
                onMoveUp={() => dispatch({ type: 'MOVE_SUBPAGE', pageId: page.id, subPageId: sp.id, direction: 'up' })}
                onMoveDown={() => dispatch({ type: 'MOVE_SUBPAGE', pageId: page.id, subPageId: sp.id, direction: 'down' })}
                onToggleLock={() => dispatch({ type: 'SET_NAME_LOCK', target: 'subpage', pageId: page.id, subPageId: sp.id, locked: !sp.nameLocked })}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function RegularSubPageItem({ subPage, pageId, isActive, isDark, onSelect, onRename, onDelete, onMoveUp, onMoveDown, onToggleLock }: any) {
  const [hovered, setHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); }
    if (showMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  return (
    <div className={`group relative flex items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer ${isActive ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800') : (isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800')}`}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onSelect}>
      <svg className="flex-shrink-0 w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
      <div className="flex-1 min-w-0 text-xs font-medium">
        <EditableTitle value={subPage.title} onSave={onRename} locked={subPage.nameLocked}/>
      </div>
      {(hovered || showMenu) && (
        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={onToggleLock} className={`w-5 h-5 flex items-center justify-center rounded ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'} ${subPage.nameLocked ? 'text-amber-500' : 'text-slate-400'}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={subPage.nameLocked ? "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" : "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"}/></svg>
          </button>
          <button onClick={onMoveUp} className={`w-5 h-5 flex items-center justify-center rounded ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/></svg>
          </button>
          <button onClick={onMoveDown} className={`w-5 h-5 flex items-center justify-center rounded ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(!showMenu)} className={`w-5 h-5 flex items-center justify-center rounded ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"/></svg>
            </button>
            {showMenu && (
              <div className={`absolute right-0 top-6 z-50 w-36 rounded-lg shadow-xl border py-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <button onClick={() => { onDelete(); setShowMenu(false); }} className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${isDark ? 'text-red-400 hover:bg-slate-700' : 'text-red-500 hover:bg-red-50'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { state, dispatch } = usePortal();
  const isDark = state.theme === 'dark';

  const pinnedPages = state.pages.filter(p => state.pinnedPages.includes(p.id));
  const unpinnedPages = state.pages.filter(p => !state.pinnedPages.includes(p.id));

  return (
    <aside className={`flex flex-col w-64 h-screen flex-shrink-0 border-r transition-colors duration-300 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className={`flex-1 min-w-0 font-bold text-lg tracking-tight flex items-center gap-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
          <EditableTitle value={state.sidebarTitle} onSave={title => dispatch({ type: 'SET_SIDEBAR_TITLE', title })} className="font-bold text-lg" placeholder="My Workspace" locked={state.sidebarTitleLocked}/>
          <button onClick={() => dispatch({ type: 'SET_NAME_LOCK', target: 'portal', locked: !state.sidebarTitleLocked })}
            className={`p-1 rounded ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} ${state.sidebarTitleLocked ? 'text-amber-500' : 'text-slate-400'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={state.sidebarTitleLocked ? "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" : "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"}/></svg>
          </button>
        </div>
      </div>

      {/* View nav buttons */}
      <div className={`flex items-center gap-1 px-2 py-2 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        {[
          { view: 'graph' as const, icon: '⬡', title: 'Graph View' },
          { view: 'calendar' as const, icon: '📅', title: 'Calendar View' },
          { view: 'dashboard' as const, icon: '📊', title: 'Dashboard' },
        ].map(({ view, icon, title }) => (
          <button key={view} onClick={() => dispatch({ type: 'SET_VIEW', view })}
            className={`flex-1 py-1 rounded-lg text-sm transition-colors ${state.currentView === view ? (isDark ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-700') : (isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-200')}`}
            title={title}>
            {icon}
          </button>
        ))}
      </div>

      {/* Pinned section */}
      {pinnedPages.length > 0 && (
        <div className="px-2 pt-2">
          <div className={`text-xs font-semibold uppercase tracking-widest px-2 mb-1 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>📌 Pinned</div>
          <div className="space-y-0.5 pb-2">
            {pinnedPages.map(page => <PageItem key={page.id} page={page}/>)}
          </div>
          <div className={`h-px mx-2 mb-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}/>
        </div>
      )}

      {/* Pages Label + Add */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Pages</span>
        <button onClick={() => dispatch({ type: 'ADD_PAGE' })}
          className={`w-6 h-6 flex items-center justify-center rounded-md ${isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-500 hover:bg-slate-200'}`} title="Add new page">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
        </button>
      </div>

      {/* Pages List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {state.pages.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-10 gap-3 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <p className="text-xs text-center px-4">Click <strong>+</strong> to create your first page</p>
          </div>
        ) : (
          unpinnedPages.map(page => <PageItem key={page.id} page={page}/>)
        )}
      </div>

      {/* Footer */}
      <div className={`px-4 py-3 border-t text-xs ${isDark ? 'border-slate-700 text-slate-600' : 'border-slate-200 text-slate-400'}`}>Portal App · {state.pages.length} pages</div>
    </aside>
  );
}
