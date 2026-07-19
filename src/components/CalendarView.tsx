import { useState } from 'react';
import { usePortal } from '../context/PortalContext';
import { Page } from '../types';

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function CalendarView() {
  const { state, dispatch } = usePortal();
  const isDark = state.theme === 'dark';
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Build map of date -> pages
  const datePageMap = new Map<string, Page[]>();
  state.pages.forEach(page => {
    const d = new Date(page.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!datePageMap.has(key)) datePageMap.set(key, []);
    datePageMap.get(key)!.push(page);
  });

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedKey = selectedDay ? `${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}` : '';
  const selectedPages = selectedDay ? (datePageMap.get(selectedKey) || []) : [];

  const goToPage = (pageId: string) => {
    dispatch({ type: 'SET_ACTIVE_PAGE', pageId, subPageId: null });
  };

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-emerald-900/40' : 'bg-emerald-50'}`}>
            <svg className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Calendar View</h2>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Pages created by date</p>
          </div>
        </div>
        <button onClick={() => dispatch({ type: 'SET_VIEW', view: 'editor' })} className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>← Back</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            </button>
            <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{MONTH_NAMES[month]} {year}</h3>
            <button onClick={nextMonth} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map(d => (
              <div key={d} className={`text-center text-xs font-semibold py-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} />;
              const key = `${year}-${month}-${day}`;
              const pagesOnDay = datePageMap.get(key) || [];
              const count = pagesOnDay.length;
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = selectedDay?.getDate() === day && selectedDay?.getMonth() === month && selectedDay?.getFullYear() === year;

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(new Date(year, month, day))}
                  className={`relative aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-sm font-medium border ${
                    isSelected
                      ? isDark ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-indigo-600 border-indigo-600 text-white'
                      : isToday
                      ? isDark ? 'bg-indigo-900/40 border-indigo-700 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : count > 0
                      ? isDark ? 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700' : 'bg-emerald-50 border-emerald-200 text-slate-700 hover:bg-emerald-100'
                      : isDark ? 'border-transparent text-slate-500 hover:bg-slate-800' : 'border-transparent text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <span>{day}</span>
                  {count > 0 && (
                    <span className={`text-[9px] font-bold px-1 rounded-full ${
                      isSelected ? 'bg-white/30 text-white' : isDark ? 'bg-indigo-900/60 text-indigo-300' : 'bg-emerald-200 text-emerald-700'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Stats */}
          <div className={`mt-6 p-4 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
            <div className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Month Stats</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Pages this month', value: [...datePageMap.entries()].filter(([k]) => k.startsWith(`${year}-${month}-`)).reduce((a, [,v]) => a + v.length, 0) },
                { label: 'Total pages', value: state.pages.length },
                { label: 'Active days', value: [...datePageMap.keys()].filter(k => k.startsWith(`${year}-${month}-`)).length },
              ].map(({ label, value }) => (
                <div key={label} className={`text-center p-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-white'}`}>
                  <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{value}</div>
                  <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side panel: selected day pages */}
        {selectedDay && (
          <div className={`w-72 border-l p-4 overflow-y-auto ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
            <h4 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {selectedDay.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </h4>
            {selectedPages.length === 0 ? (
              <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No pages created on this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedPages.map(page => (
                  <button
                    key={page.id}
                    onClick={() => goToPage(page.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${isDark ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                  >
                    <div className="font-medium text-sm">📄 {page.title}</div>
                    <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {page.subPages.filter(sp => !sp.isTracker).length} subpages · {new Date(page.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
