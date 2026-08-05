import { Fingerprint, Shield, Zap } from "lucide-react";

interface FeaturesSectionProps {
  t: (key: string) => string;
}

export function SectionHeader({ label, title, labelColor }: { label: string; title: string; labelColor: string }) {
  return (
    <div className="text-center mb-10 sm:mb-12">
      <span className={`text-[10px] font-mono ${labelColor} tracking-widest uppercase`}>{label}</span>
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-surface mt-2">{title}</h2>
    </div>
  );
}

export default function FeaturesSection({ t }: FeaturesSectionProps) {
  return (
    <div className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10">
      <SectionHeader
        label={t("landing_how_it_works")}
        title={t("landing_three_steps")}
        labelColor="text-electric-blue"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        <div className="hidden md:block absolute top-24 start-[15%] end-[15%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />
        {[
          {
            step: "01",
            title: t("landing_step1_title"),
            desc: t("landing_step1_desc"),
            icon: <Fingerprint className="w-6 h-6 text-electric-blue" />,
            badge: "W3C DID Standard",
          },
          {
            step: "02",
            title: t("landing_step2_title"),
            desc: t("landing_step2_desc"),
            icon: <Shield className="w-6 h-6 text-axiom-purple" />,
            badge: "ZKP Privacy Ready",
          },
          {
            step: "03",
            title: t("landing_step3_title"),
            desc: t("landing_step3_desc"),
            icon: <Zap className="w-6 h-6 text-emerald-400" />,
            badge: "Pi Network Compatible",
          },
        ].map((item) => (
          <div key={item.step} className="stitch-feature-card flex flex-col gap-4 cursor-default group relative z-10">
            <div className="absolute top-4 end-4 text-3xl font-mono font-bold text-white/5 group-hover:text-electric-blue/5 transition-colors">
              {item.step}
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-glass border border-glass-hover group-hover:border-electric-blue/20 transition-all duration-300">
              {item.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-electric-blue transition-colors duration-300">
                {item.title}
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-faint">{item.desc}</p>
            <div className="mt-auto pt-4 border-t border-glass flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-electric-blue animate-pulse" />
              <span className="text-[11px] font-mono text-faint">{item.badge}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
