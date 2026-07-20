/**
 * @pai/identity-did — W3C DID method for agents
 * Implements did:agent method. Part of PAI Identity Primitive.
 */

export type {
  DIDDocument,
  VerificationMethod,
  ServiceEndpoint,
  DIDResolutionResult,
  DIDCreateInput,
  DIDUpdateInput,
} from "./types.js";

export {
  createDID,
  resolveDID,
  updateDID,
  deactivateDID,
} from "./methods/agent.js";

export { AgentDIDMethod } from "./methods/agent.js";
