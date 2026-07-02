"use client";

import { Sparkles } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";

interface EmptyStateProps {
  title: string;
  titleAr?: string;
  desc: string;
  descAr?: string;
  action?: {
    label: string;
    labelAr?: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}

export function EmptyState({ title, titleAr, desc, descAr, action, icon }: EmptyStateProps) {
  const { language } = useLanguage();
  const t = (en: string, ar?: string) => (language === "en" ? en : ar ?? en);

  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
        {icon ?? <Sparkles className="w-8 h-8 text-electric-blue opacity-50" />}
      </div>
      <h3 className="text-lg font-mono mb-2" style={{ color: "var(--text-primary)" }}>
        {t(title, titleAr)}
      </h3>
      <p className="text-sm max-w-xs mb-6" style={{ color: "var(--text-secondary)" }}>
        {t(desc, descAr)}
      </p>
      {action && (
        <button onClick={action.onClick} className="btn-primary text-xs font-mono px-6 py-2.5">
          {t(action.label, action.labelAr)}
        </button>
      )}
    </div>
  );
}
