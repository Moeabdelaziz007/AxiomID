export interface HeadingEntry {
  id: string;
  text: string;
  level: number;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function renderInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded text-[11px] font-mono" style="background: var(--bg-card); color: var(--neon-green);">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-electric-blue hover:underline">$1</a>');
}

function renderTable(lines: string[]): { html: string; consumed: number } {
  const headerMatch = lines[0].match(/^\|(.+)\|$/);
  if (!headerMatch) return { html: "", consumed: 0 };
  const headers = headerMatch[1].split("|").map((h) => h.trim());
  let i = 1;
  if (i < lines.length && /^\|[\s:-]+\|$/.test(lines[i])) i++;
  const rows: string[][] = [];
  while (i < lines.length) {
    const rowMatch = lines[i].match(/^\|(.+)\|$/);
    if (!rowMatch) break;
    rows.push(rowMatch[1].split("|").map((c) => c.trim()));
    i++;
  }
  let html = '<div class="overflow-x-auto"><table class="w-full text-left font-mono text-xs"><thead><tr>';
  for (const h of headers) html += `<th class="py-2 pe-3 text-zinc-500 text-[10px] uppercase tracking-wider">${escapeHtml(h)}</th>`;
  html += "</tr></thead><tbody>";
  for (const row of rows) {
    html += '<tr class="border-t" style="border-color: var(--card-border);">';
    for (const cell of row) html += `<td class="py-2 pe-3 text-zinc-400">${renderInline(escapeHtml(cell))}</td>`;
    html += "</tr>";
  }
  html += "</tbody></table></div>";
  return { html, consumed: i };
}

function renderList(lines: string[], startIdx: number): { html: string; consumed: number } {
  let html = "<ul class='space-y-1 list-disc list-inside'>";
  let i = startIdx;
  while (i < lines.length && lines[i].match(/^[-*]\s/)) {
    html += `<li class="text-zinc-400 text-sm">${renderInline(escapeHtml(lines[i].replace(/^[-*]\s/, "")))}</li>`;
    i++;
  }
  html += "</ul>";
  return { html, consumed: i - startIdx };
}

export function extractHeadings(md: string): HeadingEntry[] {
  const headings: HeadingEntry[] = [];
  for (const line of md.split("\n")) {
    const trimmed = line.trim();
    const hMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (hMatch) {
      headings.push({
        level: hMatch[1].length,
        text: hMatch[2].replace(/`([^`]+)`/g, "$1"),
        id: slugify(hMatch[2].replace(/`([^`]+)`/g, "$1")),
      });
    }
  }
  return headings;
}

export function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const elements: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      const code = escapeHtml(codeLines.join("\n"));
      elements.push(`<pre class="bg-black/40 border rounded-xl p-4 overflow-x-auto font-mono text-xs leading-relaxed" style="border-color: var(--card-border);"><code>${code}</code></pre>`);
      continue;
    }

    const tableResult = renderTable(lines.slice(i));
    if (tableResult.consumed > 0) {
      elements.push(tableResult.html);
      i += tableResult.consumed;
      continue;
    }

    const listResult = renderList(lines, i);
    if (listResult.consumed > 0) {
      elements.push(listResult.html);
      i += listResult.consumed;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      const text = trimmed.slice(4);
      const id = slugify(text);
      elements.push(`<h3 id="${id}" class="text-sm font-bold font-mono pt-4 border-b pb-2 mb-3 group" style="color: var(--text-primary); border-color: var(--card-border);"><a href="#${id}" class="anchor-link">#</a> ${renderInline(escapeHtml(text))}</h3>`);
      i++;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      const text = trimmed.slice(3);
      const id = slugify(text);
      elements.push(`<h2 id="${id}" class="text-lg md:text-xl font-bold mt-6 mb-3 group" style="color: var(--text-primary);"><a href="#${id}" class="anchor-link">#</a> ${renderInline(escapeHtml(text))}</h2>`);
      i++;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      const text = trimmed.slice(2);
      const id = slugify(text);
      elements.push(`<h1 id="${id}" class="text-xl md:text-2xl font-bold mt-4 mb-4 group" style="color: var(--text-primary);"><a href="#${id}" class="anchor-link">#</a> ${renderInline(escapeHtml(text))}</h1>`);
      i++;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const quotes: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("> ")) {
        quotes.push(renderInline(escapeHtml(lines[i].trimStart().slice(2))));
        i++;
      }
      elements.push(`<blockquote class="border-s-2 px-4 py-2 my-3 text-sm" style="border-color: var(--electric-blue); color: var(--text-subtle);">${quotes.join("<br>")}</blockquote>`);
      continue;
    }

    elements.push(`<p class="text-sm leading-relaxed mb-3" style="color: var(--text-secondary);">${renderInline(escapeHtml(trimmed))}</p>`);
    i++;
  }

  return elements.join("\n");
}
