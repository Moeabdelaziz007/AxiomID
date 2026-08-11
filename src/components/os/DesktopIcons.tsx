type Gradient = [string, string];

const PAIRS: Record<string, Gradient> = {
  agents: ["#06b6d4", "#3b82f6"],
  notes: ["#a855f7", "#ec4899"],
  code: ["#10b981", "#06b6d4"],
  files: ["#f59e0b", "#ef4444"],
  terminal: ["#06b6d4", "#8b5cf6"],
  automation: ["#a855f7", "#06b6d4"],
  autopilot: ["#10b981", "#3b82f6"],
  assistant: ["#f59e0b", "#a855f7"],
  settings: ["#06b6d4", "#10b981"],
};

function Icon({ id, children }: { id: string; children: React.ReactNode }) {
  const [a, b] = PAIRS[id] ?? ["#06b6d4", "#3b82f6"];
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10">
      <defs>
        <linearGradient id={`g-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={a} />
          <stop offset="100%" stopColor={b} />
        </linearGradient>
      </defs>
      {children}
    </svg>
  );
}

type Props = {
  labels: Record<string, string>;
};

export function DesktopIcons({ labels }: Props) {
  const defs = (id: string) => `url(#g-${id})`;

  const items: Array<{
    id: string;
    href?: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "agents",
      href: "/dashboard",
      icon: (
        <Icon id="agents">
          <circle cx="12" cy="8" r="3" stroke={defs("agents")} strokeWidth="2" fill="none" />
          <path d="M12 11v4m0 0l-3 3m3-3l3 3M6 8a6 6 0 0112 0" stroke={defs("agents")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6" cy="18" r="2" fill={defs("agents")} opacity="0.6" />
          <circle cx="18" cy="18" r="2" fill={defs("agents")} opacity="0.6" />
        </Icon>
      ),
    },
    {
      id: "notes",
      href: "https://memory.axiomid.app",
      icon: (
        <Icon id="notes">
          <rect x="4" y="4" width="16" height="16" rx="2" stroke={defs("notes")} strokeWidth="2" fill="none" />
          <path d="M8 8h8M8 12h8M8 16h5" stroke={defs("notes")} strokeWidth="2" strokeLinecap="round" />
          <circle cx="17" cy="7" r="2" fill={defs("notes")} opacity="0.8" />
        </Icon>
      ),
    },
    {
      id: "code",
      icon: (
        <Icon id="code">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke={defs("code")} strokeWidth="2" fill="none" />
          <path d="M8 9l-2 3 2 3M16 9l2 3-2 3M13 7l-2 10" stroke={defs("code")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Icon>
      ),
    },
    {
      id: "files",
      icon: (
        <Icon id="files">
          <path d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke={defs("files")} strokeWidth="2" fill="none" />
          <path d="M7 13h10M7 16h6" stroke={defs("files")} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        </Icon>
      ),
    },
    {
      id: "terminal",
      href: "https://harness.axiomid.app",
      icon: (
        <Icon id="terminal">
          <rect x="2" y="4" width="20" height="16" rx="2" stroke={defs("terminal")} strokeWidth="2" fill="none" />
          <path d="M6 9l4 3-4 3M12 15h6" stroke={defs("terminal")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="19" cy="7" r="1.5" fill={defs("terminal")} opacity="0.8" />
        </Icon>
      ),
    },
    {
      id: "automation",
      icon: (
        <Icon id="automation">
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" stroke={defs("automation")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="13" cy="2" r="1.5" fill={defs("automation")} opacity="0.8" />
          <circle cx="12" cy="22" r="1.5" fill={defs("automation")} opacity="0.8" />
        </Icon>
      ),
    },
    {
      id: "autopilot",
      icon: (
        <Icon id="autopilot">
          <path d="M12 2l-8 8h5v10h6V10h5l-8-8z" stroke={defs("autopilot")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="12" cy="2" r="1.5" fill={defs("autopilot")} />
          <path d="M7 14l-2 2M17 14l2 2" stroke={defs("autopilot")} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        </Icon>
      ),
    },
    {
      id: "assistant",
      icon: (
        <Icon id="assistant">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={defs("assistant")} strokeWidth="2" fill="none" />
          <circle cx="9" cy="10" r="1.5" fill={defs("assistant")} />
          <circle cx="15" cy="10" r="1.5" fill={defs("assistant")} />
          <path d="M9 13h6" stroke={defs("assistant")} strokeWidth="2" strokeLinecap="round" />
        </Icon>
      ),
    },
    {
      id: "settings",
      href: "/dashboard/settings",
      icon: (
        <Icon id="settings">
          <circle cx="12" cy="12" r="3" stroke={defs("settings")} strokeWidth="2" fill="none" />
          <path d="M12 1v3m0 16v3M4.22 4.22l2.12 2.12m11.32 11.32l2.12 2.12M1 12h3m16 0h3M4.22 19.78l2.12-2.12m11.32-11.32l2.12-2.12" stroke={defs("settings")} strokeWidth="2" strokeLinecap="round" />
        </Icon>
      ),
    },
  ];

  return (
    <div className="flex max-h-[calc(100vh-140px)] flex-col flex-wrap items-start gap-5" role="list" aria-label="Aura OS desktop">
      {items.map(({ id, href, icon }) => {
        const label = labels[id] ?? id;
        const soon = !href;
        return (
          <div key={id} role="listitem" className={`flex w-28 flex-col items-center gap-3 rounded-xl p-4 transition-all duration-200 ${soon ? "opacity-30" : "hover:bg-cyan-400/10 hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]"}`}>
            {href ? (
              <a href={href} className="flex flex-col items-center gap-3 rounded-xl text-cyan-400" aria-label={label}>
                <div className="rounded-2xl border border-white/10 bg-[#0f0f1a]/30 p-4 shadow-lg backdrop-blur-md">{icon}</div>
                <span className="text-xs font-semibold text-white drop-shadow-lg">{label}</span>
              </a>
            ) : (
              <div className="flex flex-col items-center gap-3" aria-label={label}>
                <div className="rounded-2xl border border-white/10 bg-[#0f0f1a]/30 p-4 shadow-lg backdrop-blur-md">{icon}</div>
                <span className="text-xs font-semibold text-white drop-shadow-lg">
                  {label} <span className="text-[10px] font-normal text-slate-500">{labels.soon}</span>
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
