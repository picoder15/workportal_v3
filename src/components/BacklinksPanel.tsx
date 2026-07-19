import { usePortal } from '../context/PortalContext';

interface Props {
  pageId: string;
  subPageId?: string | null;
  onClose: () => void;
}

function extractInternalLinks(html: string): { pageId: string; anchor?: string }[] {
  const results: { pageId: string; anchor?: string }[] = [];
  const re = /data-pid="([^"]+)"(?:[^>]*data-anchor="([^"]*)")?/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    results.push({ pageId: m[1], anchor: m[2] || undefined });
  }
  return results;
}

export default function BacklinksPanel({ pageId, subPageId, onClose }: Props) {
  const { state, dispatch } = usePortal();
  const isDark = state.theme === 'dark';

  const targetId = subPageId || pageId;

  // Find all pages/subpages that link to targetId
  const backlinks: { fromPageId: string; fromPageTitle: string; fromSubPageId?: string; fromSubPageTitle?: string; anchor?: string }[] = [];

  state.pages.forEach(page => {
    const links = extractInternalLinks(page.content);
    links.forEach(l => {
      if (l.pageId === targetId) {
        backlinks.push({ fromPageId: page.id, fromPageTitle: page.title, anchor: l.anchor });
      }
    });
    page.subPages.forEach(sp => {
      if (sp.isTracker) return;
      const spLinks = extractInternalLinks(sp.content);
      spLinks.forEach(l => {
        if (l.pageId === targetId) {
          backlinks.push({ fromPageId: page.id, fromPageTitle: page.title, fromSubPageId: sp.id, fromSubPageTitle: sp.title, anchor: l.anchor });
        }
      });
    });
  });

  // Also find outgoing links from current page
  const currentPage = state.pages.find(p => p.id === pageId);
  const currentContent = subPageId
    ? currentPage?.subPages.find(sp => sp.id === subPageId)?.content || ''
    : currentPage?.content || '';
  const outLinks = extractInternalLinks(currentContent);
  const outLinkPages = outLinks.map(l => {
    const page = state.pages.find(p => p.id === l.pageId);
    const sp = page?.subPages.find(sp => sp.id === l.pageId);
    return { pageId: l.pageId, title: page?.title || sp?.title || 'Unknown', anchor: l.anchor };
  }).filter(l => l.title !== 'Unknown');

  const navigate = (pId: string, spId?: string) => {
    dispatch({ type: 'SET_ACTIVE_PAGE', pageId: pId, subPageId: spId || null });
  };

  return (
    <div className={`flex flex-col h-full border-l ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`} style={{ width: 280 }}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>🔗 Link Graph</span>
        <button onClick={onClose} className={`w-6 h-6 flex items-center justify-center rounded ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Mini graph visualization */}
        <div className={`rounded-xl border p-3 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-center" style={{ height: 120 }}>
            <svg width="240" height="110" viewBox="0 0 240 110">
              {/* Center node */}
              <circle cx="120" cy="55" r="20" fill="#6366f1" stroke="#4f46e5" strokeWidth="2"/>
              <text x="120" y="59" textAnchor="middle" fontSize="8" fill="white" fontWeight="600">
                {(currentPage?.title || '').slice(0, 10)}
              </text>

              {/* Backlink nodes (incoming) */}
              {backlinks.slice(0, 4).map((bl, i) => {
                const angle = -90 + (i - (Math.min(backlinks.length, 4) - 1) / 2) * 45;
                const rad = angle * Math.PI / 180;
                const x = 120 + Math.cos(rad) * 75 - 45;
                const y = 55 + Math.sin(rad) * 40;
                return (
                  <g key={i} style={{ cursor: 'pointer' }} onClick={() => navigate(bl.fromPageId, bl.fromSubPageId)}>
                    <line x1={x + 22} y1={y} x2="100" y2="55" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arr)"/>
                    <circle cx={x} cy={y} r="14" fill={isDark ? '#334155' : '#e0e7ff'} stroke="#a5b4fc" strokeWidth="1.5"/>
                    <text x={x} y={y + 3} textAnchor="middle" fontSize="6" fill={isDark ? '#c7d2fe' : '#3730a3'}>
                      {(bl.fromSubPageTitle || bl.fromPageTitle).slice(0, 8)}
                    </text>
                  </g>
                );
              })}

              {/* Outlink nodes (outgoing) */}
              {outLinkPages.slice(0, 4).map((ol, i) => {
                const angle = 90 + (i - (Math.min(outLinkPages.length, 4) - 1) / 2) * 45;
                const rad = angle * Math.PI / 180;
                const x = 120 + Math.cos(rad) * 75 + 25;
                const y = 55 + Math.sin(rad) * 40;
                return (
                  <g key={i} style={{ cursor: 'pointer' }} onClick={() => navigate(ol.pageId)}>
                    <line x1="140" y1="55" x2={x - 14} y2={y} stroke="#6366f1" strokeWidth="1.5" markerEnd="url(#arr2)" strokeDasharray="4,2"/>
                    <circle cx={x} cy={y} r="14" fill={isDark ? '#1e1b4b' : '#eef2ff'} stroke="#6366f1" strokeWidth="1.5"/>
                    <text x={x} y={y + 3} textAnchor="middle" fontSize="6" fill={isDark ? '#a5b4fc' : '#4338ca'}>
                      {ol.title.slice(0, 8)}
                    </text>
                  </g>
                );
              })}

              <defs>
                <marker id="arr" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                  <path d="M0,0 L0,5 L5,2.5 z" fill="#94a3b8"/>
                </marker>
                <marker id="arr2" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                  <path d="M0,0 L0,5 L5,2.5 z" fill="#6366f1"/>
                </marker>
              </defs>
            </svg>
          </div>
          <div className={`flex gap-4 text-xs justify-center mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            <span>← Backlinks</span><span>→ Outgoing</span>
          </div>
        </div>

        {/* Backlinks list */}
        <div>
          <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Backlinks ({backlinks.length})
          </div>
          {backlinks.length === 0 ? (
            <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>No pages link here yet.</p>
          ) : (
            <div className="space-y-1.5">
              {backlinks.map((bl, i) => (
                <button key={i} onClick={() => navigate(bl.fromPageId, bl.fromSubPageId)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-indigo-50 text-slate-700 border border-slate-100'}`}>
                  <div className="font-medium truncate">{bl.fromSubPageTitle || bl.fromPageTitle}</div>
                  {bl.fromSubPageTitle && <div className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>in {bl.fromPageTitle}</div>}
                  {bl.anchor && <div className={`text-xs truncate text-indigo-400`}>↳ {bl.anchor}</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Outgoing links */}
        <div>
          <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Outgoing Links ({outLinkPages.length})
          </div>
          {outLinkPages.length === 0 ? (
            <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>No internal links in this page.</p>
          ) : (
            <div className="space-y-1.5">
              {outLinkPages.map((ol, i) => (
                <button key={i} onClick={() => navigate(ol.pageId)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-indigo-50 text-slate-700 border border-slate-100'}`}>
                  <div className="font-medium truncate">{ol.title}</div>
                  {ol.anchor && <div className="text-xs text-indigo-400">↳ {ol.anchor}</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
