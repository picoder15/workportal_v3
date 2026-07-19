import { usePortal } from '../context/PortalContext';

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  details: string | null; // JSON string
}

export default function DiffModal({ isOpen, onClose, title, details }: DiffModalProps) {
  const { state } = usePortal();
  const isDark = state.theme === 'dark';

  if (!isOpen) return null;

  let parsedDetails: any = null;
  try {
    if (details) parsedDetails = JSON.parse(details);
  } catch (e) {
    parsedDetails = { raw: details };
  }

  const renderContent = () => {
    if (!parsedDetails) return <p className="text-sm">No additional details.</p>;

    if (parsedDetails.type === 'content_change') {
      const { oldContent, newContent } = parsedDetails;
      return (
        <div className="space-y-4">
          <div>
            <h4 className={`text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Before</h4>
            <div className={`p-3 rounded-lg border text-sm max-h-64 overflow-auto ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              <div dangerouslySetInnerHTML={{ __html: oldContent || '<em>Empty</em>' }} />
            </div>
          </div>
          <div>
            <h4 className={`text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>After</h4>
            <div className={`p-3 rounded-lg border text-sm max-h-64 overflow-auto ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              <div dangerouslySetInnerHTML={{ __html: newContent || '<em>Empty</em>' }} />
            </div>
          </div>
        </div>
      );
    } else if (parsedDetails.oldTitle && parsedDetails.newTitle) {
      return (
        <div className="space-y-2">
          <p><span className="font-semibold">Old:</span> {parsedDetails.oldTitle}</p>
          <p><span className="font-semibold">New:</span> {parsedDetails.newTitle}</p>
        </div>
      );
    } else if (parsedDetails.subPageTitle) {
      return <p>Sub page: <span className="font-medium">{parsedDetails.subPageTitle}</span></p>;
    } else if (parsedDetails.title) {
      return <p>Page: <span className="font-medium">{parsedDetails.title}</span></p>;
    } else {
      return <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(parsedDetails, null, 2)}</pre>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-3xl mx-4 rounded-2xl shadow-2xl transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          {renderContent()}
        </div>
        <div className={`px-6 py-4 border-t flex justify-end ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}