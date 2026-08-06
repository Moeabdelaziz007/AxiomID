export interface IntentMatch {
  capability: string;
  route: string;
  verb: string;
}

interface CapabilityDef {
  capability: string;
  route: string;
  verbs: string[];
  arVerbs: string[];
}

const CAPABILITIES: CapabilityDef[] = [
  {
    capability: "identity",
    route: "/claim",
    verbs: ["claim", "identity", "passport", "id", "register", "sign up", "join", "onboard"],
    arVerbs: ["طالب", "هوية", "هويتي", "جواز", "تسجيل", "انضم"],
  },
  {
    capability: "agent",
    route: "/dashboard",
    verbs: ["deploy", "agent", "build", "create agent", "automation", "bot"],
    arVerbs: ["عميل", "نشر", "وكيل", "أنشئ"],
  },
  {
    capability: "economy",
    route: "/claim",
    verbs: ["pay", "payment", "pi", "buy", "activate", "spend", "earn", "xp"],
    arVerbs: ["دفع", "ادفع", "شراء", "أربح", "اكسب"],
  },
  {
    capability: "explore",
    route: "/explorer",
    verbs: ["explore", "network", "nodes", "registry", "agents", "scry", "discover"],
    arVerbs: ["استكشف", "شبكة", "سجل", "اكتشف"],
  },
  {
    capability: "status",
    route: "/status",
    verbs: ["status", "health", "uptime", "stats", "statistics", "alive"],
    arVerbs: ["حالة", "صحة", "إحصائيات"],
  },
  {
    capability: "docs",
    route: "/docs",
    verbs: ["docs", "documentation", "help", "learn", "guide", "tutorial", "how to"],
    arVerbs: ["توثيق", "مساعدة", "تعلم", "دليل"],
  },
];

/**
 * Compile a free-text intent into a capability match.
 * Deterministic keyword classifier — no LLM dependency, no network.
 * Returns null when unmapped (rendered honestly as [intent:unmapped]).
 */
export function compileIntent(input: string): IntentMatch | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;

  for (const cap of CAPABILITIES) {
    const en = cap.verbs.find((v) => new RegExp(`\\b${v}\\b`).test(q));
    if (en) return { capability: cap.capability, route: cap.route, verb: en };
    const ar = cap.arVerbs.find((v) => q.includes(v));
    if (ar) return { capability: cap.capability, route: cap.route, verb: ar };
  }
  return null;
}
