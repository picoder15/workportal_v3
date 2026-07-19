import { useState } from 'react';
import { usePortal } from '../context/PortalContext';
import { Page, SubPage } from '../types';
import DiffModal from './DiffModal';
import { PageIcon, SubPageIcon, ActivityIcon, PinIcon, DashboardIcon, GraphIcon, CalendarIcon, SettingsIcon, TrashIcon, EditIcon, DotsIcon, LockIcon, UnlockIcon, DownloadIcon, UploadIcon, LinkIcon } from './Icons';

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '');

function highlight(text: string, term: string) {
  if (!term.trim()) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="search-highlight">$1</mark>');
}

export default function Dashboard() {
  const { state, dispatch } = usePortal();
  const isDark = state.theme === 'dark';
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pages' | 'global' | 'backlinks'>('pages');
  const [selectedActivity, setSelectedActivity] = useState<any>(null);

  // Search logic
  const searchResults = (() => {
    if (!searchTerm.trim()) return null;
    const term = searchTerm.toLowerCase();
    const results: { page: Page; subPage?: SubPage; matchType: 'title' | 'content'; snippet: string }[] = [];
    for (const page of state.pages) {
      if (page.title.toLowerCase().includes(term)) results.push({ page, matchType: 'title', snippet: '' });
      else if (stripHtml(page.content).toLowerCase().includes(term)) {
        const text = stripHtml(page.content);
        const idx = text.toLowerCase().indexOf(term);
        const snippet = text.slice(Math.max(0, idx - 40), idx + term.length + 80);
        results.push({ page, matchType: 'content', snippet });
      }
      for (const sp of page.subPages) {
        if (sp.isTracker) continue;
        if (sp.title.toLowerCase().includes(term)) results.push({ page, subPage: sp, matchType: 'title', snippet: '' });
        else if (stripHtml(sp.content).toLowerCase().includes(term)) {
          const text = stripHtml(sp.content);
          const idx = text.toLowerCase().indexOf(term);
          const snippet = text.slice(Math.max(0, idx - 40), idx + term.length + 80);
          results.push({ page, subPage: sp, matchType: 'content', snippet });
        }
      }
    }
    return results;
  })();

  const navigateTo = (pageId: string, subPageId?: string | null) => {
    dispatch({ type: 'SET_ACTIVE_PAGE', pageId, subPageId: subPageId ?? null });
    dispatch({ type: 'SET_VIEW', view: 'editor' });
  };

  // Global activity
  const allActivities = state.pages.flatMap(page =>
    page.activities.map(a => ({ ...a, pageTitle: page.title, pageId: page.id }))
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const activityLabels: Record<string, string> = {
    create: 'Created', rename: 'Renamed', content_change: 'Content Updated',
    add_subpage: 'Sub Page Added', delete_subpage: 'Sub Page Deleted', delete: 'Deleted',
  };

  const formatTime = (date: Date) => {
    const d = new Date(date), now = new Date();
    const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
    const hrs = Math.floor(mins / 60), days = Math.floor(hrs / 24);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  // Backlinks map: pageId → pages that link to it
  const backlinkMap = new Map<string, { fromPage: Page; fromSubPage?: SubPage }[]>();
  state.pages.forEach(page => {
    const extract = (html: string) => (html.match(/data-pid="([^"]+)"/g) || []).map(m => m.replace(/data-pid="([^"]+)"/, '$1'));
    extract(page.content).forEach(tid => {
      if (!backlinkMap.has(tid)) backlinkMap.set(tid, []);
      backlinkMap.get(tid)!.push({ fromPage: page });
    });
    page.subPages.forEach(sp => {
      extract(sp.content).forEach(tid => {
        if (!backlinkMap.has(tid)) backlinkMap.set(tid, []);
        backlinkMap.get(tid)!.push({ fromPage: page, fromSubPage: sp });
      });
    });
  });

  const TABS = [
    { key: 'pages', label: 'Pages & Search' },
    { key: 'global', label: 'Global Activity' },
    { key: 'backlinks', label: 'Backlinks' },
  ] as const;

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Dashboard</h1>
        <button onClick={() => dispatch({ type: 'SET_VIEW', view: 'editor' })}
          className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>
          ← Back to Editor
        </button>
      </div>

      {/* Stats bar */}
      <div className={`grid grid-cols-4 gap-px border-b ${isDark ? 'border-slate-700 bg-slate-700' : 'border-slate-200 bg-slate-200'}`}>
        {[
          { label: 'Pages', value: state.pages.length, icon: '📄' },
          { label: 'Sub Pages', value: state.pages.reduce((a, p) => a + p.subPages.filter(sp => !sp.isTracker).length, 0), icon: '📑' },
          { label: 'Activities', value: allActivities.length, icon: '⚡' },
          { label: 'Pinned', value: state.pinnedPages.length, icon: '📌' },
        ].map(({ label, value, icon }) => (
          <div key={label} className={`flex items-center gap-3 px-5 py-3 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            <span className="text-xl">{icon}</span>
            <div>
              <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{value}</div>
              <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className={`flex border-b px-6 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              activeTab === key
                ? isDark ? 'text-indigo-400 border-indigo-400' : 'text-indigo-600 border-indigo-600'
                : `border-transparent ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'}`
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Pages & Search Tab */}
      {activeTab === 'pages' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-5 relative">
            <input type="text" placeholder="Search pages, subpages, content…"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2.5 pl-10 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200'}`}/>
            <svg className="absolute left-3 top-3 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>

          {searchTerm ? (
            searchResults && searchResults.length > 0 ? (
              <div className="space-y-2">
                <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{searchResults.length} result{searchResults.length !== 1 && 's'}</p>
                {searchResults.map((res, idx) => (
                  <div key={idx} onClick={() => navigateTo(res.page.id, res.subPage?.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm" dangerouslySetInnerHTML={{ __html: highlight(res.page.title, searchTerm) }}/>
                      {res.subPage && <><span className="text-slate-400">/</span><span className="text-sm" dangerouslySetInnerHTML={{ __html: highlight(res.subPage.title, searchTerm) }}/></>}
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${res.matchType === 'title' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{res.matchType === 'title' ? 'Title' : 'Content'}</span>
                    </div>
                    {res.snippet && <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`} dangerouslySetInnerHTML={{ __html: highlight(res.snippet, searchTerm) }}/>}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-12 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No results for "{searchTerm}"</div>
            )
          ) : (
            <div className="space-y-3">
              {state.pages.map(page => (
                <div key={page.id} className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div onClick={() => navigateTo(page.id)}
                    className={`px-4 py-3 font-semibold cursor-pointer flex items-center gap-2 ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'}`}>
                    {state.pinnedPages.includes(page.id) && <span className="text-amber-500">📌</span>}
                    <span>📄 {page.title}</span>
                    <span className={`ml-auto text-xs font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{page.subPages.filter(sp => !sp.isTracker).length} sub</span>
                  </div>
                  {page.subPages.filter(sp => !sp.isTracker).length > 0 && (
                    <div className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
                      {page.subPages.filter(sp => !sp.isTracker).map(sp => (
                        <div key={sp.id} onClick={() => navigateTo(page.id, sp.id)}
                          className={`px-4 py-2 pl-8 text-sm cursor-pointer ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                          📄 {sp.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Global Activity Tab */}
      {activeTab === 'global' && (
        <div className="flex-1 overflow-y-auto p-6">
          {allActivities.length === 0 ? (
            <div className={`text-center py-12 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No global activities yet.</div>
          ) : (
            <div className="space-y-2">
              {allActivities.map(activity => (
                <div key={activity.id} onClick={() => setSelectedActivity(activity)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{activity.description}</p>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {formatTime(activity.timestamp)} · in <span className="font-medium">{activity.pageTitle}</span>
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                      {activityLabels[activity.type] || activity.type}
                    </span>
                  </div>
                  {activity.details && <div className={`mt-1 text-xs underline ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Click to view details</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Backlinks Tab */}
      {activeTab === 'backlinks' && (
        <div className="flex-1 overflow-y-auto p-6">
          <p className={`text-xs mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Pages that have internal links pointing to other pages</p>
          {state.pages.length === 0 ? (
            <div className={`text-center py-12 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No pages yet.</div>
          ) : (
            <div className="space-y-3">
              {state.pages.map(page => {
                const links = backlinkMap.get(page.id) || [];
                if (links.length === 0) return null;
                return (
                  <div key={page.id} className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <div className={`px-4 py-3 font-semibold flex items-center gap-2 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                      <span>📄 {page.title}</span>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700`}>{links.length} backlink{links.length !== 1 && 's'}</span>
                    </div>
                    <div className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
                      {links.map((bl, i) => (
                        <div key={i} onClick={() => navigateTo(bl.fromPage.id, bl.fromSubPage?.id)}
                          className={`px-4 py-2 pl-8 text-sm cursor-pointer flex items-center gap-2 ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-50 text-slate-600'}`}>
                          <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                          {bl.fromSubPage ? `${bl.fromPage.title} / ${bl.fromSubPage.title}` : bl.fromPage.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }).filter(Boolean)}
              {[...backlinkMap.values()].every(v => v.length === 0) && (
                <div className={`text-center py-12 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No internal links found. Use the 🔗 button in the editor to create links.</div>
              )}
            </div>
          )}
        </div>
      )}

      <DiffModal
        isOpen={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
        title={selectedActivity?.type === 'content_change' ? 'Content Change Details' : 'Activity Details'}
        details={selectedActivity?.details || null}
      />
    </div>
  );
}
