/**
 * Apache OSSIE (Open Source Signal Processing / Semantic Model) Bridge for AxiomID
 * Bridges Apache OSSIE v0.2.0 Semantic Metadata Models with OpenIdentity & KYA Agent Capabilities
 */

export interface OssieDataset {
  name: string;
  source: string;
  primary_key?: string[];
  unique_keys?: string[][];
  description?: string;
  ai_context?: { instructions?: string; synonyms?: Record<string, string> };
  fields?: { name: string; type: string; description?: string }[];
}

export interface OssieMetric {
  name: string;
  description?: string;
  expression: string;
  dialect?: 'ANSI_SQL' | 'SNOWFLAKE' | 'BIGQUERY' | 'DATABRICKS' | 'MAQL' | 'MDX';
}

export interface OssieSemanticModel {
  name: string;
  description?: string;
  ai_context?: {
    instructions?: string;
    domain?: string;
    kya_attestation_required?: boolean;
    iqra_conscience_policy?: string;
  };
  datasets: OssieDataset[];
  relationships?: { name: string; from: string; to: string; type: '1:1' | '1:N' | 'N:M' }[];
  metrics?: OssieMetric[];
  custom_extensions?: { vendor_name: string; data: string }[];
}

export interface OssieBridgeResult {
  valid: boolean;
  modelName: string;
  datasetCount: number;
  metricCount: number;
  agentCapabilityDescriptor: {
    type: 'semantic_model';
    name: string;
    protocol: 'apache-ossie-v0.2.0';
    aiContext: Record<string, any>;
  };
}

export class OssieBridge {
  /**
   * Validates an Apache OSSIE Semantic Model and bridges it into AxiomID Agent Capabilities
   */
  public validateAndBridge(model: OssieSemanticModel): OssieBridgeResult {
    if (!model || !model.name || typeof model.name !== 'string') {
      throw new Error("Invalid Apache OSSIE Semantic Model: Missing required 'name' field.");
    }
    if (!model.datasets || !Array.isArray(model.datasets)) {
      throw new Error("Invalid Apache OSSIE Semantic Model: Missing required 'datasets' array.");
    }

    const aiContext = model.ai_context ?? {};
    
    return {
      valid: true,
      modelName: model.name,
      datasetCount: model.datasets.length,
      metricCount: model.metrics ? model.metrics.length : 0,
      agentCapabilityDescriptor: {
        type: 'semantic_model',
        name: model.name,
        protocol: 'apache-ossie-v0.2.0',
        aiContext,
      },
    };
  }
}
