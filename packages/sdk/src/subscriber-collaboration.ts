/**
 * Real Live HTTP Gitee OpenAPI Client & Webhook Collaboration Mesh
 * Spec: Gitee OpenAPI v5 — GET /v5/repos/{owner}/{repo}/subscribers
 * Documentation: https://gitee.com/api/v5/swagger
 */

export interface GiteeUserSubscriber {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  html_url: string;
  type: string; // 'User' | 'Organization'
  watch_at: string; // ISO8601 string
}

export interface GiteeSubscriberFetchOptions {
  page?: number; // Default: 1
  perPage?: number; // Default: 20, Max: 100
  accessToken?: string; // Optional Gitee OAuth Token
}

export interface GiteeWebhookHeaderOptions {
  giteeToken?: string;
  giteeTimestamp?: string;
  giteeEvent?: string; // 'Push Hook' | 'Issue Hook' | 'Pull Request Hook'
}

export interface WorkspaceEvent {
  eventId: string;
  topic: string;
  senderAgentId: string;
  eventType: 'FILE_MUTATED' | 'POLICY_DENIED' | 'WEIGHTS_UPDATED' | 'TASK_COMPLETED' | 'GITEE_PUSH' | 'GITEE_ISSUE';
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface WorkspaceEventResponse {
  subscriberId: string;
  status: 'PROCESSED' | 'IGNORED' | 'ACTION_TAKEN';
  actionSummary?: string;
}

export interface AgentSubscriber {
  agentId: string;
  agentRole: string;
  subscribedTopic: string;
  notify: (event: WorkspaceEvent) => Promise<WorkspaceEventResponse>;
}

/**
 * Real Live Gitee OpenAPI HTTP Client
 */
export class GiteeApiClient {
  private baseUrl = 'https://gitee.com/api/v5';

  /**
   * Fetches real subscribers from Gitee OpenAPI GET /v5/repos/{owner}/{repo}/subscribers
   */
  public async fetchRepoSubscribers(
    owner: string,
    repo: string,
    options: GiteeSubscriberFetchOptions = {}
  ): Promise<GiteeUserSubscriber[]> {
    const page = options.page ?? 1;
    const perPage = options.perPage ?? 20;
    let url = `${this.baseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/subscribers?page=${page}&per_page=${perPage}`;

    if (options.accessToken) {
      url += `&access_token=${encodeURIComponent(options.accessToken)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AxiomID-Agentic-SDK/1.0',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gitee API HTTP Error [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error(`Invalid Gitee API response. Expected array of subscribers, got ${typeof data}`);
    }

    return data as GiteeUserSubscriber[];
  }
}

/**
 * Gitee Webhook Signature Verification & Event Parser
 */
export class GiteeWebhookHandler {
  /**
   * Verifies Gitee Webhook secret token
   */
  public verifyWebhookSecret(expectedSecret: string, providedToken?: string): boolean {
    if (!expectedSecret || !providedToken) return false;
    return expectedSecret === providedToken;
  }

  /**
   * Parses Gitee Webhook payload into an agentic WorkspaceEvent
   */
  public parseGiteeWebhookEvent(
    eventType: string,
    payload: Record<string, any>
  ): WorkspaceEvent {
    const repoName = payload.repository ? payload.repository.full_name : 'unknown/repo';
    const sender = payload.sender ? payload.sender.login : 'gitee-webhook';

    let eventKind: WorkspaceEvent['eventType'] = 'GITEE_PUSH';
    if (eventType.includes('Issue')) eventKind = 'GITEE_ISSUE';

    return {
      eventId: `gitee_evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      topic: `repo/${repoName}`,
      senderAgentId: sender,
      eventType: eventKind,
      payload,
      timestamp: Date.now(),
    };
  }
}

/**
 * Agentic Subscriber Collaboration Mesh
 */
export class WorkspaceSubscriberRegistry {
  private subscribersMap: Map<string, AgentSubscriber[]> = new Map();

  public subscribe(subscriber: AgentSubscriber): void {
    const existing = this.subscribersMap.get(subscriber.subscribedTopic) || [];
    existing.push(subscriber);
    this.subscribersMap.set(subscriber.subscribedTopic, existing);
  }

  public unsubscribe(topic: string, agentId: string): void {
    const existing = this.subscribersMap.get(topic) || [];
    this.subscribersMap.set(
      topic,
      existing.filter((s) => s.agentId !== agentId)
    );
  }

  public getSubscribers(topic: string): Omit<AgentSubscriber, 'notify'>[] {
    const list = this.subscribersMap.get(topic) || [];
    return list.map(({ agentId, agentRole, subscribedTopic }) => ({
      agentId,
      agentRole,
      subscribedTopic,
    }));
  }

  public async broadcast(event: WorkspaceEvent): Promise<WorkspaceEventResponse[]> {
    const subscribers = this.subscribersMap.get(event.topic) || [];
    const wildcardSubscribers = this.subscribersMap.get('*') || [];
    const allSubscribers = [...subscribers, ...wildcardSubscribers];

    return await Promise.all(
      allSubscribers.map(async (sub) => {
        try {
          return await sub.notify(event);
        } catch (err: any) {
          return {
            subscriberId: sub.agentId,
            status: 'IGNORED' as const,
            actionSummary: `Error: ${err.message}`,
          };
        }
      })
    );
  }
}
