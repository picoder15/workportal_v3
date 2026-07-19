import { useState, useRef } from 'react';
import { usePortal } from '../context/PortalContext';

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '');

function highlight(text: string, query: string): string {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="search-highlight">$1</mark>');
}

function getContextSnippet(html: string, query: string, maxLen = 120): string {
  const text = stripHtml(html);
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, maxLen);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 80);
  const snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  return snippet;
}

export default function SearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, dispatch } = usePortal();
  const [query, setQuery] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const [aiResults, setAiResults] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const isDark = state.theme === 'dark';
  const abortRef = useRef<AbortController | null>(null);

  if (!isOpen) return null;

  const results = (() => {
    if (!query.trim() || aiMode) return [];
    const term = query.toLowerCase();
    const res: any[] = [];
    for (const page of state.pages) {
      const titleMatch = page.title.toLowerCase().includes(term);
      const contentMatch = stripHtml(page.content).toLowerCase().includes(term);
      if (titleMatch || contentMatch) res.push({ page, subPage: null, matchType: titleMatch ? 'title' : 'content', snippet: getContextSnippet(page.content, query) });
      for (const sp of page.subPages) {
        if (sp.isTracker) continue;
        const spTitle = sp.title.toLowerCase().includes(term);
        const spContent = stripHtml(sp.content).toLowerCase().includes(term);
        if (spTitle || spContent) res.push({ page, subPage: sp, matchType: spTitle ? 'title' : 'content', snippet: getContextSnippet(sp.content, query) });
      }
    }
    return res.slice(0, 15);
  })();

  const navigateTo = (pageId: string, subPageId?: string | null) => {
    dispatch({ type: 'SET_ACTIVE_PAGE', pageId, subPageId: subPageId ?? null });
    onClose();
    setQuery('');
    setAiResults('');
  };

  const runAISearch = async () => {
    if (!query.trim()) return;
    setAiLoading(true);
    setAiResults('');
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Build context from all pages
    const context = state.pages.map(p => {
      const subContent = p.subPages.filter(sp => !sp.isTracker).map(sp => `  SubPage: ${sp.title}\n  ${stripHtml(sp.content).slice(0, 300)}`).join('\n');
      return `Page: ${p.title}\nContent: ${stripHtml(p.content).slice(0, 400)}\n${subContent}`;
    }).join('\n\n---\n\n');

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are a search assistant for a personal notes app. Search through these pages and answer the user's query.\n\nPages:\n${context}\n\nUser query: "${query}"\n\nProvide a helpful answer based on the content, cite which page/subpage is relevant, and suggest what to look at. Be concise and specific. If nothing matches, say so.`,
          }],
        }),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      const text = data.content?.map((c: any) => c.text || '').join('') || 'No response from AI.';
      setAiResults(text);
    } catch (err: any) {
      if (err.name !== 'AbortError') setAiResults('AI search failed. Check your connection and try again.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { onClose(); setQuery(''); setAiResults(''); }}/>
      <div className={`relative w-full max-w-2xl mx-4 rounded-xl shadow-2xl flex flex-col overflow-hidden ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`} style={{ maxHeight: '70vh' }}>
        {/* Search bar */}
        <div className={`flex items-center gap-2 p-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <svg className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" autoFocus placeholder="Search pages, content…" value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { onClose(); setQuery(''); setAiResults(''); } if (e.key === 'Enter' && aiMode) runAISearch(); }}
            className={`flex-1 outline-none text-sm bg-transparent ${isDark ? 'text-white placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'}`}/>

          {/* AI toggle */}
          <button onClick={() => setAiMode(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${aiMode ? (isDark ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-700') : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')}`}
            title="Toggle AI-powered search">
            ✨ AI
          </button>

          {aiMode && (
            <button onClick={runAISearch} disabled={aiLoading || !query.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
              {aiLoading ? '...' : 'Ask'}
            </button>
          )}
        </div>

        {/* Mode hint */}
        {aiMode && (
          <div className={`px-4 py-2 text-xs border-b ${isDark ? 'border-slate-700 text-slate-500 bg-indigo-900/20' : 'border-slate-100 text-slate-400 bg-indigo-50'}`}>
            ✨ AI mode: Type a question and click Ask, or press Enter
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {/* AI results */}
          {aiMode && (
            <div className="p-4">
              {aiLoading && (
                <div className="flex items-center gap-2 py-6 justify-center">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
                  <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Searching with AI…</span>
                </div>
              )}
              {aiResults && (
                <div className={`p-4 rounded-xl border text-sm whitespace-pre-wrap ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-indigo-50 border-indigo-100 text-slate-700'}`}>
                  <div className={`text-xs font-semibold mb-2 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>✨ AI Answer</div>
                  {aiResults}
                </div>
              )}
              {!aiLoading && !aiResults && query && (
                <div className={`text-center py-8 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Press Ask or Enter to search with AI</div>
              )}
            </div>
          )}

          {/* Regular results */}
          {!aiMode && (
            <div className="p-3 space-y-1">
              {results.length === 0 && query && (
                <div className={`text-center py-8 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No results for "{query}"</div>
              )}
              {!query && (
                <div className={`text-center py-8 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Start typing to search…</div>
              )}
              {results.map((res, idx) => (
                <div key={idx} onClick={() => navigateTo(res.page.id, res.subPage?.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all hover:shadow-sm ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50 border border-slate-100'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                      dangerouslySetInnerHTML={{ __html: highlight(res.page.title, query) }}/>
                    {res.subPage && (
                      <>
                        <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>/</span>
                        <span className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
                          dangerouslySetInnerHTML={{ __html: highlight(res.subPage.title, query) }}/>
                      </>
                    )}
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${res.matchType === 'title' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {res.matchType === 'title' ? 'Title' : 'Content'}
                    </span>
                  </div>
                  {res.matchType === 'content' && res.snippet && (
                    <div className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                      dangerouslySetInnerHTML={{ __html: highlight(res.snippet, query) }}/>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-4 py-2 border-t flex items-center justify-between text-xs ${isDark ? 'border-slate-700 text-slate-600' : 'border-slate-100 text-slate-400'}`}>
          <span>↑↓ navigate · Enter select · Esc close</span>
          <span>{results.length > 0 && !aiMode ? `${results.length} results` : ''}</span>
        </div>
      </div>
    </div>
  );
}
