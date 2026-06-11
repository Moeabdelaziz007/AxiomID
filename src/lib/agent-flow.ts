export type AgentStatus = 'INACTIVE' | 'ACTIVE' | 'PAUSED' | 'SLEEPING';

export interface AgentState {
  id: string;
  publicId: string;
  name: string;
  status: AgentStatus;
  permissions: string[];
  lastActive: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentMessage {
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
}

export interface AgentAction {
  type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'executed' | 'failed';
  result?: unknown;
}

export async function activateAgent(walletAddress: string, accessToken: string, name?: string): Promise<AgentState & { apiKey?: string }> {
  const res = await fetch('/api/agent/main', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ walletAddress, name }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to activate agent');
  }

  const data = await res.json();
  return { ...data.agent, apiKey: data.apiKey };
}

export async function getAgentStatus(walletAddress: string, accessToken: string): Promise<AgentState | null> {
  const params = new URLSearchParams({ walletAddress });
  const res = await fetch(`/api/agent/main?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.json();
    throw new Error(err.error || 'Failed to get agent status');
  }

  const data = await res.json();
  return data.agent;
}

export async function sendToIqra(
  agentId: string,
  message: string
): Promise<{ reply: string; actions: AgentAction[] }> {
  const res = await fetch(`/api/proxy/iqra/agent/${encodeURIComponent(agentId)}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to communicate with iqra');
  }

  return res.json();
}
