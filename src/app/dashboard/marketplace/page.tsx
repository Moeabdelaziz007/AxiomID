"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useWallet } from "../../context/wallet-context";
import { Dna, Download, Star, Coins } from "lucide-react";
import { PublishSkillForm } from "@/components/dashboard/PublishSkillForm";
import { useLanguage } from "../../context/language-context";
import { createPiPayment } from "@/lib/pi-sdk";

interface Skill {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tier: string;
  pricePi: number;
  version: string;
  installCount: number;
  avgRating: number;
  ratingCount: number;
  createdAt: string;
}

interface SkillDetail extends Skill {
  manifestMd: string;
  agentScript: string | null;
  testSuite: string | null;
  status: string;
  isPublished: boolean;
  installationCount: number;
  reviewCount: number;
  updatedAt: string;
}

const TIER_COLORS: Record<string, string> = {
  BASIC_TOOL: "#64748b",
  ADVANCED_TOOL: "#3b82f6",
  ADVANCED_INFRASTRUCTURE: "#f59e0b",
  PRO: "#a855f7",
  SOVEREIGN: "#22c55e",
};

const TIER_LABEL_KEYS: Record<string, string> = {
  BASIC_TOOL: "tier_basic_tool",
  ADVANCED_TOOL: "tier_advanced_tool",
  ADVANCED_INFRASTRUCTURE: "tier_advanced_infrastructure",
  PRO: "tier_pro",
  SOVEREIGN: "tier_sovereign",
};

export default function MarketplacePage() {
  const { t } = useLanguage();
  const { user, connectWallet, isConnecting } = useWallet();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTier, setFilterTier] = useState<string>("");
  const [selectedSkill, setSelectedSkill] = useState<SkillDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (offset === 0) setSkills([]);
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filterTier) params.set("tier", filterTier);
        if (searchQuery) params.set("q", searchQuery);
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String(offset));
        const res = await fetch(`/api/skills?${params}`);
        if (!res.ok) {
          throw new Error(`Failed to load skills (${res.status})`);
        }
        if (!cancelled) {
          const data = await res.json();
          const newSkills = data.skills || [];
          setSkills((prev) => offset === 0 ? newSkills : [...prev, ...newSkills]);
          setHasMore(newSkills.length === PAGE_SIZE);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load marketplace");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [filterTier, searchQuery, offset]);

  const handleFilterChange = (tier: string) => {
    setFilterTier(tier);
    setOffset(0);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setOffset(0);
  };

  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selectedSkill && !dialog.open) {
      dialog.showModal();
    } else if (!selectedSkill && dialog.open) {
      dialog.close();
    }
  }, [selectedSkill]);

  const openDetail = async (slug: string) => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/skills/${slug}`, { signal: controller.signal });
      if (!res.ok) {
        setError(`Failed to load skill (${res.status})`);
        return;
      }
      const data = await res.json();
      setSelectedSkill(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Failed to load skill details");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = useCallback(() => {
    fetchAbortRef.current?.abort();
    setSelectedSkill(null);
    previousFocusRef.current?.focus();
  }, []);

  const handleInstall = async (skill: Pick<Skill, "id" | "slug" | "name" | "pricePi">) => {
    if (!user) {
      connectWallet();
      return;
    }
    setInstalling(true);
    try {
      // Paid skills must be purchased before installation. Run the Pi payment
      // flow (SDK createPayment → approve → complete) and verify the order
      // server-side so an ESCROWED PiPayment with metadata.skillId exists for
      // this user. The install route's payment gate then allows the install.
      if (skill.pricePi > 0) {
        if (!user.agent?.id) {
          throw new Error(t("marketplace_need_agent"));
        }

        const txid = await createPiPayment(
          skill.pricePi,
          `Purchase of ${skill.name}`,
          { skillId: skill.id, agentId: user.agent.id, purpose: "skill_purchase" }
        );

        const storedToken = localStorage.getItem("pi_access_token");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (storedToken) headers["Authorization"] = `Bearer ${storedToken}`;

        const orderRes = await fetch("/api/marketplace/order/create", {
          method: "POST",
          headers,
          body: JSON.stringify({ skillId: skill.id, agentId: user.agent.id, paymentId: txid }),
        });
        if (!orderRes.ok) {
          const data = await orderRes.json().catch(() => ({}));
          throw new Error(data.error || `Purchase verification failed (${orderRes.status})`);
        }
      }

      const res = await fetch(`/api/skills/${skill.slug}/install`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Install failed (${res.status})`);
      }
      toast.success(t("marketplace_install_success"));
      openDetail(skill.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to install skill");
    } finally {
      setInstalling(false);
    }
  };

  return (
    <>
      {error && (
        <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center px-4 py-3" role="alert">
          <div className="flex items-center gap-3 max-w-lg w-full px-4 py-3 rounded-xl border bg-[#1a0a0a]/90 backdrop-blur-md"
            style={{ borderColor: "rgba(239, 68, 68, 0.25)" }}
          >
            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm font-mono text-red-300 flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-xs font-mono px-2 py-1">{t("marketplace_dismiss")}</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        <h1 className="text-lg font-bold truncate flex items-center" style={{ color: "var(--text-primary)" }}>
          <Dna className="w-5 h-5 text-emerald-400 inline me-2" />{t("marketplace_title")}
        </h1>
        <div className="ms-auto">
          <button
            onClick={() => setShowPublish(!showPublish)}
            className="btn-primary text-xs px-3 sm:px-4 py-2"
          >
            {showPublish ? t("marketplace_browse") : t("marketplace_publish")}
          </button>
        </div>
      </div>

      {/* Welcome Banner */}
      {!showPublish && (
        <div className="bento-card p-4 mb-6 flex items-start gap-3" style={{ borderColor: "rgba(34, 197, 94, 0.15)" }}>
          <Dna className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{t("marketplace_welcome_banner")}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{t("marketplace_welcome_desc")}</p>
          </div>
        </div>
      )}
        {showPublish ? (
          <PublishSkillForm onPublished={() => setShowPublish(false)} />
        ) : (
          <>
            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <label htmlFor="marketplace-search" className="sr-only">Search skills</label>
              <input
                id="marketplace-search"
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t("marketplace_search")}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-surface placeholder-gray-600 focus:outline-none focus:border-neon-green/40 font-mono"
              />
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by tier">
                {["", "BASIC_TOOL", "ADVANCED_TOOL", "ADVANCED_INFRASTRUCTURE", "PRO", "SOVEREIGN"].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => handleFilterChange(tier)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono border transition-colors ${
                      filterTier === tier
                        ? "bg-neon-green/10 text-neon-green border-neon-green/30"
                        : "bg-white/5 text-faint border-white/10 hover:border-white/20"
                    }`}
                  >
                    {tier ? t(TIER_LABEL_KEYS[tier] || tier) : t("marketplace_all")}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bento-card p-4 text-center">
                <span className="text-2xl font-bold text-neon-green font-mono">{skills.length}</span>
                <p className="text-[10px] font-mono mt-1" style={{ color: "var(--text-muted)" }}>{t("marketplace_published")}</p>
                <p className="text-[9px] font-mono mt-0.5" style={{ color: "var(--text-faint)" }}>{t("marketplace_published_desc")}</p>
              </div>
              <div className="bento-card p-4 text-center">
                <span className="text-2xl font-bold text-electric-blue font-mono">
                  {skills.reduce((acc, s) => acc + s.installCount, 0)}
                </span>
                <p className="text-[10px] font-mono mt-1" style={{ color: "var(--text-muted)" }}>{t("marketplace_installs")}</p>
                <p className="text-[9px] font-mono mt-0.5" style={{ color: "var(--text-faint)" }}>{t("marketplace_installs_desc")}</p>
              </div>
              <div className="bento-card p-4 text-center">
                <span className="text-2xl font-bold text-axiom-purple font-mono">
                  {skills.filter((s) => s.tier === "PRO" || s.tier === "SOVEREIGN").length}
                </span>
                <p className="text-[10px] font-mono mt-1" style={{ color: "var(--text-muted)" }}>{t("marketplace_pro_skills")}</p>
                <p className="text-[9px] font-mono mt-0.5" style={{ color: "var(--text-faint)" }}>{t("marketplace_pro_skills_desc")}</p>
              </div>
              <div className="bento-card p-4 text-center">
                <span className="text-2xl font-bold text-amber-400 font-mono">
                  {skills.filter((s) => s.pricePi === 0).length}
                </span>
                <p className="text-[10px] font-mono mt-1" style={{ color: "var(--text-muted)" }}>{t("marketplace_free_skills")}</p>
                <p className="text-[9px] font-mono mt-0.5" style={{ color: "var(--text-faint)" }}>{t("marketplace_free_skills_desc")}</p>
              </div>
            </div>

            {/* Skills Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bento-card p-6 animate-pulse">
                    <div className="h-4 bg-white/5 rounded w-3/4 mb-3" />
                    <div className="h-3 bg-white/5 rounded w-1/2 mb-4" />
                    <div className="h-8 bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            ) : skills.length === 0 ? (
              <div className="bento-card p-12 text-center">
                <span className="mb-4 block"><Dna className="w-16 h-16 text-emerald-400/30 mx-auto" /></span>
                <h3 className="text-xl font-bold text-surface mb-2">{t("marketplace_no_skills")}</h3>
                <p className="text-sm text-subtle mb-6 max-w-md mx-auto">
                  {t("marketplace_publish_first")}
                </p>
                <button onClick={() => setShowPublish(true)} className="btn-primary px-6 py-2.5">
                  {t("marketplace_publish_btn")}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {skills.map((skill) => {
                  const tierColor = TIER_COLORS[skill.tier] || "#64748b";
                  return (
                    <button
                      key={skill.id}
                      onClick={() => openDetail(skill.slug)}
                      className="bento-card p-5 text-start transition-all duration-300 group relative overflow-hidden"
                      style={{ 
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: 'var(--card-border)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = `${tierColor}50`;
                        e.currentTarget.style.boxShadow = `0 8px 30px -10px ${tierColor}15, 0 0 0 1px ${tierColor}20`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--card-border)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {/* Spectral glowing background stripe for premium tier vibes */}
                      <div 
                        className="absolute top-0 left-0 right-0 h-1 opacity-20 group-hover:opacity-60 transition-opacity duration-300"
                        style={{ background: `linear-gradient(90deg, transparent, ${tierColor}, transparent)` }}
                      />

                      <div className="flex items-start justify-between mb-3 relative z-10">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-surface font-mono truncate group-hover:text-neon-green transition-colors">
                            {skill.name}
                          </h4>
                          <p className="text-[10px] font-mono mt-0.5" style={{ color: tierColor }}>
                            {skill.slug} v{skill.version}
                          </p>
                        </div>
                        <span
                          className="text-[8px] font-mono px-1.5 py-0.5 rounded me-2 shrink-0"
                          style={{
                            background: `${tierColor}15`,
                            color: tierColor,
                            border: `1px solid ${tierColor}40`,
                          }}
                        >
                          {t(TIER_LABEL_KEYS[skill.tier] || skill.tier)}
                        </span>
                      </div>

                      <p className="text-xs text-subtle line-clamp-2 mb-4 min-h-[32px] relative z-10">
                        {skill.description || t("marketplace_no_desc")}
                      </p>

                      {/* Cryptographic L0 Authority Trust Stamp Indicator */}
                      <div className="flex items-center gap-1.5 mb-4 text-[9px] font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-2 py-0.5 rounded w-fit relative z-10">
                        <svg className="w-3 h-3 text-emerald-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>{t("marketplace_signed")}</span>
                      </div>

                      <div className="flex items-center justify-between text-[9px] font-mono border-t border-white/5 pt-3 mt-1 relative z-10">
                        <div className="flex items-center gap-3">
                          <span style={{ color: "var(--text-muted)" }}>
                            <Download className="w-3 h-3 inline me-1" />{skill.installCount}
                          </span>
                          <span style={{ color: "var(--text-muted)" }}>
                            <Star className="w-3 h-3 inline me-1" />{(skill.avgRating ?? 0).toFixed(1)}
                          </span>
                        </div>
                        <span className="text-neon-green">
                          {skill.pricePi === 0 ? t("marketplace_free") : `${skill.pricePi} π`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {!loading && hasMore && skills.length > 0 && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                  className="btn-ghost text-xs font-mono px-6 py-2"
                >
                  {t("marketplace_load_more")}
                </button>
              </div>
            )}
          </>
        )}

      {/* Skill Detail Modal */}
      <dialog
        ref={dialogRef}
        onClose={closeModal}
        className="bg-transparent p-0 rounded-xl backdrop:bg-black/80 backdrop:backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label={selectedSkill ? `${selectedSkill.name} skill details` : "Loading skill details"}
        onClick={(e) => { if (e.target === dialogRef.current) closeModal(); }}
      >
          <div
            className="bento-card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-6 bg-white/5 rounded w-1/2" />
                <div className="h-4 bg-white/5 rounded w-3/4" />
                <div className="h-32 bg-white/5 rounded" />
              </div>
            ) : selectedSkill && (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-surface font-mono">{selectedSkill.name}</h2>
                    <p className="text-xs font-mono mt-1" style={{ color: TIER_COLORS[selectedSkill.tier] }}>
                      {selectedSkill.slug} v{selectedSkill.version} — {t(TIER_LABEL_KEYS[selectedSkill.tier] || selectedSkill.tier)}
                    </p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="text-faint hover:text-surface text-xs font-mono px-2 py-0.5 border border-white/5 rounded"
                  >
                    {t("marketplace_close")}
                  </button>
                </div>

                <p className="text-sm text-subtle mb-4">{selectedSkill.description || t("marketplace_no_desc")}</p>

                <div className="flex items-center gap-4 text-[10px] font-mono mb-6">
                  <span className="text-neon-green"><Download className="w-3 h-3 inline me-1" />{selectedSkill.installCount} {t("marketplace_installs_label")}</span>
                  <span className="text-amber-400"><Star className="w-3 h-3 inline me-1" />{(selectedSkill.avgRating ?? 0).toFixed(1)} ({selectedSkill.ratingCount})</span>
                  <span className="text-electric-blue"><Coins className="w-3 h-3 inline me-1" />{selectedSkill.pricePi === 0 ? t("marketplace_free") : `${selectedSkill.pricePi} π`}</span>
                </div>

                {/* What This Skill Does */}
                <div className="mb-4">
                    <h3 className="text-xs font-mono font-bold mb-1" style={{ color: "var(--text-secondary)" }}>
                      {t("marketplace_manifest")}
                  </h3>
                  <p className="text-[10px] font-mono mb-2" style={{ color: "var(--text-muted)" }}>
                    {t("marketplace_manifest_desc")}
                  </p>
                  <pre className="bg-black/40 border border-white/5 rounded-lg p-3 text-[10px] font-mono text-neon-green overflow-x-auto max-h-48 scrollbar-thin whitespace-pre-wrap">
                    {selectedSkill.manifestMd}
                  </pre>
                </div>

                {/* How To Use It */}
                {selectedSkill.agentScript && (
                  <div className="mb-4">
                    <h3 className="text-xs font-mono font-bold mb-1" style={{ color: "var(--text-secondary)" }}>
                      {t("marketplace_script")}
                    </h3>
                    <p className="text-[10px] font-mono mb-2" style={{ color: "var(--text-muted)" }}>
                      {t("marketplace_script_desc")}
                    </p>
                    <pre className="bg-black/40 border border-white/5 rounded-lg p-3 text-[10px] font-mono text-electric-blue overflow-x-auto max-h-48 scrollbar-thin whitespace-pre-wrap">
                      {selectedSkill.agentScript}
                    </pre>
                  </div>
                )}

                {/* Test Suite */}
                {selectedSkill.testSuite && (
                  <div className="mb-4">
                    <h3 className="text-xs font-mono font-bold mb-2" style={{ color: "var(--text-secondary)" }}>
                      {t("marketplace_test_suite")}
                    </h3>
                    <pre className="bg-black/40 border border-white/5 rounded-lg p-3 text-[10px] font-mono text-amber-400 overflow-x-auto max-h-48 scrollbar-thin whitespace-pre-wrap">
                      {selectedSkill.testSuite}
                    </pre>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => handleInstall(selectedSkill)}
                    disabled={installing || isConnecting}
                    aria-busy={installing}
                    aria-label={installing ? t("marketplace_installing") : isConnecting ? t("marketplace_connecting") : !user ? t("marketplace_connect_install") : t("marketplace_install_skill")}
                    className="flex-1 btn-primary py-2.5 text-xs font-mono uppercase"
                  >
                    {installing ? t("marketplace_installing") : isConnecting ? t("marketplace_connecting") : !user ? t("marketplace_connect_install") : t("marketplace_install_skill")}
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify({
                        slug: selectedSkill.slug,
                        manifest: selectedSkill.manifestMd,
                        script: selectedSkill.agentScript,
                      }, null, 2));
                    }}
                    className="btn-ghost py-2.5 text-xs font-mono px-4"
                  >
                    {t("marketplace_copy_payload")}
                  </button>
                </div>
              </>
            )}
          </div>
      </dialog>
    </>
  );
}
