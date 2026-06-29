"use client";

import { LegalPage } from "@/components/LegalPage";

export default function Terms() {
  return (
    <LegalPage
      badgeKey="terms_legal"
      dateKey="terms_last_updated"
      titleMainKey="terms_title_main"
      titleHighlightKey="terms_title_highlight"
      subtitleKey="terms_subtitle"
      sections={[
        { titleKey: "terms_use", descKey: "terms_use_desc", color: "green" },
        { titleKey: "terms_wallet", descKey: "terms_wallet_desc", color: "blue" },
        { titleKey: "terms_ai_agent", descKey: "terms_ai_agent_desc", color: "purple" },
        { titleKey: "terms_liability", descKey: "terms_liability_desc", color: "green" },
        { titleKey: "terms_changes", descKey: "terms_changes_desc", color: "green" },
      ]}
    />
  );
}
