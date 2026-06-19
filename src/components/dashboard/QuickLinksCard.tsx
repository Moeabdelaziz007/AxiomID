"use client";

import { useMemo } from "react";
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
        props: { title: t("quick_links"), variant: "bento" },
        children: ["link1", "link2"],
      },
      link1: {
        type: "LinkItem",
        props: {
          label: t("view_passport"),
          href: `/passport/${passportSlug}`,
          icon: "fingerprint",
          color: "default",
        },
      },
      link2: {
        type: "LinkItem",
        props: {
          label: t("did_document"),
          href: `/api/did-document${did ? `?did=${encodeURIComponent(did)}` : ""}`,
          icon: "clipboard",
          color: "default",
        },
      },
    },
  }), [t, passportSlug, did]);

  return <AxiomRenderer spec={spec} />;
}
