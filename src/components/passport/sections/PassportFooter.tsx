import React from "react";
import { useLanguage } from "@/app/context/language-context";
import { formatDate } from "../utils";

interface PassportFooterProps {
  issuedDate: string;
}

export function PassportFooter({ issuedDate }: PassportFooterProps) {
  const { t } = useLanguage();
  const formattedDate = formatDate(issuedDate, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t" style={{ borderColor: 'var(--card-border)', background: 'var(--bg-card)' }}>
      <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
        {t('passport_footer_verified')}
      </span>
      <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
        {formattedDate}
      </span>
    </div>
  );
}
