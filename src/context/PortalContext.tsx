import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { Page, SubPage, Theme, PortalState, Activity, VersionSnapshot, DEFAULT_SHORTCUTS } from '../types';
import { fetchWorkspaceState, saveWorkspaceState, fetchStateTimestamp } from '../api/client';

// ─────────────────────────────────────────────────────────────────────────────
// Action Types
// ─────────────────────────────────────────────────────────────────────────────
type Action =
  | { type: 'ADD_PAGE' }
  | { type: 'ADD_SUBPAGE'; pageId: string }
  | { type: 'DELETE_PAGE'; pageId: string }
  | { type: 'DELETE_SUBPAGE'; pageId: string; subPageId: string }
  | { type: 'RENAME_PAGE'; pageId: string; title: string; oldTitle: string }
  | { type: 'RENAME_SUBPAGE'; pageId: string; subPageId: string; title: string; oldTitle: string }
  | { type: 'SAVE_PAGE_CONTENT'; pageId: string; content: string }
  | { type: 'SAVE_SUBPAGE_CONTENT'; pageId: string; subPageId: string; content: string }
  | { type: 'SET_ACTIVE_PAGE'; pageId: string | null; subPageId?: string | null }
  | { type: 'TOGGLE_PAGE_EXPAND'; pageId: string }
  | { type: 'SET_SIDEBAR_TITLE'; title: string }
  | { type: 'SET_THEME'; theme: Theme }
  | { type: 'LOAD_STATE'; state: PortalState }
  | { type: 'LOG_ACTIVITY'; pageId: string; activity: Activity }
  | { type: 'SET_VIEW'; view: 'editor' | 'dashboard' | 'graph' | 'calendar' }
  | { type: 'MOVE_PAGE'; pageId: string; direction: 'up' | 'down' }
  | { type: 'MOVE_SUBPAGE'; pageId: string; subPageId: string; direction: 'up' | 'down' }
  | { type: 'SET_NAME_LOCK'; target: 'page' | 'subpage' | 'portal'; pageId?: string; subPageId?: string; locked: boolean }
  | { type: 'SET_CONTENT_LOCK'; target: 'page' | 'subpage'; pageId: string; subPageId?: string; locked: boolean }
  | { type: 'ADD_TAG'; target: 'page' | 'subpage'; pageId: string; subPageId?: string; tag: string }
  | { type: 'REMOVE_TAG'; target: 'page' | 'subpage'; pageId: string; subPageId?: string; tag: string }
  | { type: 'ADD_RECENT_PAGE'; pageId: string; subPageId?: string | null }
  | { type: 'SAVE_VERSION'; pageId: string; subPageId?: string; label?: string }
  | { type: 'RESTORE_VERSION'; pageId: string; subPageId?: string; versionId: string }
  | { type: 'PIN_PAGE'; pageId: string }
  | { type: 'UNPIN_PAGE'; pageId: string }
  | { type: 'UPDATE_SHORTCUT'; id: string; keys?: string; enabled?: boolean };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function makeActivity(type: Activity['type'], description: string, details?: string): Activity {
  return { id: generateId(), type, description, timestamp: new Date(), details };
}

function getTrackerContent(activities: Activity[], pageTitle: string): string {
  if (activities.length === 0) return '<p>No activity recorded yet.</p>';
  const lines = activities.map((a) => {
    const time = new Date(a.timestamp).toLocaleString();
    const emoji = a.type === 'create' ? '✅' : a.type === 'rename' ? '✏️' : a.type === 'content_change' ? '📝' : a.type === 'add_subpage' ? '➕' : a.type === 'delete_subpage' ? '🗑️' : '❌';
    return `<tr><td style="padding:6px 12px;white-space:nowrap;color:#94a3b8;font-size:12px">${time}</td><td style="padding:6px 12px;font-size:13px">${emoji} ${a.description}</td></tr>`;
  }).join('');
  return `<div style="font-family:system-ui,sans-serif"><h2 style="font-size:18px;font-weight:600;margin-bottom:16px">📋 Activity Timeline — ${pageTitle}</h2><table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:2px solid #e2e8f0"><th style="text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;color:#94a3b8;font-weight:600">Time</th><th style="text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;color:#94a3b8;font-weight:600">Event</th><tr></thead><tbody>${lines}</tbody></table><p style="font-size:11px;color:#94a3b8;margin-top:16px">End of timeline — ${activities.length} event${activities.length !== 1 ? 's' : ''}</p></div>`;
}

const MAX_VERSIONS = 20;

function saveVersionToPage(pages: Page[], pageId: string, subPageId: string | undefined, label?: string): Page[] {
  return pages.map(p => {
    if (p.id !== pageId) return p;
    if (subPageId) {
      return {
        ...p,
        subPages: p.subPages.map(sp => {
          if (sp.id !== subPageId) return sp;
          const newVersion: VersionSnapshot = { id: generateId(), content: sp.content, timestamp: new Date(), label };
          const versions = [...(sp.versions || []), newVersion].slice(-MAX_VERSIONS);
          return { ...sp, versions };
        }),
      };
    }
    const newVersion: VersionSnapshot = { id: generateId(), content: p.content, timestamp: new Date(), label };
    const versions = [...(p.versions || []), newVersion].slice(-MAX_VERSIONS);
    return { ...p, versions };
  });
}

function logActivityToPage(state: PortalState, pageId: string, activity: Activity): Page[] {
  return state.pages.map(p =>
    p.id === pageId ? { ...p, activities: [...p.activities, activity], updatedAt: new Date() } : p
  );
}

const defaultPage = (pageTitle?: string): Page => ({
  id: generateId(),
  title: pageTitle || 'New Page',
  content: '',
  subPages: [],
  activities: [],
  isExpanded: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  versions: [],
  isPinned: false,
});

const defaultSubPage = (title?: string, isTracker?: boolean): SubPage => ({
  id: generateId(),
  title: title || 'New Sub Page',
  content: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  isTracker: isTracker || false,
  versions: [],
  isPinned: false,
});

const initialState: PortalState = {
  pages: [],
  sidebarTitle: 'My Workspace',
  sidebarTitleLocked: false,
  activePageId: null,
  activeSubPageId: null,
  theme: 'light',
  currentView: 'editor',
  recentPages: [],
  shortcuts: DEFAULT_SHORTCUTS,
  pinnedPages: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────────────────────
function reducer(state: PortalState, action: Action): PortalState {
  switch (action.type) {
    case 'ADD_PAGE': {
      const pageCount = state.pages.length + 1;
      const newPage = defaultPage(`Page ${pageCount}`);
      const trackerSubPage = defaultSubPage(`tracker ${newPage.title}`, true);
      const createActivity = makeActivity('create', `Page "${newPage.title}" created`, JSON.stringify({ title: newPage.title }));
      const pageWithTracker: Page = { ...newPage, subPages: [trackerSubPage], activities: [createActivity], isExpanded: true };
      return { ...state, pages: [...state.pages, pageWithTracker], activePageId: newPage.id, activeSubPageId: null };
    }

    case 'ADD_SUBPAGE': {
      const subCount = state.pages.find(p => p.id === action.pageId)?.subPages.filter(sp => !sp.isTracker).length ?? 0;
      const newSubPage = defaultSubPage(`Sub Page ${subCount + 1}`, false);
      const activity = makeActivity('add_subpage', `Sub page "${newSubPage.title}" added`, JSON.stringify({ subPageTitle: newSubPage.title }));
      return {
        ...state,
        pages: state.pages.map(p =>
          p.id === action.pageId
            ? { ...p, subPages: [...p.subPages, newSubPage], activities: [...p.activities, activity], isExpanded: true, updatedAt: new Date() }
            : p
        ),
        activePageId: action.pageId,
        activeSubPageId: newSubPage.id,
      };
    }

    case 'DELETE_PAGE': {
      const newPages = state.pages.filter(p => p.id !== action.pageId);
      const wasActive = state.activePageId === action.pageId;
      return {
        ...state,
        pages: newPages,
        activePageId: wasActive ? (newPages[0]?.id ?? null) : state.activePageId,
        activeSubPageId: wasActive ? null : state.activeSubPageId,
        pinnedPages: state.pinnedPages.filter(id => id !== action.pageId),
      };
    }

    case 'DELETE_SUBPAGE': {
      const page = state.pages.find(p => p.id === action.pageId);
      if (!page) return state;
      const subPage = page.subPages.find(sp => sp.id === action.subPageId);
      if (!subPage || subPage.isTracker) return state;
      const activity = makeActivity('delete_subpage', `Sub page "${subPage.title}" deleted`, JSON.stringify({ subPageTitle: subPage.title }));
      const updatedPages = state.pages.map(p =>
        p.id === action.pageId
          ? { ...p, subPages: p.subPages.filter(sp => sp.id !== action.subPageId), activities: [...p.activities, activity], updatedAt: new Date() }
          : p
      );
      const updatedPage = updatedPages.find(p => p.id === action.pageId);
      if (updatedPage) {
        const tracker = updatedPage.subPages.find(sp => sp.isTracker);
        if (tracker) tracker.content = getTrackerContent(updatedPage.activities, updatedPage.title);
      }
      return { ...state, pages: updatedPages, activeSubPageId: state.activeSubPageId === action.subPageId ? null : state.activeSubPageId };
    }

    case 'RENAME_PAGE': {
      const activity = makeActivity('rename', `Page renamed from "${action.oldTitle}" to "${action.title}"`, JSON.stringify({ oldTitle: action.oldTitle, newTitle: action.title }));
      const updatedPages = state.pages.map(p =>
        p.id === action.pageId ? { ...p, title: action.title, activities: [...p.activities, activity], updatedAt: new Date() } : p
      );
      const updatedPage = updatedPages.find(p => p.id === action.pageId);
      if (updatedPage) {
        const tracker = updatedPage.subPages.find(sp => sp.isTracker);
        if (tracker) {
          tracker.title = `tracker ${action.title}`;
          tracker.content = getTrackerContent(updatedPage.activities, action.title);
        }
      }
      return { ...state, pages: updatedPages };
    }

    case 'RENAME_SUBPAGE': {
      const activity = makeActivity('rename', `Sub page renamed from "${action.oldTitle}" to "${action.title}"`, JSON.stringify({ oldTitle: action.oldTitle, newTitle: action.title }));
      return {
        ...state,
        pages: state.pages.map(p =>
          p.id === action.pageId
            ? {
                ...p,
                activities: [...p.activities, activity],
                subPages: p.subPages.map(sp => sp.id === action.subPageId ? { ...sp, title: action.title, updatedAt: new Date() } : sp),
                updatedAt: new Date(),
              }
            : p
        ),
      };
    }

    case 'SAVE_PAGE_CONTENT': {
      const page = state.pages.find(p => p.id === action.pageId);
      if (!page || page.content === action.content) return state;
      const activity = makeActivity('content_change', `Content updated`, JSON.stringify({ type: 'content_change', oldContent: page.content, newContent: action.content }));
      return {
        ...state,
        pages: state.pages.map(p =>
          p.id === action.pageId ? { ...p, content: action.content, activities: [...p.activities, activity], updatedAt: new Date() } : p
        ),
      };
    }

    case 'SAVE_SUBPAGE_CONTENT': {
      const page = state.pages.find(p => p.id === action.pageId);
      const subPage = page?.subPages.find(sp => sp.id === action.subPageId);
      if (!page || !subPage || subPage.content === action.content) return state;
      const activity = makeActivity('content_change', `Sub page "${subPage.title}" content updated`, JSON.stringify({ type: 'content_change', oldContent: subPage.content, newContent: action.content }));
      return {
        ...state,
        pages: state.pages.map(p =>
          p.id === action.pageId
            ? {
                ...p,
                activities: [...p.activities, activity],
                subPages: p.subPages.map(sp => sp.id === action.subPageId ? { ...sp, content: action.content, updatedAt: new Date() } : sp),
                updatedAt: new Date(),
              }
            : p
        ),
      };
    }

    case 'SET_ACTIVE_PAGE': {
      const key = action.subPageId ? `${action.pageId}:${action.subPageId}` : action.pageId ?? '';
      const newRecents = key ? [key, ...state.recentPages.filter(k => k !== key)].slice(0, 5) : state.recentPages;
      return { ...state, activePageId: action.pageId, activeSubPageId: action.subPageId ?? null, recentPages: newRecents, currentView: 'editor' };
    }

    case 'TOGGLE_PAGE_EXPAND':
      return { ...state, pages: state.pages.map(p => p.id === action.pageId ? { ...p, isExpanded: !p.isExpanded } : p) };

    case 'SET_SIDEBAR_TITLE':
      return { ...state, sidebarTitle: action.title };

    case 'SET_THEME':
      return { ...state, theme: action.theme };

    case 'LOG_ACTIVITY':
      return { ...state, pages: logActivityToPage(state, action.pageId, action.activity) };

    case 'SET_VIEW':
      return { ...state, currentView: action.view };

    case 'LOAD_STATE':
      return {
        ...action.state,
        currentView: action.state.currentView ?? 'editor',
        shortcuts: action.state.shortcuts ?? DEFAULT_SHORTCUTS,
        pinnedPages: action.state.pinnedPages ?? [],
      };

    case 'MOVE_PAGE': {
      const { pageId, direction } = action;
      const index = state.pages.findIndex(p => p.id === pageId);
      if (index === -1) return state;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= state.pages.length) return state;
      const newPages = [...state.pages];
      [newPages[index], newPages[newIndex]] = [newPages[newIndex], newPages[index]];
      return { ...state, pages: newPages };
    }

    case 'MOVE_SUBPAGE': {
      const { pageId, subPageId, direction } = action;
      const page = state.pages.find(p => p.id === pageId);
      if (!page) return state;
      const index = page.subPages.findIndex(sp => sp.id === subPageId);
      if (index === -1) return state;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= page.subPages.length) return state;
      const newSubPages = [...page.subPages];
      [newSubPages[index], newSubPages[newIndex]] = [newSubPages[newIndex], newSubPages[index]];
      return { ...state, pages: state.pages.map(p => p.id === pageId ? { ...p, subPages: newSubPages } : p) };
    }

    case 'SET_NAME_LOCK': {
      const { target, pageId, subPageId, locked } = action;
      if (target === 'portal') return { ...state, sidebarTitleLocked: locked };
      if (target === 'page' && pageId) return { ...state, pages: state.pages.map(p => p.id === pageId ? { ...p, nameLocked: locked } : p) };
      if (target === 'subpage' && pageId && subPageId) {
        return { ...state, pages: state.pages.map(p => p.id === pageId ? { ...p, subPages: p.subPages.map(sp => sp.id === subPageId ? { ...sp, nameLocked: locked } : sp) } : p) };
      }
      return state;
    }

    case 'SET_CONTENT_LOCK': {
      const { target, pageId, subPageId, locked } = action;
      if (target === 'page') return { ...state, pages: state.pages.map(p => p.id === pageId ? { ...p, contentLocked: locked } : p) };
      if (target === 'subpage' && subPageId) {
        return { ...state, pages: state.pages.map(p => p.id === pageId ? { ...p, subPages: p.subPages.map(sp => sp.id === subPageId ? { ...sp, contentLocked: locked } : sp) } : p) };
      }
      return state;
    }

    case 'ADD_TAG': {
      const { target, pageId, subPageId, tag } = action;
      if (target === 'page') return { ...state, pages: state.pages.map(p => p.id === pageId ? { ...p, tags: [...(p.tags || []), tag] } : p) };
      if (target === 'subpage' && subPageId) {
        return { ...state, pages: state.pages.map(p => p.id === pageId ? { ...p, subPages: p.subPages.map(sp => sp.id === subPageId ? { ...sp, tags: [...(sp.tags || []), tag] } : sp) } : p) };
      }
      return state;
    }

    case 'REMOVE_TAG': {
      const { target, pageId, subPageId, tag } = action;
      if (target === 'page') return { ...state, pages: state.pages.map(p => p.id === pageId ? { ...p, tags: (p.tags || []).filter(t => t !== tag) } : p) };
      if (target === 'subpage' && subPageId) {
        return { ...state, pages: state.pages.map(p => p.id === pageId ? { ...p, subPages: p.subPages.map(sp => sp.id === subPageId ? { ...sp, tags: (sp.tags || []).filter(t => t !== tag) } : sp) } : p) };
      }
      return state;
    }

    case 'ADD_RECENT_PAGE': {
      const key = action.subPageId ? `${action.pageId}:${action.subPageId}` : action.pageId;
      const newRecents = [key, ...state.recentPages.filter(k => k !== key)].slice(0, 5);
      return { ...state, recentPages: newRecents };
    }

    case 'SAVE_VERSION': {
      return { ...state, pages: saveVersionToPage(state.pages, action.pageId, action.subPageId, action.label) };
    }

    case 'RESTORE_VERSION': {
      return {
        ...state,
        pages: state.pages.map(p => {
          if (p.id !== action.pageId) return p;
          if (action.subPageId) {
            return {
              ...p,
              subPages: p.subPages.map(sp => {
                if (sp.id !== action.subPageId) return sp;
                const version = sp.versions?.find(v => v.id === action.versionId);
                if (!version) return sp;
                return { ...sp, content: version.content, updatedAt: new Date() };
              }),
            };
          }
          const version = p.versions?.find(v => v.id === action.versionId);
          if (!version) return p;
          return { ...p, content: version.content, updatedAt: new Date() };
        }),
      };
    }

    case 'PIN_PAGE': {
      if (state.pinnedPages.includes(action.pageId)) return state;
      return { ...state, pinnedPages: [...state.pinnedPages, action.pageId] };
    }

    case 'UNPIN_PAGE': {
      return { ...state, pinnedPages: state.pinnedPages.filter(id => id !== action.pageId) };
    }

    case 'UPDATE_SHORTCUT': {
      return {
        ...state,
        shortcuts: state.shortcuts.map(s =>
          s.id === action.id
            ? { ...s, ...(action.keys !== undefined ? { keys: action.keys } : {}), ...(action.enabled !== undefined ? { enabled: action.enabled } : {}) }
            : s
        ),
      };
    }

    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Deserialize dates from API (JSON does not preserve Date objects)
// ─────────────────────────────────────────────────────────────────────────────
function deserializeState(remoteState: PortalState): PortalState {
  const parsed = { ...remoteState };
  parsed.pages = parsed.pages.map(p => ({
    ...p,
    createdAt: new Date(p.createdAt),
    updatedAt: new Date(p.updatedAt),
    versions: (p.versions || []).map(v => ({ ...v, timestamp: new Date(v.timestamp) })),
    activities: (p.activities || []).map(a => ({ ...a, timestamp: new Date(a.timestamp) })),
    subPages: p.subPages.map(sp => ({
      ...sp,
      createdAt: new Date(sp.createdAt),
      updatedAt: new Date(sp.updatedAt),
      versions: (sp.versions || []).map(v => ({ ...v, timestamp: new Date(v.timestamp) })),
    })),
  }));
  parsed.shortcuts = parsed.shortcuts ?? DEFAULT_SHORTCUTS;
  parsed.pinnedPages = parsed.pinnedPages ?? [];
  return parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Portal Provider
// ─────────────────────────────────────────────────────────────────────────────
interface PortalContextType {
  state: PortalState;
  dispatch: React.Dispatch<Action>;
}

const PortalContext = createContext<PortalContextType | null>(null);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const isSyncingRef = useRef(false);
  const lastSavedRef = useRef<PortalState | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Load initial state from backend
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const remoteState = await fetchWorkspaceState();
        const parsed = deserializeState(remoteState);
        dispatch({ type: 'LOAD_STATE', state: parsed });
        lastSavedRef.current = parsed;
      } catch (err) {
        console.error('Failed to load from server, using fallback state:', err);
      }
    };
    loadInitial();
  }, []);

  // 2. Save to backend after each state change (debounced)
  useEffect(() => {
    if (isSyncingRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const currentState = state;
      // Avoid unnecessary save if unchanged
      if (lastSavedRef.current && JSON.stringify(lastSavedRef.current) === JSON.stringify(currentState)) return;
      try {
        await saveWorkspaceState(currentState);
        lastSavedRef.current = currentState;
      } catch (err) {
        console.error('Failed to save state to server:', err);
      }
    }, 800);
  }, [state]);

  // 3. Poll for remote updates (every 3 seconds)
  useEffect(() => {
    let lastKnownTimestamp = 0;
    const poll = async () => {
      try {
        const { updatedAt } = await fetchStateTimestamp();
        if (updatedAt > lastKnownTimestamp) {
          // Remote state changed – fetch full state
          const remoteState = await fetchWorkspaceState();
          const parsed = deserializeState(remoteState);
          // Only update if different from current state
          if (JSON.stringify(parsed) !== JSON.stringify(state)) {
            isSyncingRef.current = true;
            dispatch({ type: 'LOAD_STATE', state: parsed });
            // Small delay to avoid race conditions
            setTimeout(() => {
              isSyncingRef.current = false;
            }, 100);
          }
          lastKnownTimestamp = updatedAt;
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };
    pollIntervalRef.current = setInterval(poll, 3000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [state]);

  // Cleanup save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  return (
    <PortalContext.Provider value={{ state, dispatch }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal(): PortalContextType {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used within PortalProvider');
  return ctx;
}