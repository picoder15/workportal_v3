import { usePortal } from '../context/PortalContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApply: (content: string, title?: string) => void;
}

const TEMPLATES = [
  {
    id: 'meeting',
    label: 'Meeting Notes',
    icon: '🗣️',
    desc: 'Structured template for meeting minutes',
    content: `<h1>Meeting Notes</h1>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Attendees:</strong> </p>
<p><strong>Location/Link:</strong> </p>

<h2>Agenda</h2>
<ol><li>Item 1</li><li>Item 2</li><li>Item 3</li></ol>

<h2>Discussion</h2>
<h3>Topic 1</h3>
<p>Notes here...</p>
<h3>Topic 2</h3>
<p>Notes here...</p>

<h2>Action Items</h2>
<ul>
<li>[ ] Task — <em>Owner</em> — Due: </li>
<li>[ ] Task — <em>Owner</em> — Due: </li>
</ul>

<h2>Next Meeting</h2>
<p><strong>Date:</strong> </p>
<p><strong>Agenda Preview:</strong> </p>`,
    title: 'Meeting Notes',
  },
  {
    id: 'todo',
    label: 'Task List',
    icon: '✅',
    desc: 'Task and to-do tracker',
    content: `<h1>Task List</h1>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Priority:</strong> Medium</p>

<h2>🔴 High Priority</h2>
<ul>
<li>[ ] Task 1</li>
<li>[ ] Task 2</li>
</ul>

<h2>🟡 Medium Priority</h2>
<ul>
<li>[ ] Task 3</li>
<li>[ ] Task 4</li>
</ul>

<h2>🟢 Low Priority</h2>
<ul>
<li>[ ] Task 5</li>
</ul>

<h2>✅ Completed</h2>
<ul>
<li>[x] Completed task</li>
</ul>`,
    title: 'Task List',
  },
  {
    id: 'notes',
    label: 'General Notes',
    icon: '📓',
    desc: 'Simple note-taking layout',
    content: `<h1>Notes</h1>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Topic:</strong> </p>

<h2>Key Points</h2>
<ul>
<li>Point 1</li>
<li>Point 2</li>
<li>Point 3</li>
</ul>

<h2>Details</h2>
<p>Write your detailed notes here...</p>

<h2>References</h2>
<ul>
<li>Reference 1</li>
</ul>

<h2>Summary</h2>
<p>Summary goes here...</p>`,
    title: 'Notes',
  },
  {
    id: 'project',
    label: 'Project Plan',
    icon: '🚀',
    desc: 'Project planning and roadmap',
    content: `<h1>Project Plan</h1>
<p><strong>Project Name:</strong> </p>
<p><strong>Start Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>End Date:</strong> </p>
<p><strong>Owner:</strong> </p>

<h2>Objective</h2>
<p>Define the goal of this project...</p>

<h2>Scope</h2>
<h3>In Scope</h3>
<ul><li>Item 1</li></ul>
<h3>Out of Scope</h3>
<ul><li>Item 1</li></ul>

<h2>Milestones</h2>
<ol>
<li><strong>Phase 1:</strong>  — Target: </li>
<li><strong>Phase 2:</strong>  — Target: </li>
<li><strong>Phase 3:</strong>  — Target: </li>
</ol>

<h2>Resources</h2>
<ul><li>Team member 1</li><li>Tool 1</li></ul>

<h2>Risks</h2>
<ul><li>Risk 1 — Mitigation: </li></ul>

<h2>Progress</h2>
<p>Update status here...</p>`,
    title: 'Project Plan',
  },
  {
    id: 'weekly',
    label: 'Weekly Review',
    icon: '📅',
    desc: 'Weekly reflection and planning',
    content: `<h1>Weekly Review</h1>
<p><strong>Week of:</strong> ${new Date().toLocaleDateString()}</p>

<h2>Wins 🏆</h2>
<ul><li>Win 1</li><li>Win 2</li></ul>

<h2>Challenges ⚠️</h2>
<ul><li>Challenge 1</li></ul>

<h2>Learnings 💡</h2>
<ul><li>Learning 1</li></ul>

<h2>Next Week Goals</h2>
<ul>
<li>[ ] Goal 1</li>
<li>[ ] Goal 2</li>
<li>[ ] Goal 3</li>
</ul>

<h2>Metrics</h2>
<p>Track your key numbers here...</p>`,
    title: 'Weekly Review',
  },
  {
    id: 'bug',
    label: 'Bug Report',
    icon: '🐛',
    desc: 'Software bug documentation',
    content: `<h1>Bug Report</h1>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Severity:</strong> 🔴 Critical / 🟡 Medium / 🟢 Low</p>
<p><strong>Status:</strong> Open</p>

<h2>Summary</h2>
<p>One-line description of the bug...</p>

<h2>Steps to Reproduce</h2>
<ol>
<li>Step 1</li>
<li>Step 2</li>
<li>Step 3</li>
</ol>

<h2>Expected Behavior</h2>
<p>What should happen...</p>

<h2>Actual Behavior</h2>
<p>What actually happens...</p>

<h2>Environment</h2>
<ul><li>OS: </li><li>Browser: </li><li>Version: </li></ul>

<h2>Attachments</h2>
<p>Screenshots or logs...</p>

<h2>Fix Notes</h2>
<p>Resolution notes...</p>`,
    title: 'Bug Report',
  },
];

export default function TemplatesModal({ isOpen, onClose, onApply }: Props) {
  const { state } = usePortal();
  const isDark = state.theme === 'dark';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative w-full max-w-2xl mx-4 rounded-2xl shadow-2xl flex flex-col ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`} style={{ maxHeight: '80vh' }}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Templates</h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Choose a template to start with</p>
          </div>
          <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Templates grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4">
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => { onApply(tpl.content, tpl.title); onClose(); }}
                className={`flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${isDark ? 'border-slate-700 bg-slate-700/50 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                <div className="text-2xl">{tpl.icon}</div>
                <div className={`font-semibold text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{tpl.label}</div>
                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tpl.desc}</div>
              </button>
            ))}

            {/* Blank */}
            <button
              onClick={() => { onApply('', undefined); onClose(); }}
              className={`flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all hover:shadow-md hover:-translate-y-0.5 border-dashed ${isDark ? 'border-slate-600 bg-slate-800 hover:bg-slate-700' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}
            >
              <div className="text-2xl">📄</div>
              <div className={`font-semibold text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Blank Page</div>
              <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Start with an empty page</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
