import { usePortal } from '../context/PortalContext';

export default function WelcomeScreen() {
  const { state, dispatch } = usePortal();
  const isDark = state.theme === 'dark';

  return (
    <div className={`flex flex-col items-center justify-center h-full gap-8 transition-colors duration-300 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
      {/* Icon */}
      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl ${isDark ? 'bg-indigo-900/60' : 'bg-indigo-50'}`}>
        <svg className={`w-10 h-10 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      {/* Text */}
      <div className="text-center space-y-3 max-w-sm">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
          Welcome to {state.sidebarTitle}
        </h2>
        <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Create your first page or select an existing one from the sidebar to start writing.
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={() => dispatch({ type: 'ADD_PAGE' })}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${
          isDark
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        Create First Page
      </button>

      {/* Feature hints */}
      <div className={`grid grid-cols-3 gap-4 mt-4 max-w-lg w-full`}>
        {[
          {
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ),
            title: 'Pages & Sub Pages',
            desc: 'Organize with nested pages',
          },
          {
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            ),
            title: 'Rich Text Editor',
            desc: 'Bold, italic, underline & more',
          },
          {
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            ),
            title: 'Auto Save',
            desc: 'Never lose your work',
          },
        ].map(({ icon, title, desc }, i) => (
          <div
            key={i}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-colors ${
              isDark ? 'bg-slate-800 border border-slate-700' : 'bg-slate-50 border border-slate-100'
            }`}
          >
            <div className={`${isDark ? 'text-indigo-400' : 'text-indigo-500'}`}>{icon}</div>
            <div>
              <div className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{title}</div>
              <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
