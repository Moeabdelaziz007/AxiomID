import {
  GiteeApiClient,
  GiteeWebhookHandler,
  WorkspaceSubscriberRegistry,
  AgentSubscriber,
} from '../subscriber-collaboration.js';

async function runAllTests() {
  console.log('================================================================');
  console.log('🤝 TESTING REAL LIVE GITEE OPENAPI HTTP CLIENT & SUBSCRIBER MESH');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function assertTest(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.log(`❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // TEST 1: Live HTTP Fetch against Gitee OpenAPI Endpoint (openharmony/docs)
  await assertTest('TEST 1: Real HTTP fetch from Gitee OpenAPI (openharmony/docs/subscribers)', async () => {
    const client = new GiteeApiClient();
    const subscribers = await client.fetchRepoSubscribers('openharmony', 'docs', { page: 1, perPage: 3 });

    if (!Array.isArray(subscribers) || subscribers.length === 0) {
      throw new Error('Expected non-empty subscribers array from live Gitee OpenAPI, got empty or non-array.');
    }

    const topUser = subscribers[0]!;
    if (!topUser.login || !topUser.html_url) {
      throw new Error(`Invalid Gitee subscriber format: ${JSON.stringify(topUser)}`);
    }

    console.log(`   └─ Live Gitee HTTP API Success! Fetched ${subscribers.length} real subscribers. Top Subscriber: @${topUser.login} (${topUser.html_url})`);
  });

  // TEST 2: Gitee Webhook Signature Verification & Event Parsing
  await assertTest('TEST 2: Verify Gitee Webhook Token & Parse Payload', async () => {
    const handler = new GiteeWebhookHandler();
    const secret = 'axiomid_webhook_secret_99';

    const isValidSecret = handler.verifyWebhookSecret(secret, 'axiomid_webhook_secret_99');
    if (!isValidSecret) throw new Error('Valid webhook secret was rejected!');

    const isInvalidSecret = handler.verifyWebhookSecret(secret, 'wrong_secret');
    if (isInvalidSecret) throw new Error('Invalid webhook secret was accepted!');

    const parsedEvent = handler.parseGiteeWebhookEvent('Push Hook', {
      repository: { full_name: 'pai-list/AxiomID' },
      sender: { login: 'Moeabdelaziz007' },
      commits: [{ id: '122d45b9', message: 'fix(spec): validate spec examples' }],
    });

    if (parsedEvent.topic !== 'repo/pai-list/AxiomID' || parsedEvent.senderAgentId !== 'Moeabdelaziz007') {
      throw new Error(`Parsed webhook payload mismatch: ${JSON.stringify(parsedEvent)}`);
    }

    console.log(`   └─ Webhook Parsed Successfully! Topic: ${parsedEvent.topic} | Sender: @${parsedEvent.senderAgentId}`);
  });

  // TEST 3: Multi-Agent Collaboration Mesh Broadcasting
  await assertTest('TEST 3: Multi-Agent Collaboration Mesh Broadcasting', async () => {
    const registry = new WorkspaceSubscriberRegistry();

    const sub1: AgentSubscriber = {
      agentId: 'agent-test-runner',
      agentRole: 'TestRunnerAgent',
      subscribedTopic: 'repo/code-changes',
      notify: async (evt) => ({
        subscriberId: 'agent-test-runner',
        status: 'ACTION_TAKEN',
        actionSummary: 'Ran 20 unit tests — 100% PASS',
      }),
    };

    registry.subscribe(sub1);
    const responses = await registry.broadcast({
      eventId: 'evt_1',
      topic: 'repo/code-changes',
      senderAgentId: 'DeveloperAgent',
      eventType: 'FILE_MUTATED',
      payload: { file: 'packages/sdk/src/subscriber-collaboration.ts' },
      timestamp: Date.now(),
    });

    if (responses.length === 0 || responses[0]!.status !== 'ACTION_TAKEN') {
      throw new Error(`Broadcast failed: ${JSON.stringify(responses)}`);
    }

    console.log(`   └─ Mesh Broadcast Success! ${responses.length} agent responded with ACTION_TAKEN.`);
  });

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runAllTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
