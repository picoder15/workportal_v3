import { PortalState } from '../types';

const API_BASE = window.location.origin + '/api';

export async function fetchWorkspaceState(): Promise<PortalState> {
  const res = await fetch(`${API_BASE}/state`);
  if (!res.ok) throw new Error('Failed to fetch state');
  return res.json();
}

export async function saveWorkspaceState(state: PortalState): Promise<void> {
  const res = await fetch(`${API_BASE}/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  if (!res.ok) throw new Error('Failed to save state');
}

export async function fetchStateTimestamp(): Promise<number> {
  const res = await fetch(`${API_BASE}/state/timestamp`);
  const data = await res.json();
  return data.updatedAt;
}