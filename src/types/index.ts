export interface VersionSnapshot {
  id: string;
  content: string;
  timestamp: Date;
  label?: string;
}

export interface Activity {
  id: string;
  type: 'create' | 'rename' | 'content_change' | 'add_subpage' | 'delete_subpage' | 'delete';
  description: string;
  timestamp: Date;
  details?: string;
}

export interface SubPage {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isTracker?: boolean;
  nameLocked?: boolean;
  contentLocked?: boolean;
  tags?: string[];
  versions?: VersionSnapshot[];
  isPinned?: boolean;
}

export interface Page {
  id: string;
  title: string;
  content: string;
  subPages: SubPage[];
  activities: Activity[];
  isExpanded: boolean;
  createdAt: Date;
  updatedAt: Date;
  nameLocked?: boolean;
  contentLocked?: boolean;
  tags?: string[];
  versions?: VersionSnapshot[];
  isPinned?: boolean;
}

export type Theme = 'light' | 'dark';

export interface ShortcutDef {
  id: string;
  label: string;
  keys: string;
  enabled: boolean;
  action: string;
}

export interface PortalState {
  pages: Page[];
  sidebarTitle: string;
  sidebarTitleLocked?: boolean;
  activePageId: string | null;
  activeSubPageId: string | null;
  theme: Theme;
  currentView: 'editor' | 'dashboard' | 'graph' | 'calendar';
  recentPages: string[];
  shortcuts: ShortcutDef[];
  pinnedPages: string[];
}

export const DEFAULT_SHORTCUTS: ShortcutDef[] = [
  { id: 'save', label: 'Save Page', keys: 'Ctrl+S', enabled: true, action: 'save' },
  { id: 'bold', label: 'Bold', keys: 'Ctrl+B', enabled: true, action: 'bold' },
  { id: 'italic', label: 'Italic', keys: 'Ctrl+I', enabled: true, action: 'italic' },
  { id: 'underline', label: 'Underline', keys: 'Ctrl+U', enabled: true, action: 'underline' },
  { id: 'search', label: 'Search', keys: 'Ctrl+K', enabled: true, action: 'search' },
  { id: 'new_page', label: 'New Page', keys: 'Ctrl+N', enabled: true, action: 'new_page' },
  { id: 'dashboard', label: 'Dashboard', keys: 'Ctrl+D', enabled: true, action: 'dashboard' },
  { id: 'graph', label: 'Graph View', keys: 'Ctrl+G', enabled: true, action: 'graph' },
  { id: 'internal_link', label: 'Insert Internal Link', keys: 'Ctrl+L', enabled: true, action: 'internal_link' },
  { id: 'version_history', label: 'Version History', keys: 'Ctrl+H', enabled: true, action: 'version_history' },
  { id: 'export', label: 'Export Page', keys: 'Ctrl+E', enabled: true, action: 'export' },
];
