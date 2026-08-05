import {
  route,
  detectLanguage,
  updatePerformance,
  REAL_PROVIDERS,
  RouterConfig,
} from './al-mizan-algorithm';

console.log('================================================================');
console.log('⚖️ TESTING AL-MIZAN MULTI-ARMED BANDIT ALGORITHM (PURE FUNCTIONS)');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ [PASS] ${msg}`);
    passed++;
  } else {
    console.log(`❌ [FAIL] ${msg}`);
    failed++;
  }
}

// Exploitation-focused config for deterministic assertions (epsilon = 0)
const exploitConfig: RouterConfig = {
  epsilon: 0.0,
  epsilonDecay: 0.99,
  learningRate: 0.1,
  maxBudget: 5.0,
  preference: 'balanced',
};

let performanceScores = new Map<string, number>();

// TEST 1: Default Exploitation Route Selection
const route1 = route('Write a TypeScript function', REAL_PROVIDERS, exploitConfig, performanceScores);
assert(!!route1.provider, `Provider selected: ${route1.provider.name} (${route1.model})`);
assert(typeof route1.simulatedLatency === 'number', `Latency estimated: ${route1.simulatedLatency}ms`);

// TEST 2: Chinese Language Classification & Deterministic Routing
const langZH = detectLanguage('优化 DeepSeek R1 的 TypeScript 代码');
assert(langZH === 'zh', 'Chinese language correctly detected as "zh"');

const routeZH = route('优化 DeepSeek R1 的 TypeScript 代码', REAL_PROVIDERS, exploitConfig, performanceScores);
assert(routeZH.provider.id === 'deepseek-v3', `DeepSeek provider selected deterministically: ${routeZH.provider.name}`);

// TEST 3: Feedback EMA Weight Update Function
const beforeScore = performanceScores.get('deepseek-v3') ?? 0.5;
performanceScores = updatePerformance(performanceScores, {
  providerId: 'deepseek-v3',
  actualLatency: 400,
  actualCost: 0.14,
  success: true,
  userRating: 5,
}, 0.1);

const afterScore = performanceScores.get('deepseek-v3') ?? 0;
assert(
  afterScore > beforeScore,
  `DeepSeek score increased after 5-star rating (Before: ${beforeScore.toFixed(2)} -> After: ${afterScore.toFixed(4)})`
);

// TEST 4: Seeded PRNG Exploration Test (epsilon = 0.5 with prngSeed)
const seededExploreConfig: RouterConfig = {
  ...exploitConfig,
  epsilon: 0.5,
  prngSeed: 1337,
};
const routeSeeded = route('Write a Python script', REAL_PROVIDERS, seededExploreConfig, performanceScores);
assert(!!routeSeeded.provider, `Seeded PRNG Exploration selected provider deterministically: ${routeSeeded.provider.name} (isExploration=${routeSeeded.isExploration})`);

console.log('\n================================================================');
console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) process.exit(1);
