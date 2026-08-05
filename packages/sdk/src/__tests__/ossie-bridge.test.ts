import { OssieBridge, OssieSemanticModel } from '../ossie-bridge.js';

console.log('================================================================');
console.log('🏛️ TESTING APACHE OSSIE SEMANTIC MODEL BRIDGE FOR AXIOMID');
console.log('================================================================\n');

const bridge = new OssieBridge();
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

// TEST 1: Bridge Apache OSSIE Sales Analytics Semantic Model
const sampleOssieModel: OssieSemanticModel = {
  name: 'sales_analytics',
  description: 'Sales and customer analytics model for AI agents',
  ai_context: {
    instructions: 'Use this model for sales analysis and customer insights',
    domain: 'ecommerce_finance',
    kya_attestation_required: true,
    iqra_conscience_policy: 'Do not expose raw PII during aggregations',
  },
  datasets: [
    {
      name: 'fact_orders',
      source: 'database.analytics.fact_orders',
      primary_key: ['order_id'],
      fields: [
        { name: 'order_id', type: 'string', description: 'Unique order identifier' },
        { name: 'amount', type: 'numeric', description: 'Order total amount USD' },
      ],
    },
    {
      name: 'dim_customers',
      source: 'database.analytics.dim_customers',
      primary_key: ['customer_id'],
    },
  ],
  metrics: [
    {
      name: 'total_revenue',
      description: 'Sum of order amounts',
      expression: 'SUM(fact_orders.amount)',
      dialect: 'ANSI_SQL',
    },
  ],
  custom_extensions: [
    {
      vendor_name: 'AxiomID',
      data: '{"agent_trust_level": 3, "did_required": true}',
    },
  ],
};

const res = bridge.validateAndBridge(sampleOssieModel);
assert(res.valid, `Apache OSSIE Model successfully validated (Model: ${res.modelName})`);
assert(res.datasetCount === 2, `Datasets count verified: ${res.datasetCount}`);
assert(res.metricCount === 1, `Metrics count verified: ${res.metricCount}`);
assert(res.agentCapabilityDescriptor.protocol === 'apache-ossie-v0.2.0', `Protocol version verified: ${res.agentCapabilityDescriptor.protocol}`);

console.log('\n================================================================');
console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) process.exit(1);
