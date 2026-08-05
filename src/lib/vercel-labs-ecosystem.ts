// VERCEL-LABS ECOSYSTEM MAP — Strategic Index for PAI
// Generated from comprehensive analysis of all vercel-labs repos

export const VERCEL_LABS_ECOSYSTEM = {
  // ============================================
  // INFRASTRUCTURE LAYER (Foundation)
  // ============================================
  infrastructure: {
    critical: [
      {
        name: "native",
        stars: 6600,
        description: "Native desktop apps toolkit (Tauri-like)",
        paiValue: "PAI Control Plane desktop app",
        repo: "https://github.com/vercel-labs/native",
        category: "desktop-apps",
        technologies: ["rust", "tauri", "typescript"],
      },
      {
        name: "portless",
        stars: 10200,
        description: "Named local URLs instead of ports",
        paiValue: "Agent-to-agent networking",
        repo: "https://github.com/vercel-labs/portless",
        category: "networking",
      },
      {
        name: "agent-browser",
        stars: 38700,
        description: "Browser automation for AI agents (Playwright)",
        paiValue: "PAI browser automation skill",
        repo: "https://github.com/vercel-labs/agent-browser",
        category: "automation",
      },
      {
        name: "phase",
        stars: 0,
        description: "Secrets/environment management",
        paiValue: "PAI secrets/config management",
        repo: "https://github.com/vercel-labs/phase",
        category: "secrets",
      },
      {
        name: "open-plugin-spec",
        stars: 44,
        description: "Agent Plugin Spec v1.0.0 - Minimal standard for packaging agent extensions",
        paiValue: "PAI Skill ABI reference - PRIMARY REFERENCE",
        repo: "https://github.com/vercel-labs/open-plugin-spec",
        category: "standards",
        specUrl: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
      },
      {
        name: "skills",
        stars: 26500,
        description: "Official skills tool - npx skills",
        paiValue: "PAI Skills CLI model",
        repo: "https://github.com/vercel-labs/skills",
        category: "skills-cli",
      },
      {
        name: "agent-skills",
        stars: 29200,
        description: "Skills catalog (npm for agents) - Official skill collection",
        paiValue: "PAI Skills Registry architecture model",
        repo: "https://github.com/vercel-labs/agent-skills",
        category: "skills-registry",
      },
    ],
    high: [
      {
        name: "ai-sdk",
        stars: 0,
        description: "Vercel AI SDK for LLM integration",
        paiValue: "LLM integration patterns",
        repo: "https://github.com/vercel/ai",
        category: "llm-sdk",
      },
      {
        name: "ai-gateway-provider-php",
        stars: 0,
        description: "PHP provider for AI Gateway",
        paiValue: "Multi-language provider pattern",
        repo: "https://github.com/vercel-labs/ai-gateway-provider-php",
        category: "providers",
      },
      {
        name: "ai-gateway-embeddings-demo",
        stars: 0,
        description: "Embeddings via AI Gateway",
        paiValue: "Vector search for skills",
        repo: "https://github.com/vercel-labs/ai-gateway-embeddings-demo",
        category: "embeddings",
      },
    ],
  },

  // ============================================
  // AGENT FRAMEWORKS & TEMPLATES
  // ============================================
  agentFrameworks: {
    frameworks: [
      {
        name: "agent-skills",
        stars: 29200,
        description: "Skills catalog (npm for agents)",
        paiValue: "Primary reference for PAI Skills Registry",
        repo: "https://github.com/vercel-labs/agent-skills",
        category: "skills-catalog",
      },
      {
        name: "open-plugin-spec",
        stars: 44,
        description: "Agent Plugin Spec v1.0.0 - Minimal standard for packaging agent extensions",
        paiValue: "Direct model for PaiSkill ABI - THE REFERENCE",
        repo: "https://github.com/vercel-labs/open-plugin-spec",
        category: "standards",
      },
      {
        name: "agent-browser",
        stars: 38700,
        description: "Browser automation for AI agents via Playwright",
        paiValue: "PAI browser automation skill (pai-browser)",
        repo: "https://github.com/vercel-labs/agent-browser",
        category: "automation",
      },
      {
        name: "tau-agent",
        stars: 0,
        description: "Agent framework",
        paiValue: "Agent runtime patterns for PAI Core",
        repo: "https://github.com/vercel-labs/tau-agent",
        category: "runtime",
      },
      {
        name: "steve",
        stars: 0,
        description: "AI assistant framework",
        paiValue: "PAI Control Plane assistant patterns",
        repo: "https://github.com/vercel-labs/steve",
        category: "assistant",
      },
      {
        name: "email-agent",
        stars: 0,
        description: "Email automation agent",
        paiValue: "Communication skill template (pai-email)",
        repo: "https://github.com/vercel-labs/email-agent",
        category: "communication",
      },
      {
        name: "bike-shop-agent",
        stars: 0,
        description: "E-commerce agent template",
        paiValue: "Commerce skill pattern (pai-commerce)",
        repo: "https://github.com/vercel-labs/bike-shop-agent",
        category: "commerce",
      },
      {
        name: "academy-skills",
        stars: 0,
        description: "Educational skills",
        paiValue: "Onboarding/tutorial skill patterns",
        repo: "https://github.com/vercel-labs/academy-skills",
        category: "education",
      },
      {
        name: "personal-agent-template",
        stars: 0,
        description: "Personal agent starter template",
        paiValue: "Agent scaffolding for `pai create`",
        repo: "https://github.com/vercel-labs/personal-agent-template",
        category: "templates",
      },
      {
        name: "agent-eval",
        stars: 0,
        description: "Agent evaluation framework",
        paiValue: "Skill testing/benchmarking harness",
        repo: "https://github.com/vercel-labs/agent-eval",
        category: "testing",
      },
    ],
  },

  // ============================================
  // DEVELOPER TOOLS & INFRASTRUCTURE
  // ============================================
  devTools: {
    tools: [
      {
        name: "phase",
        stars: 0,
        description: "Secrets/environment management",
        paiValue: "PAI config/secrets management",
        repo: "https://github.com/vercel-labs/phase",
        category: "secrets",
      },
      {
        name: "portless",
        stars: 10200,
        description: "Named local URLs instead of ports",
        paiValue: "Agent-to-agent networking (pai:// URLs)",
        repo: "https://github.com/vercel-labs/portless",
        category: "networking",
      },
      {
        name: "just-bash",
        stars: 0,
        description: "Bash tool for agents",
        paiValue: "Shell skill implementation",
        repo: "https://github.com/vercel-labs/just-bash",
        category: "shell",
      },
      {
        name: "bash-tool",
        stars: 0,
        description: "Shell execution tool",
        paiValue: "Shell skill implementation",
        repo: "https://github.com/vercel-labs/bash-tool",
        category: "shell",
      },
      {
        name: "slack-bolt",
        stars: 0,
        description: "Slack integration framework",
        paiValue: "Communication skill patterns",
        repo: "https://github.com/vercel-labs/slack-bolt",
        category: "communication",
      },
      {
        name: "slack-agent-skill",
        stars: 0,
        description: "Slack agent skill",
        paiValue: "Communication skill template (pai-slack)",
        repo: "https://github.com/vercel-labs/slack-agent-skill",
        category: "skills",
      },
      {
        name: "github-tools",
        stars: 0,
        description: "GitHub API tools",
        paiValue: "DevOps skills (pai-github)",
        repo: "https://github.com/vercel-labs/github-tools",
        category: "devops",
      },
      {
        name: "agent-cli",
        stars: 0,
        description: "CLI for agents",
        paiValue: "`pai` CLI patterns",
        repo: "https://github.com/vercel-labs/agent-cli",
        category: "cli",
      },
      {
        name: "ai-cli",
        stars: 0,
        description: "AI-powered CLI",
        paiValue: "CLI patterns for PAI",
        repo: "https://github.com/vercel-labs/ai-cli",
        category: "cli",
      },
      {
        name: "deepsec",
        stars: 0,
        description: "Security scanning",
        paiValue: "Skill security audit (pai-security)",
        repo: "https://github.com/vercel-labs/deepsec",
        category: "security",
      },
      {
        name: "mcp",
        stars: 0,
        description: "MCP server implementations",
        paiValue: "PAI MCP server patterns",
        repo: "https://github.com/vercel-labs/mcp",
        category: "mcp",
      },
    ],
  },

  // ============================================
  // SKILLS & PLUGINS ECOSYSTEM
  // ============================================
  skills: {
    skills: [
      {
        name: "skills",
        stars: 26500,
        description: "Official skills tool - npx skills",
        paiValue: "PAI Skills CLI model (`pai skills install`)",
        repo: "https://github.com/vercel-labs/skills",
        category: "skills-cli",
      },
      {
        name: "agent-skills",
        stars: 29200,
        description: "Skills catalog (npm for agents) - Official skill collection",
        paiValue: "PAI Skills Registry architecture model",
        repo: "https://github.com/vercel-labs/agent-skills",
        category: "skills-registry",
      },
      {
        name: "open-plugin-spec",
        stars: 44,
        description: "Agent Plugin Spec v1.0.0",
        paiValue: "Direct model for PaiSkill ABI - THE REFERENCE",
        repo: "https://github.com/vercel-labs/open-plugin-spec",
        category: "standards",
      },
      {
        name: "agent-skills",
        stars: 29200,
        description: "Skills catalog (npm for agents)",
        paiValue: "PAI Skills Registry architecture",
        repo: "https://github.com/vercel-labs/agent-skills",
        category: "skills-catalog",
      },
      {
        name: "agent-browser",
        stars: 38700,
        description: "Browser automation for AI agents",
        paiValue: "Browser automation skill (pai-browser)",
        repo: "https://github.com/vercel-labs/agent-browser",
        category: "automation",
      },
      {
        name: "academy-skills",
        stars: 0,
        description: "Educational skills",
        paiValue: "Onboarding/tutorial skill patterns",
        repo: "https://github.com/vercel-labs/academy-skills",
        category: "education",
      },
      {
        name: "email-agent",
        stars: 0,
        description: "Email automation agent",
        paiValue: "Communication skill template (pai-email)",
        repo: "https://github.com/vercel-labs/email-agent",
        category: "skills",
      },
      {
        name: "bike-shop-agent",
        stars: 0,
        description: "E-commerce agent template",
        paiValue: "Commerce skill pattern (pai-commerce)",
        repo: "https://github.com/vercel-labs/bike-shop-agent",
        category: "commerce",
      },
    ],
  },

  // ============================================
  // DATABASE & CLOUD SKILLS NEEDED
  // ============================================
  databaseSkills: {
    categories: {
      supabase: {
        name: "Supabase",
        skills: [
          "pai-supabase-db", "pai-supabase-auth", "pai-supabase-realtime",
          "pai-supabase-storage", "pai-supabase-edge-functions", "pai-supabase-pgvector"
        ],
        description: "Postgres, Auth, Realtime, Storage, Edge Functions, Vector",
      },
      cloudflare: {
        name: "Cloudflare",
        skills: [
          "pai-cf-d1", "pai-cf-kv", "pai-cf-r2", "pai-cf-durable-objects",
          "pai-cf-workers-ai", "pai-cf-vectorize", "pai-cf-queues",
          "pai-cf-hyperdrive", "pai-cf-images", "pai-cf-stream"
        ],
        description: "D1 SQL, KV, R2, Durable Objects, Workers AI, Vectorize, Queues",
      },
      vercel: {
        name: "Vercel",
        skills: [
          "pai-vercel-postgres", "pai-vercel-kv", "pai-vercel-blob",
          "pai-vercel-edge-functions", "pai-vercel-cron", "pai-vercel-flags"
        ],
        description: "Postgres, KV, Blob, Edge Functions, Cron, Feature Flags",
      },
      neon: {
        name: "Neon",
        skills: ["pai-neon-db", "pai-neon-branching", "pai-neon-autoscaling"],
        description: "Serverless Postgres with branching",
      },
      upstash: {
        name: "Upstash",
        skills: ["pai-upstash-redis", "pai-upstash-kafka", "pai-upstash-vector", "pai-upstash-qstash"],
        description: "Serverless Redis, Kafka, Vector Search, QStash",
      },
      planetscale: {
        name: "PlanetScale",
        skills: ["pai-planetscale-db", "pai-planetscale-branching"],
        description: "MySQL scaling with branching",
      },
      turso: {
        name: "Turso",
        skills: ["pai-turso-db", "pai-turso-replication"],
        description: "SQLite at the edge with replication",
      },
      xata: {
        name: "Xata",
        skills: ["pai-xata-db", "pai-xata-search", "pai-xata-analytics"],
        description: "Serverless DB + Search + Analytics",
      },
      mongodb: {
        name: "MongoDB Atlas",
        skills: ["pai-mongodb-db", "pai-mongodb-vector", "pai-mongodb-search"],
        description: "Document DB + Vector Search + Full-text Search",
      },
      redis: {
        name: "Redis",
        skills: ["pai-redis-cache", "pai-redis-pubsub", "pai-redis-streams"],
        description: "Cache, Pub/Sub, Streams",
      },
    },
  },

  // ============================================
  // RATATUI / TUI ECOSYSTEM
  // ============================================
  ratatuiEcosystem: {
    core: [
      {
        name: "ratatui",
        stars: 22000,
        repo: "https://github.com/ratatui/ratatui",
        description: "Core TUI framework - A Rust crate for cooking up terminal user interfaces",
        paiValue: "PAI CLI TUI foundation",
        category: "tui-core",
      },
      {
        name: "tui-widgets",
        stars: 221,
        repo: "https://github.com/ratatui/tui-widgets",
        description: "Collection of useful widgets for building terminal user interfaces",
        paiValue: "PAI CLI widgets library",
        category: "widgets",
      },
      {
        name: "tachyonfx",
        stars: 1300,
        repo: "https://github.com/ratatui/tachyonfx",
        description: "Effects and animation library for Ratatui applications",
        paiValue: "CLI animations and transitions",
        category: "effects",
      },
      {
        name: "ratzilla",
        stars: 1400,
        repo: "https://github.com/ratatui/ratzilla",
        description: "Build terminal-themed web applications with Rust and WebAssembly",
        paiValue: "Web-based CLI (WASM)",
        category: "wasm",
      },
      {
        name: "ratatui-image",
        stars: 370,
        repo: "https://github.com/ratatui/ratatui-image",
        description: "Ratatui widget for rendering image graphics in terminals",
        paiValue: "CLI image display for agent outputs",
        category: "graphics",
      },
      {
        name: "ratatui-textarea",
        stars: 0,
        repo: "https://github.com/ratatui/ratatui-textarea",
        description: "Textarea widget for Ratatui",
        paiValue: "CLI text input",
        category: "input",
      },
    ],
    labs: [
      {
        name: "ratatui-labs",
        stars: 0,
        repo: "https://github.com/ratatui/ratatui-labs",
        description: "Experimental Ratatui crates and prototypes",
        paiValue: "Cutting-edge TUI experiments",
        category: "experimental",
      },
      {
        name: "bevy_ratatui",
        stars: 157,
        repo: "https://github.com/ratatui/bevy_ratatui",
        description: "Bevy integration for Ratatui",
        paiValue: "Game-like CLI interfaces",
        category: "gamedev",
      },
      {
        name: "ratatui-image",
        stars: 370,
        repo: "https://github.com/ratatui/ratatui-image",
        description: "Image rendering in terminals (kitty, sixel, iterm2)",
        paiValue: "Rich media in CLI",
        category: "graphics",
      },
      {
        name: "templates",
        stars: 414,
        repo: "https://github.com/ratatui/templates",
        description: "Templates for bootstrapping a Rust TUI application with Ratatui",
        paiValue: "CLI scaffolding templates",
        category: "templates",
      },
      {
        name: "ratzilla",
        stars: 1400,
        repo: "https://github.com/ratatui/ratzilla",
        description: "Build terminal-themed web applications with Rust and WebAssembly",
        paiValue: "TUI in browser via WASM",
        category: "wasm",
      },
      {
        name: "tachyonfx",
        stars: 1300,
        repo: "https://github.com/ratatui/tachyonfx",
        description: "Effects and animation library for Ratatui applications",
        paiValue: "Smooth CLI animations",
        category: "effects",
      },
    ],
  },

  // ============================================
  // SPECUI PATTERNS
  // ============================================
  specui: {
    repo: "https://github.com/specui/specui",
    stars: 458,
    description: "Generate code with specs - YAML/JSON → Code for any language/framework",
    paiValue: "PAI Spec Generator - YAML/JSON spec → Multi-language skill code",
    patterns: {
      specDriven: "Write specs in YAML/JSON → Generate code for any language",
      multiLanguage: "Generate for JS/TS, Go, Rust, Python, Zig, PHP, Java, Ruby, etc.",
      multiFramework: "Next.js, Astro, Vue, React, Angular, Gorm, Django, etc.",
      continuousGeneration: "Seamlessly update files when specs change",
      cli: "npx @specui/cli new / generate",
      vscodeExtension: "Marketplace extension available",
    },
    paiApplication: {
      specFormat: "PAISpec - YAML/JSON → PaiSkill implementation in 6+ languages",
      generator: "PAISpecGenerator class - generates Rust, Go, TS, Python, Zig, PHP",
      targets: ["rust", "go", "javascript", "python", "zig", "php", "java", "ruby"],
    },
  },

  // ============================================
  // THREE.WS PATTERNS (3D AGENTS)
  // ============================================
  threeWS: {
    repo: "https://github.com/nirholas/three.ws",
    stars: 85,
    description: "Open-source 3D AI agent framework — GLB/glTF avatars with LLM brains, memory, emotions, autonomous payments",
    paiValue: "PAI 3D Skills - Interactive 3D avatars for skills",
    patterns: {
      avatarSystem: "GLB/glTF models with animations (idle, talk, verify, success, warning)",
      brain: "LLM integration with tools (pi-kyc, pi-pay, trust-check)",
      emotions: ["neutral", "thinking", "success", "warning", "error"],
      payments: "x402 + Solana/EVM + ACP integration",
      mcpServer: "MCP server for agent communication",
      characterStudio: "Visual avatar builder",
      animationGallery: "Pre-built animations",
      oauth21: "OAuth 2.1 for agent authentication",
      webComponent: "Embed anywhere as `<pai-verify-3d></pai-verify-3d>`",
    },
    paiApplication: {
      skillManifest: "PAI3DSkillManifest - extends PaiSkill with avatar, brain, commerce",
      specGenerator: "PAISpecGenerator - generates 3D skill code for 6 languages",
      registry: "PAI3DSkillRegistry - search, install, execute 3D skills",
      embed: "PAI3DEmbed - `<pai-verify-3d></pai-verify-3d>` web component",
    },
  },

  // ============================================
  // THREE KEY PATTERNS FOR PAI
  // ============================================
  keyPatterns: {
    pattern1: {
      name: "Open Plugin Spec → PaiSkill ABI",
      source: "vercel-labs/open-plugin-spec",
      target: "PaiSkill interface (50 lines, frozen)",
      mapping: {
        pluginJson: "PaiSkill manifest",
        skillDefinition: "execute + validateInput + metadata",
        schema: "Zod validation schemas",
      },
    },
    pattern2: {
      name: "Skills CLI → PAI Skills CLI",
      source: "vercel-labs/skills + agent-skills",
      target: "pai skills install/search/publish/init",
      commands: ["install", "search", "publish", "init", "list", "info", "uninstall"],
    },
    pattern3: {
      name: "Agent Skills Catalog → PAI Skills Registry",
      source: "vercel-labs/agent-skills (29k stars)",
      target: "skills.pai.build (search, install, publish, revenue share)",
      features: ["search", "categories", "verified badges", "revenue split 90/10", "ACP integration"],
    },
    pattern4: {
      name: "Native (Tauri) → PAI Control Plane",
      source: "vercel-labs/native (6.6k stars)",
      target: "PAI Control Plane desktop app (LifeOS fork)",
      tech: ["rust", "tauri", "typescript", "tauri commands for pai skills"],
    },
    pattern5: {
      name: "Portless → PAI Agent Networking",
      source: "vercel-labs/portless (10k stars)",
      target: "pai:// protocol for agent discovery",
      concept: "Named URLs instead of ports: pai://verify-agent instead of localhost:3000",
    },
    pattern6: {
      name: "Agent Browser → PAI Browser Skill",
      source: "vercel-labs/agent-browser (38k stars)",
      target: "@pai/skill-browser (Playwright automation)",
      capabilities: ["goto", "click", "type", "screenshot", "skill execution", "Pi wallet connect"],
    },
    pattern7: {
      name: "SpecUI → PAI Spec Generator",
      source: "specui/specui (458 stars)",
      target: "PAISpecGenerator - YAML/JSON → 6 languages",
      languages: ["rust", "go", "typescript", "python", "zig", "php"],
      features: ["spec-driven", "multi-language", "multi-framework", "continuous generation"],
    },
    pattern8: {
      name: "Three.ws → PAI 3D Skills",
      source: "nirholas/three.ws (85 stars)",
      target: "PAI 3D Skills with avatars, emotions, payments",
      features: ["GLB/glTF avatars", "LLM brain", "emotions", "x402 payments", "MCP server", "web component embed"],
    },
    pattern9: {
      name: "LifeOS → PAI Control Plane",
      source: "danielmiessler/LifeOS (16.8k stars)",
      target: "PAI Control Plane (fork + Pi extensions)",
      features: ["TELOS interview", "ISA generation", "Skill system", "Hook system", "Pulse dashboard", "Memory compounds"],
    },
    pattern10: {
      name: "OSSIE → PAI Metadata Compression",
      source: "apache/ossie (SDR radio components)",
      target: "PAI Skill Manifest compression",
      pattern: "Descriptor → Compressed Binary → Runtime Discovery → Dynamic Composition",
    },
  },

  // ============================================
  // PAI SKILL CATEGORIES (Complete Taxonomy)
  // ============================================
  skillCategories: {
    identity: {
      name: "Identity & Verification",
      skills: ["pai-verify", "pai-did", "pai-trust", "pai-kyc", "pai-identity"],
      revenue: "Per-call ($0.02-0.05)",
      description: "KYC, DID management, TrustChain, reputation scoring",
    },
    payments: {
      name: "Payments & Commerce",
      skills: ["pai-pay", "pai-wallet", "pai-escrow", "pai-subscription", "pai-invoice"],
      revenue: "Per-call + volume %",
      description: "ACP payments, Pi/USDC, escrow, subscriptions, invoicing",
    },
    automation: {
      name: "Automation & Browser",
      skills: ["pai-browser", "pai-email", "pai-slack", "pai-github", "pai-webhook"],
      revenue: "Per-execution",
      description: "Browser automation, email, Slack, GitHub, webhooks",
    },
    data: {
      name: "Data & Databases",
      skills: [
        "pai-supabase-db", "pai-supabase-auth", "pai-supabase-realtime", "pai-supabase-storage",
        "pai-cf-d1", "pai-cf-kv", "pai-cf-r2", "pai-cf-durable-objects", "pai-cf-workers-ai",
        "pai-vercel-postgres", "pai-vercel-kv", "pai-vercel-blob", "pai-vercel-edge",
        "pai-neon-db", "pai-upstash-redis", "pai-upstash-vector", "pai-upstash-kafka",
        "pai-planetscale-db", "pai-turso-db", "pai-xata-db", "pai-mongodb-db"
      ],
      revenue: "Per-query/operation",
      description: "All major databases: Supabase, Cloudflare, Vercel, Neon, Upstash, PlanetScale, Turso, Xata, MongoDB",
    },
    ai_ml: {
      name: "AI/ML & Vector Search",
      skills: ["pai-embeddings", "pai-vector-search", "pai-rag", "pai-rerank", "pai-classify", "pai-summarize"],
      revenue: "Per-query",
      description: "Embeddings, vector search, RAG, reranking, classification, summarization",
    },
    commerce: {
      name: "Commerce & Marketplace",
      skills: ["pai-pay", "pai-escrow", "pai-subscription", "pai-marketplace", "pai-affiliate"],
      revenue: "% of volume + per-call",
      description: "ACP payments, escrow, subscriptions, marketplace, affiliate tracking",
    },
    developer: {
      name: "Developer Tools",
      skills: ["pai-github", "pai-deploy", "pai-test", "pai-debug", "pai-lint", "pai-typecheck", "pai-benchmark"],
      revenue: "Freemium + subscription",
      description: "GitHub integration, deployment, testing, debugging, linting, typechecking, benchmarking",
    },
    monitoring: {
      name: "Monitoring & Observability",
      skills: ["pai-monitor", "pai-logs", "pai-traces", "pai-metrics", "pai-alerts", "pai-profiling"],
      revenue: "Subscription + per-seat",
      description: "Logs, traces, metrics, alerts, profiling, dashboards",
    },
    security: {
      name: "Security & Compliance",
      skills: ["pai-security", "pai-audit", "pai-encryption", "pai-secrets", "pai-compliance", "pai-vuln-scan"],
      revenue: "Per-audit + subscription",
      description: "Security audits, encryption, secrets management, compliance, vulnerability scanning",
    },
    three_d: {
      name: "3D & Visual Skills",
      skills: ["pai-verify-3d", "pai-agent-3d", "pai-avatar-3d", "pai-3d-chat", "pai-3d-dashboard"],
      revenue: "Per-session",
      description: "GLB/glTF avatars, 3D chat, 3D dashboards, animated verifications",
    },
  },

  // ============================================
  // PAI REPO STRUCTURE
  // ============================================
  repoStructure: {
    org: "pai-list",
    repos: [
      { name: "atom", description: "THE ATOM - Immutable PaiSkill ABI (50 lines, frozen)", priority: 1 },
      { name: "skills", description: "Skills Registry monorepo (core, cli, server, registry, 50+ skills)", priority: 2 },
      { name: "agent-kit", description: "Agent Runtime (@pai/core, adapters, ACP client, test harness)", priority: 3 },
      { name: "cli", description: "Developer CLI (`pai create`, `pai deploy`, `pai skills`, `pai verify`)", priority: 4 },
      { name: "mcp", description: "MCP Server for any LLM to access Pi Network", priority: 5 },
      { name: "control-plane", description: "PAI Control Plane (LifeOS fork + Pi extensions)", priority: 6 },
      { name: "docs", description: "Documentation site (VitePress) - docs.pai.build", priority: 7 },
      { name: "pai-website", description: "Marketing site (pai.build) - Hero: 'PAI = BYE'", priority: 8 },
      { name: "pai-3d-skills", description: "3D Skills system (three.ws patterns)", priority: 9 },
      { name: "pai-atom-spec", description: "Open Plugin Spec v1.0.0 mirror + governance", priority: 10 },
    ],
  },

  // ============================================
  // IMMEDIATE EXECUTION ORDER
  // ============================================
  executionOrder: {
    week1: [
      "gh repo create pai-list/atom --public --push",
      "cd pai-atom && write atom.ts (50 lines frozen)",
      "gh repo create pai-list/pai-atom-spec --public --push",
      "mirror vercel-labs/open-plugin-spec schemas",
    ],
    week2: [
      "gh repo create pai-list/skills --public --push",
      "cd skills && pnpm init -w && mkdir packages/{core,cli,server,registry,skills}",
      "build 5 built-in skills: verify, trust, did, pay, wallet",
    ],
    week3: [
      "gh repo create pai-list/agent-kit --public --push",
      "gh repo create pai-list/cli --public --push",
      "gh repo create pai-list/mcp --public --push",
      "build agent runtime + CLI + MCP server",
    ],
    week4: [
      "gh repo fork danielmiessler/LifeOS --org pai-list --clone",
      "cd PAI && pnpm install && pnpm build",
      "gh repo create pai-list/pai-website --public --push",
      "deploy marketing site to Vercel",
    ],
    ongoing: [
      "Build 50+ skills across all categories",
      "Deploy skills API to Cloudflare Workers",
      "Deploy docs to GitHub Pages",
      "Launch hackathon with Pi Network + Virtuals",
      "PAI token design (governance + revenue share)",
    ],
  },
};

// Export for use in PAI website and tooling
export default VERCEL_LABS_ECOSYSTEM;