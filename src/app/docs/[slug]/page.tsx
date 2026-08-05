import { notFound, redirect } from "next/navigation";
import { getDocBySlug } from "@/lib/docs-content";
import { renderMarkdown, extractHeadings } from "@/lib/markdown-renderer";

export async function generateStaticParams() {
  const { getAllDocs } = await import("@/lib/docs-content");
  return getAllDocs().map((doc) => ({ slug: doc.slug }));
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (slug === "docs") redirect("/docs/intro");

  const doc = getDocBySlug(slug);
  if (!doc) notFound();

  const html = renderMarkdown(doc.body);
  const headings = extractHeadings(doc.body).filter((h) => h.level >= 2);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <article
        className="lg:col-span-9 bento-card p-6 md:p-8 space-y-4"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--card-border)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider"
            style={{
              background: "var(--electric-blue-bg)",
              color: "var(--electric-blue)",
              border: "1px solid var(--electric-blue-border)",
            }}
          >
            {doc.section}
          </span>
        </div>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </article>

      {headings.length > 0 && (
        <aside className="hidden lg:block lg:col-span-3">
          <div
            className="sticky top-24 p-4 rounded-xl border text-[11px] font-mono space-y-2"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--card-border)",
            }}
          >
            <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: "var(--text-faint)" }}>
              On this page
            </div>
            {headings.map((h) => (
              <a
                key={h.id}
                href={`#${h.id}`}
                className="block transition-colors"
                style={{
                  paddingLeft: h.level === 3 ? "1rem" : "0",
                  color: "var(--text-subtle)",
                }}
              >
                {h.text}
              </a>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
