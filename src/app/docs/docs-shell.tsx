"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Search } from "lucide-react";
import { useLanguage } from "../context/language-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { DocPage } from "@/lib/docs-content";

export function DocsPageShell({ docs, children }: { docs: DocPage[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");

  const currentSlug = pathname.replace(/^\/docs\/?/, "") || "intro";

  const sectionIcons: Record<string, string> = {
    intro: "01",
    architecture: "02",
    stamps: "03",
    kya: "04",
    passport: "05",
    sdk: "06",
    "api-reference": "07",
  };

  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return docs;
    const q = searchQuery.toLowerCase();
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.slug.includes(q) ||
        d.section.toLowerCase().includes(q)
    );
  }, [docs, searchQuery]);

  return (
    <main className="min-h-screen bg-grid relative pb-20">
      <div className="scanline" />
      <Header showBack />

      <div className="max-w-6xl mx-auto px-4 mt-8 relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Sidebar */}
        <aside className="md:col-span-3 space-y-2">
          <div className="p-3 text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
            {t("docs_sidebar_label")}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }} />
            <input
              type="text"
              placeholder={t("docs_search_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border rounded-xl py-2.5 ps-9 pe-3 text-[11px] font-mono transition-colors"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--card-border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {filteredDocs.map((doc) => (
            <Link
              key={doc.slug}
              href={`/docs/${doc.slug}` as Route}
              onClick={() => setSearchQuery("")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left text-xs font-mono transition-all ${
                currentSlug === doc.slug
                  ? "border"
                  : "border border-transparent"
              }`}
              style={{
                background: currentSlug === doc.slug ? "var(--electric-blue-bg)" : undefined,
                borderColor: currentSlug === doc.slug ? "var(--electric-blue-border)" : undefined,
                color: currentSlug === doc.slug ? "var(--electric-blue)" : "var(--text-subtle)",
              }}
            >
              <span className="text-[10px] opacity-50">{sectionIcons[doc.slug] || "—"}</span>
              <span>{doc.title}</span>
            </Link>
          ))}
        </aside>

        {/* Content */}
        <div className="md:col-span-9 min-h-[500px]">
          {children}
        </div>
      </div>
      <Footer />
    </main>
  );
}
