import { User, Bot, Link2, Globe } from "lucide-react";
import { SectionHeader } from "./FeaturesSection";

interface HowItWorksSectionProps {
  t: (key: string) => string;
}

const STEPS = [
  {
    key: "human",
    step: "01",
    icon: User,
    accent: "text-emerald-400",
    borderHover: "group-hover:border-emerald-500/30",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    titleKey: "how_step_human_title",
    descKey: "how_step_human_desc",
  },
  {
    key: "agent",
    step: "02",
    icon: Bot,
    accent: "text-electric-blue",
    borderHover: "group-hover:border-electric-blue/30",
    iconBg: "bg-electric-blue/10 border-electric-blue/20",
    titleKey: "how_step_agent_title",
    descKey: "how_step_agent_desc",
  },
  {
    key: "trustchain",
    step: "03",
    icon: Link2,
    accent: "text-axiom-purple",
    borderHover: "group-hover:border-axiom-purple/30",
    iconBg: "bg-axiom-purple/10 border-axiom-purple/20",
    titleKey: "how_step_trustchain_title",
    descKey: "how_step_trustchain_desc",
  },
  {
    key: "world",
    step: "04",
    icon: Globe,
    accent: "text-zinc-300",
    borderHover: "group-hover:border-white/20",
    iconBg: "bg-white/5 border-white/10",
    titleKey: "how_step_world_title",
    descKey: "how_step_world_desc",
  },
] as const;

/**
 * 4-step protocol flow: Human → Agent → TrustChain → World.
 * Inspired by zerolang-style section rhythm with AxiomID-native copy.
 */
export default function HowItWorksSection({ t }: HowItWorksSectionProps) {
  return (
    <section
      className="w-full max-w-6xl px-4 sm:px-6 z-10 border-t"
      style={{
        borderColor: "var(--card-border)",
        paddingBlock: "clamp(5rem, 11vh, 8rem)",
      }}
    >
      <SectionHeader
        label={t("landing_how_it_works")}
        title={t("how_it_works_title")}
        labelColor="text-electric-blue"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 relative">
        {/* Connecting line on large screens */}
        <div
          className="hidden lg:block absolute top-[3.25rem] start-[12%] end-[12%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent z-0"
          aria-hidden="true"
        />

        {STEPS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className={`relative z-10 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 flex flex-col gap-4 group transition-all duration-300 ${item.borderHover} hover:bg-white/[0.035]`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center border ${item.iconBg} transition-transform duration-300 group-hover:scale-105`}
                >
                  <Icon className={`w-5 h-5 ${item.accent}`} aria-hidden="true" />
                </div>
                <span className="text-xs font-mono text-zinc-600 tracking-widest">{item.step}</span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                  {t(item.titleKey)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400 text-pretty">
                  {t(item.descKey)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
