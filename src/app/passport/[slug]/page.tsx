import { AgentPassport } from "@/components/AgentPassport";
import { AgentQR } from "@/components/AgentQR";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

interface PassportPageProps {
  params: Promise<{ slug: string }>;
}

async function getAgentData(slug: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { piUsername: slug },
        { walletAddress: `pi:${slug}` },
        { id: slug },
      ],
    },
    include: {
      agent: true,
    },
  });

  if (!user) {
    return {
      username: slug,
      walletAddress: `pi:${slug}`,
      stellarAddress: null,
      tier: "Visitor" as const,
      trustScore: 0,
      kyaStatus: "pending" as const,
      kycStatus: "pending" as const,
      issuedDate: new Date().toISOString(),
      did: `did:axiom:axiomid.app:${slug}`,
      xp: 0,
    };
  }

  // Map database KYCStatus enum to AgentPassport statuses
  const kycStatusMap: Record<string, "pending" | "verified" | "failed" | "none"> = {
    VERIFIED: "verified",
    REJECTED: "failed",
    NONE: "none",
  };
  const mappedKyc = kycStatusMap[user.kycStatus] ?? "pending";

  return {
    username: user.piUsername || slug,

    stellarAddress: user.agent?.publicKey || null,
    tier: (user.tier as any) || "Visitor",
    trustScore: Math.min(100, Math.floor((user.xp || 0) / 10)),
    kyaStatus: "verified" as const,
    kycStatus: mappedKyc,
    issuedDate: user.createdAt.toISOString(),
    did: user.did || `did:axiom:axiomid.app:${slug}`,
    xp: user.xp,
  };
}

export default async function PassportPage({ params }: PassportPageProps) {
  const { slug } = await params;
  const agent = await getAgentData(slug);

  return (
    <main className="min-h-screen bg-grid flex flex-col items-center">
      <div className="scanline" />

      {/* Header */}
      <header className="w-full border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-neon-green/20 flex items-center justify-center border border-neon-green/50">
              <span className="text-neon-green font-bold text-[8px]">A</span>
            </div>
            <span className="font-mono text-sm tracking-tighter text-white">
              AXIOM<span className="text-gray-600">ID</span>
            </span>
          </Link>
          <span className="text-[10px] font-mono text-gray-500">AGENT PASSPORT</span>
        </div>
      </header>

      {/* Passport Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl w-full">
        <AgentPassport
          username={agent.username}
          walletAddress={agent.walletAddress}
          stellarAddress={agent.stellarAddress}
          tier={agent.tier}
          trustScore={agent.trustScore}
          kyaStatus={agent.kyaStatus}
          kycStatus={agent.kycStatus}
          issuedDate={agent.issuedDate}
          did={agent.did}
          xp={agent.xp}
        />

        {/* QR Code */}
        <div className="mt-8">
          <AgentQR did={agent.did} walletAddress={agent.walletAddress} />
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 mb-4">
            This passport is verified by AxiomID Protocol
          </p>
          <Link href="/" className="btn-primary text-xs">
            CREATE YOUR PASSPORT
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-4 px-6 text-[9px] font-mono text-gray-600 text-center">
        &copy; 2026 AxiomID. Agent Identity Protocol.
      </footer>
    </main>
  );
}
