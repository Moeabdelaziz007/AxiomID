/**
 * W3C DID Document types for did:agent method.
 * @see https://www.w3.org/TR/did-core/
 */

export interface DIDDocument {
  "@context": string[];
  id: string;
  controller: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  assertionMethod: string[];
  capabilityInvocation: string[];
  capabilityDelegation: string[];
  service: AgentService[];
}

export interface VerificationMethod {
  id: string;
  type: "EcdsaSecp256k1VerificationKey2019" | "Ed25519VerificationKey2020";
  controller: string;
  publicKeyMultibase?: string;
  publicKeyJwk?: Record<string, string>;
}

export interface ServiceEndpoint {
  uri: string;
  accept?: string[];
  routingKeys?: string[];
}

export interface AgentService {
  id: string;
  type: "AgentMCPServer" | "SkillRegistry" | "ACPCommerce" | "AgentMemory" | "AgentInbox";
  serviceEndpoint: string | ServiceEndpoint;
}

export interface DIDResolutionResult {
  didResolutionMetadata: {
    contentType?: string;
    error?: string;
  };
  didDocument: DIDDocument | null;
  didDocumentMetadata: {
    created?: string;
    updated?: string;
    deactivated?: boolean;
  };
}

export interface DIDCreateInput {
  controller: string;
  publicKey: string;
  keyType?: "EcdsaSecp256k1VerificationKey2019" | "Ed25519VerificationKey2020";
  services?: Partial<AgentService>[];
}

export interface DIDUpdateInput {
  did: string;
  addServices?: Partial<AgentService>[];
  removeServiceIds?: string[];
  addVerificationMethods?: VerificationMethod[];
  removeVerificationMethodIds?: string[];
}
