import { useState } from 'react';
import { usePortal } from '../context/PortalContext';
import { Activity } from '../types';
import DiffModal from './DiffModal';


const activityLabels: Record<Activity['type'], string> = {
  create: 'Created',
  rename: 'Renamed',
  content_change: 'Content Updated',
  add_subpage: 'Sub Page Added',
  delete_subpage: 'Sub Page Deleted',
  delete: 'Deleted',
};

function formatTimestamp(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDotColor(type: Activity['type'], isDark: boolean): string {
  const lightColors: Record<Activity['type'], string> = {
    create: 'bg-emerald-500 ring-white',
    rename: 'bg-blue-500 ring-white',
    content_change: 'bg-violet-500 ring-white',
    add_subpage: 'bg-amber-500 ring-white',
    delete_subpage: 'bg-red-500 ring-white',
    delete: 'bg-rose-500 ring-white',
  };
  const darkColors: Record<Activity['type'], string> = {
    create: 'bg-emerald-400 ring-slate-900',
    rename: 'bg-blue-400 ring-slate-900',
    content_change: 'bg-violet-400 ring-slate-900',
    add_subpage: 'bg-amber-400 ring-slate-900',
    delete_subpage: 'bg-red-400 ring-slate-900',
    delete: 'bg-rose-400 ring-slate-900',
  };
  return isDark ? darkColors[type] : lightColors[type];
}

function getBadgeColor(type: Activity['type'], isDark: boolean): string {
  const lightColors: Record<Activity['type'], string> = {
    create: 'bg-emerald-50 text-emerald-600',
    rename: 'bg-blue-50 text-blue-600',
    content_change: 'bg-violet-50 text-violet-600',
    add_subpage: 'bg-amber-50 text-amber-600',
    delete_subpage: 'bg-red-50 text-red-600',
    delete: 'bg-rose-50 text-rose-600',
  };
  const darkColors: Record<Activity['type'], string> = {
    create: 'bg-emerald-900/30 text-emerald-400',
    rename: 'bg-blue-900/30 text-blue-400',
    content_change: 'bg-violet-900/30 text-violet-400',
    add_subpage: 'bg-amber-900/30 text-amber-400',
    delete_subpage: 'bg-red-900/30 text-red-400',
    delete: 'bg-rose-900/30 text-rose-400',
  };
  return isDark ? darkColors[type] : lightColors[type];
}


interface TrackerViewProps {
  pageId: string;
}

export default function TrackerView({ pageId }: TrackerViewProps) {
  const { state } = usePortal();
  const isDark = state.theme === 'dark';
  const page = state.pages.find((p) => p.id === pageId);
  const [selectedActivity, setSelectedActivity] = useState<{ title: string; details: string | null } | null>(null);

  if (!page) return null;

  const activities = [...page.activities].reverse(); // newest first

  const handleActivityClick = (activity: Activity) => {
    let title = '';
    switch (activity.type) {
      case 'content_change': title = 'Content Change Details'; break;
      case 'rename': title = 'Rename Details'; break;
      case 'add_subpage': title = 'Subpage Added'; break;
      case 'delete_subpage': title = 'Subpage Deleted'; break;
      case 'create': title = 'Page Created'; break;
      default: title = 'Activity Details';
    }
    setSelectedActivity({ title, details: activity.details || null });
  };

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
      {/* Header (unchanged) */}
      <div className={`flex items-center gap-3 px-6 py-5 border-b flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isDark ? 'bg-amber-900/30' : 'bg-amber-50'}`}>📋</div>
        <div>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Activity Timeline</h2>
          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {page.title} — {activities.length} event{activities.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Content area with summary on top */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* SUMMARY CARD - MOVED TO TOP */}
        {activities.length > 0 && (
          <div className={`mb-6 rounded-xl border p-4 ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
            <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Summary
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Page Created', count: activities.filter(a => a.type === 'create').length, color: 'text-emerald-600' },
                { label: 'Renames', count: activities.filter(a => a.type === 'rename').length, color: 'text-blue-600' },
                { label: 'Content Changes', count: activities.filter(a => a.type === 'content_change').length, color: 'text-violet-600' },
                { label: 'Sub Pages Added', count: activities.filter(a => a.type === 'add_subpage').length, color: 'text-amber-600' },
                { label: 'Sub Pages Deleted', count: activities.filter(a => a.type === 'delete_subpage').length, color: 'text-red-600' },
                { label: 'Total Events', count: activities.length, color: isDark ? 'text-white' : 'text-slate-800' },
              ].map(({ label, count, color }) => (
                <div key={label} className={`flex items-center justify-between px-3 py-2 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
                  <span className={`text-sm font-bold ${color}`}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline items */}
        {activities.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-60 gap-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            <span className="text-4xl">📭</span>
            <p className="text-sm">No activities recorded yet.</p>
          </div>
        ) : (
          <div className="relative">
            <div className={`absolute left-5 top-0 bottom-0 w-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <div className="space-y-0">
              {activities.map((activity, idx) => (
                <div key={activity.id} className="relative flex items-start gap-4 pb-6 group">
                  <div className={`relative z-10 mt-2.5 w-2.5 h-2.5 rounded-full ring-4 flex-shrink-0 ${getDotColor(activity.type, isDark)}`} />
                  <div className={`flex-1 min-w-0 rounded-xl border p-4 transition-colors cursor-pointer hover:shadow-md ${
                    isDark ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-100 shadow-sm hover:shadow'
                  }`}
                  onClick={() => handleActivityClick(activity)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {activity.description}
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          {formatTimestamp(activity.timestamp)}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${getBadgeColor(activity.type, isDark)}`}>
                        {activityLabels[activity.type]}
                      </span>
                    </div>
                    {activity.details && (
                      <div className={`mt-2 text-xs underline cursor-pointer ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        Click to view details →
                      </div>
                    )}
                    {idx === 0 && (
                      <div className={`mt-2 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>
                        Latest
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <DiffModal
        isOpen={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
        title={selectedActivity?.title || ''}
        details={selectedActivity?.details || null}
      />
    </div>
  );
}