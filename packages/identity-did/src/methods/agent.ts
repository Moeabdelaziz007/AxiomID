/**
 * did:agent method implementation.
 * Portability + KYC-linkage for AI agents.
 */
import type {
  DIDDocument,
  DIDCreateInput,
  DIDUpdateInput,
  DIDResolutionResult,
  VerificationMethod,
  AgentService,
} from "../types.js";

const DID_PREFIX = "did:agent:";

export class AgentDIDMethod {
  private readonly store: Map<string, DIDDocument> = new Map();

  async create(input: DIDCreateInput): Promise<{ did: string; document: DIDDocument }> {
    const did = this.generateDID(input.publicKey);
    const keyId = `${did}#keys-1`;

    const vm: VerificationMethod = {
      id: keyId,
      type: input.keyType ?? "Ed25519VerificationKey2020",
      controller: input.controller,
      publicKeyMultibase: input.publicKey,
    };

    const services: AgentService[] = (input.services ?? []).map((s, i) => ({
      id: `${did}#${s.type?.toLowerCase() ?? `svc-${i}`}`,
      type: (s.type ?? "AgentMCPServer") as AgentService["type"],
      serviceEndpoint: s.serviceEndpoint ?? "",
    }));

    const document: DIDDocument = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/suites/ed25519-2020/v1",
        "https://pai.build/contexts/agent/v1",
      ],
      id: did,
      controller: input.controller,
      verificationMethod: [vm],
      authentication: [keyId],
      assertionMethod: [keyId],
      capabilityInvocation: [keyId],
      capabilityDelegation: [keyId],
      service: services,
    };

    this.store.set(did, document);
    return { did, document };
  }

  async resolve(did: string): Promise<DIDResolutionResult> {
    if (!did.startsWith(DID_PREFIX)) {
      return {
        didResolutionMetadata: { error: "invalidDid" },
        didDocument: null,
        didDocumentMetadata: {},
      };
    }
    const doc = this.store.get(did);
    if (!doc) {
      return {
        didResolutionMetadata: { error: "notFound" },
        didDocument: null,
        didDocumentMetadata: {},
      };
    }
    return {
      didResolutionMetadata: { contentType: "application/did+json" },
      didDocument: doc,
      didDocumentMetadata: {
        created: new Date().toISOString(),
      },
    };
  }

  async update(input: DIDUpdateInput): Promise<DIDDocument> {
    const doc = this.store.get(input.did);
    if (!doc) throw new Error(`DID not found: ${input.did}`);

    const updated: DIDDocument = { ...doc };
    if (input.addServices?.length) {
      const next: AgentService[] = [...doc.service];
      for (const s of input.addServices) {
        next.push({
          id: `${input.did}#${s.type?.toLowerCase() ?? `svc-${next.length}`}`,
          type: (s.type ?? "AgentMCPServer") as AgentService["type"],
          serviceEndpoint: s.serviceEndpoint ?? "",
        });
      }
      updated.service = next;
    }
    if (input.removeServiceIds?.length) {
      updated.service = doc.service.filter((s) => !input.removeServiceIds!.includes(s.id));
    }
    if (input.addVerificationMethods?.length) {
      updated.verificationMethod = [...doc.verificationMethod, ...input.addVerificationMethods];
    }
    if (input.removeVerificationMethodIds?.length) {
      updated.verificationMethod = doc.verificationMethod.filter(
        (v) => !input.removeVerificationMethodIds!.includes(v.id),
      );
    }

    this.store.set(input.did, updated);
    return updated;
  }

  async deactivate(did: string): Promise<void> {
    this.store.delete(did);
  }

  private generateDID(publicKey: string): string {
    const hash = publicKey.slice(0, 42);
    return `${DID_PREFIX}${hash}`;
  }
}

const defaultMethod = new AgentDIDMethod();

export async function createDID(input: DIDCreateInput): Promise<{ did: string; document: DIDDocument }> {
  return defaultMethod.create(input);
}

export async function resolveDID(did: string): Promise<DIDResolutionResult> {
  return defaultMethod.resolve(did);
}

export async function updateDID(input: DIDUpdateInput): Promise<DIDDocument> {
  return defaultMethod.update(input);
}

export async function deactivateDID(did: string): Promise<void> {
  return defaultMethod.deactivate(did);
}
