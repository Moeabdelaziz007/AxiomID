"use client";

import { LegalPage } from "@/components/LegalPage";

export default function Privacy() {
  return (
    <LegalPage
      badgeKey="privacy_legal"
      dateKey="privacy_last_updated"
      titleMainKey="privacy_title"
      titleHighlightKey="privacy_title_gradient"
      subtitleKey="privacy_subtitle"
      sections={[
        { titleKey: "privacy_info_collect", descKey: "privacy_info_collect_desc", color: "green" },
        { titleKey: "privacy_how_use", descKey: "privacy_how_use_desc", color: "blue" },
        { titleKey: "privacy_data_storage", descKey: "privacy_data_storage_desc", color: "purple" },
        { titleKey: "privacy_rights", descKey: "privacy_rights_desc", color: "green" },
      ]}
    />
  );
}
