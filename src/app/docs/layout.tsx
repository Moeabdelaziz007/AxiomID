import { getAllDocs } from "@/lib/docs-content";
import { DocsPageShell } from "./docs-shell";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const docs = getAllDocs();
  return <DocsPageShell docs={docs}>{children}</DocsPageShell>;
}
