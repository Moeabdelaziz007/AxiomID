"use client";

import { useState } from "react";
import { Package } from "lucide-react";

const TIER_LABELS: Record<string, string> = {
  BASIC_TOOL: "Basic Tool",
  ADVANCED_TOOL: "Advanced Tool",
  ADVANCED_INFRASTRUCTURE: "Infra",
  PRO: "Pro",
  SOVEREIGN: "Sovereign",
};

interface PublishSkillFormProps {
  onPublished: () => void;
}

export function PublishSkillForm({ onPublished }: PublishSkillFormProps) {
  const [form, setForm] = useState({
    slug: "",
    name: "",
    description: "",
    manifestMd: "",
    agentScript: "",
    testSuite: "",
    tier: "BASIC_TOOL",
    pricePi: 0,
    version: "1.0.0",
  });
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  const handlePublish = async () => {
    if (!form.slug || !form.name || !form.manifestMd) {
      setError("slug, name, and manifestMd are required");
      return;
    }
    setPublishing(true);
    setError("");
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        onPublished();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to publish skill");
      }
    } catch {
      setError("Network error");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bento-card p-6">
        <h2 className="text-lg font-bold text-white font-mono mb-2 flex items-center"><Package className="w-5 h-5 text-emerald-400 inline me-2" />Publish Skill</h2>
        <p className="text-xs text-gray-400 mb-6">
          Skills are executable modules that agents can install and run.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="skill-slug" className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>SLUG *</label>
              <input
                id="skill-slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="my-skill-name"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-neon-green/40"
              />
            </div>
            <div>
              <label htmlFor="skill-name" className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>NAME *</label>
              <input
                id="skill-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My Skill Name"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-neon-green/40"
              />
            </div>
          </div>

          <div>
            <label htmlFor="skill-description" className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>DESCRIPTION</label>
            <input
              id="skill-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short description of what this skill does"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-neon-green/40"
            />
          </div>

          <div>
            <label htmlFor="skill-manifest" className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>
              MANIFEST (SKILL.md) * — Full XML-tagged content
            </label>
            <textarea
              id="skill-manifest"
              value={form.manifestMd}
              onChange={(e) => setForm({ ...form, manifestMd: e.target.value })}
              placeholder={`<skill name="my-skill">\n  <context>How the agent should use this skill...</context>\n  <commands>\n    <command trigger="/my-skill:run">Description</command>\n  </commands>\n</skill>`}
              rows={8}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-neon-green font-mono focus:outline-none focus:border-neon-green/40 resize-none"
            />
          </div>

          <div>
            <label htmlFor="skill-script" className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>
              SPECIALIST AGENT SCRIPT (TypeScript)
            </label>
            <textarea
              id="skill-script"
              value={form.agentScript}
              onChange={(e) => setForm({ ...form, agentScript: e.target.value })}
              placeholder={`export async function runSkill(context) {\n  // Agent logic here\n  return { success: true };\n}`}
              rows={6}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-electric-blue font-mono focus:outline-none focus:border-neon-green/40 resize-none"
            />
          </div>

          <div>
            <label htmlFor="skill-tests" className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>
              TEST SUITE
            </label>
            <textarea
              id="skill-tests"
              value={form.testSuite}
              onChange={(e) => setForm({ ...form, testSuite: e.target.value })}
              placeholder={`describe('my-skill', () => {\n  it('should do something', () => {\n    expect(true).toBe(true);\n  });\n});`}
              rows={4}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-amber-400 font-mono focus:outline-none focus:border-neon-green/40 resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="skill-tier" className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>TIER</label>
              <select
                id="skill-tier"
                value={form.tier}
                onChange={(e) => setForm({ ...form, tier: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none"
              >
                {Object.entries(TIER_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="skill-price" className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>PRICE (π)</label>
              <input
                id="skill-price"
                type="number"
                value={form.pricePi}
                onChange={(e) => setForm({ ...form, pricePi: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="skill-version" className="text-[10px] font-mono block mb-1" style={{ color: "var(--text-muted)" }}>VERSION</label>
              <input
                id="skill-version"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
              {error}
            </div>
          )}

          <button
            onClick={handlePublish}
            disabled={publishing || !form.slug || !form.name || !form.manifestMd}
            className="w-full btn-primary py-3 text-xs font-mono disabled:opacity-50"
          >
            {publishing ? "PUBLISHING TO MARKETPLACE..." : "PUBLISH SKILL → MARKETPLACE"}
          </button>
        </div>
      </div>
    </div>
  );
}
