import { usePortal } from '../context/PortalContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  subPageId?: string | null;
}

function htmlToMarkdown(html: string): string {
  let md = html;
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  md = md.replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_');
  md = md.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
  md = md.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~');
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n');
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<ul[^>]*>(.*?)<\/ul>/gi, '$1\n');
  md = md.replace(/<ol[^>]*>(.*?)<\/ol>/gi, '$1\n');
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<[^>]+>/g, '');
  md = md.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  return md.trim();
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ExportModal({ isOpen, onClose, pageId, subPageId }: Props) {
  const { state } = usePortal();
  const isDark = state.theme === 'dark';

  if (!isOpen) return null;

  const page = state.pages.find(p => p.id === pageId);
  const subPage = subPageId ? page?.subPages.find(sp => sp.id === subPageId) : null;
  const target = subPage || page;
  const title = target?.title || 'Untitled';
  const content = target?.content || '';

  const exportMarkdown = () => {
    const md = `# ${title}\n\n${htmlToMarkdown(content)}`;
    download(`${title}.md`, md, 'text/markdown');
  };

  const exportHTML = () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; line-height: 1.7; }
  h1 { font-size: 2rem; font-weight: 700; margin-bottom: 8px; }
  h2 { font-size: 1.5rem; font-weight: 600; }
  h3 { font-size: 1.2rem; font-weight: 600; }
  blockquote { border-left: 4px solid #6366f1; padding-left: 1rem; margin: 1rem 0; color: #64748b; font-style: italic; }
  a { color: #6366f1; }
  ul, ol { padding-left: 1.5rem; }
  .meta { color: #94a3b8; font-size: 0.875rem; margin-bottom: 2rem; }
  .portal-internal-link { color: #6366f1; text-decoration: underline; }
</style>
</head>
<body>
<h1>${title}</h1>
<p class="meta">Exported from Portal · ${new Date().toLocaleDateString()}</p>
${content}
</body>
</html>`;
    download(`${title}.html`, html, 'text/html');
  };

  const exportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html>
<html><head><title>${title}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; line-height: 1.7; }
  h1 { font-size: 2rem; font-weight: 700; } h2 { font-size: 1.5rem; } h3 { font-size: 1.2rem; }
  blockquote { border-left: 4px solid #6366f1; padding-left: 1rem; margin: 1rem 0; color: #64748b; font-style: italic; }
  ul, ol { padding-left: 1.5rem; }
  .meta { color: #94a3b8; font-size: 0.875rem; margin-bottom: 2rem; }
  img { max-width: 100%; }
  @media print { body { margin: 0; } }
</style></head><body>
<h1>${title}</h1>
<p class="meta">Exported from Portal · ${new Date().toLocaleDateString()}</p>
${content}
<script>window.onload = () => { window.print(); window.close(); }<\/script>
</body></html>`);
    printWindow.document.close();
  };

  const exportJSON = () => {
    const data = JSON.stringify({ title, content, exportedAt: new Date().toISOString() }, null, 2);
    download(`${title}.json`, data, 'application/json');
  };

  const exportFormats = [
    {
      key: 'markdown',
      label: 'Markdown',
      desc: 'Best for developers, GitHub, Obsidian',
      icon: '📝',
      ext: '.md',
      color: isDark ? 'bg-slate-700 border-slate-600 hover:bg-slate-600' : 'bg-white border-slate-200 hover:bg-slate-50',
      action: exportMarkdown,
    },
    {
      key: 'html',
      label: 'HTML',
      desc: 'Full HTML file, ready to open in browser',
      icon: '🌐',
      ext: '.html',
      color: isDark ? 'bg-slate-700 border-slate-600 hover:bg-slate-600' : 'bg-white border-slate-200 hover:bg-slate-50',
      action: exportHTML,
    },
    {
      key: 'pdf',
      label: 'PDF (Print)',
      desc: 'Opens print dialog for saving as PDF',
      icon: '📄',
      ext: '.pdf',
      color: isDark ? 'bg-slate-700 border-slate-600 hover:bg-slate-600' : 'bg-white border-slate-200 hover:bg-slate-50',
      action: exportPDF,
    },
    {
      key: 'json',
      label: 'JSON',
      desc: 'Raw data export for backup',
      icon: '⚙️',
      ext: '.json',
      color: isDark ? 'bg-slate-700 border-slate-600 hover:bg-slate-600' : 'bg-white border-slate-200 hover:bg-slate-50',
      action: exportJSON,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative w-full max-w-md mx-4 rounded-2xl shadow-2xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Export Page</h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
          </div>
          <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-6 space-y-3">
          {exportFormats.map(fmt => (
            <button key={fmt.key} onClick={() => { fmt.action(); onClose(); }}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${fmt.color}`}
            >
              <span className="text-2xl">{fmt.icon}</span>
              <div className="flex-1">
                <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{fmt.label} <span className={`text-xs font-normal ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{fmt.ext}</span></div>
                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{fmt.desc}</div>
              </div>
              <svg className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
