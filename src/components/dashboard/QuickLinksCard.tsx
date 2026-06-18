"use client";

import { useLanguage } from "@/app/context/language-context";
import { AxiomRenderer } from "../ui/AxiomRenderer";

interface QuickLinksCardProps {
  passportSlug: string;
  did?: string;
}

export function QuickLinksCard({ passportSlug, did }: QuickLinksCardProps) {
  const { t } = useLanguage();
  
  const spec = useMemo(() => ({
    root: "card",
    elements: {
      card: {
        type: "Card",
        props: { title: t("quick_links") },
        children: ["link1", "link2"],
      },
      link1: {
        type: "LinkItem",
        props: { label: t("view_passport"), href: `/passport/${passportSlug}` },
      },
      link2: {
        type: "LinkItem",
        props: { label: t("did_document"), href: `/api/did-document${did ? `?did=${encodeURIComponent(did)}` : ""}` },
      },
    },
  }), [t, passportSlug, did]);

  return <AxiomRenderer spec={spec} />;
}
