import { useState } from 'react';
import { usePortal } from '../context/PortalContext';
import { Page, SubPage } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (pageId: string, pageTitle: string, subPageId?: string, subPageTitle?: string, anchor?: string) => void;
}

function extractHeadings(html: string): string[] {
  const matches = html.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/g) || [];
  return matches.map(m => m.replace(/<[^>]+>/g, '').trim());
}

export default function InternalLinkModal({ isOpen, onClose, onInsert }: Props) {
  const { state } = usePortal();
  const isDark = state.theme === 'dark';
  const [query, setQuery] = useState('');
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [selectedSubPage, setSelectedSubPage] = useState<SubPage | null>(null);
  const [selectedAnchor, setSelectedAnchor] = useState<string>('');
  const [step, setStep] = useState<'pick' | 'anchor'>('pick');

  if (!isOpen) return null;

  const filteredPages = state.pages.filter(p =>
    p.title.toLowerCase().includes(query.toLowerCase()) ||
    p.subPages.some(sp => !sp.isTracker && sp.title.toLowerCase().includes(query.toLowerCase()))
  );

  const handlePickPage = (page: Page) => {
    setSelectedPage(page);
    setSelectedSubPage(null);
    setSelectedAnchor('');
    setStep('anchor');
  };

  const handlePickSubPage = (page: Page, sp: SubPage) => {
    setSelectedPage(page);
    setSelectedSubPage(sp);
    setSelectedAnchor('');
    setStep('anchor');
  };

  const handleInsert = () => {
    if (!selectedPage) return;
    onInsert(selectedPage.id, selectedPage.title, selectedSubPage?.id, selectedSubPage?.title, selectedAnchor || undefined);
    handleClose();
  };

  const handleClose = () => {
    setQuery('');
    setSelectedPage(null);
    setSelectedSubPage(null);
    setSelectedAnchor('');
    setStep('pick');
    onClose();
  };

  const targetContent = selectedSubPage?.content || selectedPage?.content || '';
  const headings = extractHeadings(targetContent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose}/>
      <div className={`relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl flex flex-col ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`} style={{ maxHeight: '75vh' }}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3">
            {step === 'anchor' && (
              <button onClick={() => setStep('pick')} className={`p-1 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              </button>
            )}
            <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {step === 'pick' ? '🔗 Insert Internal Link' : `🎯 Set Anchor — ${selectedSubPage?.title || selectedPage?.title}`}
            </h2>
          </div>
          <button onClick={handleClose} className={`w-7 h-7 flex items-center justify-center rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {step === 'pick' ? (
          <>
            {/* Search */}
            <div className="p-4">
              <input
                autoFocus
                type="text"
                placeholder="Search pages and subpages..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-200'}`}
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
              {filteredPages.map(page => (
                <div key={page.id}>
                  <button
                    onClick={() => handlePickPage(page)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-indigo-50 text-slate-700'}`}
                  >
                    <svg className="w-4 h-4 flex-shrink-0 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <span className="font-medium text-sm">{page.title}</span>
                  </button>
                  {page.subPages.filter(sp => !sp.isTracker).map(sp => (
                    <button
                      key={sp.id}
                      onClick={() => handlePickSubPage(page, sp)}
                      className={`w-full flex items-center gap-3 px-3 py-1.5 ml-4 rounded-xl text-left transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-indigo-50 text-slate-500'}`}
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                      </svg>
                      <span className="text-sm">{sp.title}</span>
                      <span className={`text-xs ml-auto ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{page.title}</span>
                    </button>
                  ))}
                </div>
              ))}
              {filteredPages.length === 0 && <p className={`text-sm text-center py-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No pages found</p>}
            </div>
          </>
        ) : (
          <>
            {/* Anchor selection */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Optionally select a heading/section to link to directly (paragraph pointer):
              </p>

              {/* No anchor option */}
              <button
                onClick={() => setSelectedAnchor('')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${!selectedAnchor ? (isDark ? 'border-indigo-500 bg-indigo-900/30' : 'border-indigo-400 bg-indigo-50') : (isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50')}`}
              >
                <span className="text-lg">🔗</span>
                <div>
                  <div className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Link to top of page</div>
                  <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No specific section</div>
                </div>
                {!selectedAnchor && <div className="ml-auto w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center"><svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg></div>}
              </button>

              {headings.length > 0 && (
                <>
                  <div className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Headings</div>
                  {headings.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedAnchor(h)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${selectedAnchor === h ? (isDark ? 'border-indigo-500 bg-indigo-900/30' : 'border-indigo-400 bg-indigo-50') : (isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50')}`}
                    >
                      <span className="text-lg">#</span>
                      <span className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{h}</span>
                      {selectedAnchor === h && <div className="ml-auto w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center"><svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg></div>}
                    </button>
                  ))}
                </>
              )}
              {headings.length === 0 && (
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No headings found in target page. Add H1/H2/H3 headings to enable paragraph pointers.</p>
              )}
            </div>

            <div className={`px-4 py-3 border-t flex justify-end gap-2 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
              <button onClick={() => setStep('pick')} className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>Back</button>
              <button onClick={handleInsert} className="px-4 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white">
                Insert Link
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
