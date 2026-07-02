"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useWallet } from "../../context/wallet-context";
import { motion } from "framer-motion";
import { Dna, Download, Star, Coins } from "lucide-react";
import { PublishSkillForm } from "@/components/dashboard/PublishSkillForm";
import { SoulBadge } from "@/components/marketplace/SoulBadge";
import { useLanguage } from "../../context/language-context";
import { createPiPayment } from "@/lib/pi-sdk";
import { SOUL_PRINCIPLE_LIST, type SoulPrincipleKey } from "@/lib/soul-principles";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

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
  soulPrinciple: SoulPrincipleKey | null;
  createdAt: string;
  tags?: Tag[];
}

interface SkillReview {
  id: string;
  skillId: string;
  userId: string;
  rating: number;
  review: string | null;
  createdAt: string;
}

interface SkillVersion {
  id: string;
  version: string;
  manifestMd: string;
  agentScript: string | null;
  testSuite: string | null;
  changelog: string | null;
  status: string;
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
  isInstalled: boolean;
  tags: Tag[];
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
  const { t, language } = useLanguage();
  const { user, connectWallet, isConnecting } = useWallet();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTier, setFilterTier] = useState<string>("");
  const [filterSoul, setFilterSoul] = useState<SoulPrincipleKey | "">("");
  const [selectedSkill, setSelectedSkill] = useState<SkillDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [skillStats, setSkillStats] = useState<{ totalExecutions: number; successRate: number; avgDurationMs: number | null } | null>(null);
  const [installing, setInstalling] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  // New States for Enhancements
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [reviews, setReviews] = useState<SkillReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [versions, setVersions] = useState<SkillVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [newRating, setNewRating] = useState<number>(5);
  const [newReviewText, setNewReviewText] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Total count of published skills across all pages (from the API), used for
  // the "Published" stat since `skills` only holds the pages loaded so far.
  const [totalSkills, setTotalSkills] = useState<number | null>(null);

  // Fetch Tags on mount
  useEffect(() => {
    const loadTags = async () => {
      try {
        const res = await fetch("/api/skills/tags");
        if (res.ok) {
          const data = await res.json();
          setAvailableTags(data.tags || []);
        }
      } catch {
        toast.error(language === "ar" ? "فشل تحميل الأوسمة" : "Failed to load tags");
      }
    };
    loadTags();
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (offset === 0) setSkills([]);
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filterTier) params.set("tier", filterTier);
        if (selectedTag) params.set("tags", selectedTag);
        if (filterSoul) params.set("soulPrinciple", filterSoul);
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
          setTotalSkills(typeof data.total === "number" ? data.total : null);
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
  }, [filterTier, selectedTag, filterSoul, searchQuery, offset]);

  const handleFilterChange = (tier: string) => {
    setFilterTier(tier);
    setFilterSoul("");
    setOffset(0);
  };

  const handleSoulFilterChange = (soul: SoulPrincipleKey | "") => {
    setFilterSoul(soul);
    setFilterTier("");
    setOffset(0);
  };

  const handleTagChange = (tagSlug: string) => {
    setSelectedTag(tagSlug);
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
    setReviews([]);
    setVersions([]);
    setNewRating(5);
    setNewReviewText("");
    setSkillStats(null);
    if (!selectedSkill || selectedSkill.slug !== slug) {
      setSelectedSkill(null);
    }
    try {
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("pi_access_token") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/skills/${slug}`, { 
        signal: controller.signal,
        headers
      });
      if (!res.ok) {
        setError(`Failed to load skill (${res.status})`);
        return;
      }
      const data = await res.json();
      setSelectedSkill(data);

      // Fetch Reviews in background
      setReviewsLoading(true);
      fetch(`/api/skills/${slug}/review`, { signal: controller.signal })
        .then(r => r.ok ? r.json() : { data: [] })
        .then(revData => {
          if (fetchAbortRef.current !== controller || controller.signal.aborted) return;
          const revs = Array.isArray(revData) ? revData : revData.data || [];
          setReviews(revs);
        })
        .catch(err => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          toast.error(language === "ar" ? "فشل تحميل المراجعات" : "Failed to load reviews");
        })
        .finally(() => {
          if (fetchAbortRef.current === controller && !controller.signal.aborted) {
            setReviewsLoading(false);
          }
        });

      // Fetch Versions in background
      setVersionsLoading(true);
      fetch(`/api/skills/${slug}/versions`, { signal: controller.signal })
        .then(r => r.ok ? r.json() : { versions: [] })
        .then(verData => {
          if (fetchAbortRef.current !== controller || controller.signal.aborted) return;
          const vers = verData.versions || verData.data?.versions || [];
          setVersions(vers);
        })
        .catch(err => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          toast.error(language === "ar" ? "فشل تحميل الإصدارات" : "Failed to load versions");
        })
        .finally(() => {
          if (fetchAbortRef.current === controller && !controller.signal.aborted) {
            setVersionsLoading(false);
          }
        });

      // Fetch stats separately — non-blocking, failures are silent
      fetch(`/api/skills/${slug}/stats`, { signal: controller.signal })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d) setSkillStats(d); })
        .catch(() => {});
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
      // Paid skills: Pi SDK callbacks (approve → complete) handle verification,
      // escrow creation, and RELEASED transition server-side. After the Promise
      // resolves, a RELEASED PiPayment with metadata.skillId exists for this user.
      // The install route's payment gate then allows the install.
      if (skill.pricePi > 0) {
        if (!user.agent?.id) {
          throw new Error(t("marketplace_need_agent"));
        }

        await createPiPayment(
          skill.pricePi,
          `Purchase of ${skill.name}`,
          { skillId: skill.id, agentId: user.agent.id, purpose: "skill_purchase" }
        );
      }

      const token = typeof localStorage !== "undefined" ? localStorage.getItem("pi_access_token") : null;
      const res = await fetch(`/api/skills/${skill.slug}/install`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || data?.error || 'Install failed (' + res.status + ')');
      }
      toast.success(t("marketplace_install_success"));
      openDetail(skill.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to install skill");
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async (skill: Pick<Skill, "slug" | "name">) => {
    if (!user) return;
    setInstalling(true);
    try {
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("pi_access_token") : null;
      const res = await fetch(`/api/skills/${skill.slug}/install`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || data?.error || 'Uninstall failed (' + res.status + ')');
      }
      toast.success(t("marketplace_uninstall_success") || "Skill uninstalled successfully!");
      openDetail(skill.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to uninstall skill");
    } finally {
      setInstalling(false);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkill) return;
    setSubmittingReview(true);
    setError(null);
    try {
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("pi_access_token") : null;
      if (!token) throw new Error(t("marketplace_login_required") || "Authentication required");
      
      const res = await fetch(`/api/skills/${selectedSkill.slug}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ rating: newRating, review: newReviewText }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || data?.error || "Failed to submit review");
      }
      
      const savedReview = await res.json();
      const reviewObj = savedReview.data || savedReview;
      setReviews(prev => [reviewObj, ...prev]);
      toast.success(t("marketplace_review_success") || "Review submitted successfully!");
      setNewReviewText("");
      setSelectedSkill(prev => {
        if (!prev) return null;
        const previousCount = prev.ratingCount || 0;
        const newCount = previousCount + 1;
        const newAvg = ((prev.avgRating * previousCount) + newRating) / newCount;
        return {
          ...prev,
          reviewCount: newCount,
          ratingCount: newCount,
          avgRating: newAvg,
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmittingReview(false);
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
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by SOUL principle">
                <button
                  onClick={() => handleSoulFilterChange("")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono border transition-colors ${
                    filterSoul === ""
                      ? "bg-neon-green/10 text-neon-green border-neon-green/30"
                      : "bg-white/5 text-faint border-white/10 hover:border-white/20"
                  }`}
                >
                  {t("marketplace_all")}
                </button>
                {SOUL_PRINCIPLE_LIST.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => handleSoulFilterChange(p.key)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-mono border transition-colors"
                    style={{
                      backgroundColor: filterSoul === p.key ? `${p.color}15` : undefined,
                      color: filterSoul === p.key ? p.color : undefined,
                      borderColor: filterSoul === p.key ? `${p.color}30` : undefined,
                    }}
                  >
                    {p.ar}
                  </button>
                ))}
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
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex flex-col sm:flex-row gap-3">
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

              {/* Tag filters */}
              {availableTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center border-t border-white/5 pt-3" role="group" aria-label="Filter by tag">
                  <span className="text-[10px] font-mono text-faint me-2">{t("marketplace_tags") || "Tags:"}</span>
                  <button
                    onClick={() => handleTagChange("")}
                    className={`px-2.5 py-1 rounded-md text-[9px] font-mono border transition-colors ${
                      selectedTag === ""
                        ? "bg-electric-blue/10 text-electric-blue border-electric-blue/30"
                        : "bg-white/5 text-faint border-white/10 hover:border-white/20"
                    }`}
                  >
                    {t("marketplace_all") || "All"}
                  </button>
                  {availableTags.map((tag) => {
                    const isSelected = selectedTag === tag.slug;
                    const color = tag.color || "#10b981";
                    return (
                      <button
                        key={tag.id}
                        onClick={() => handleTagChange(tag.slug)}
                        className="px-2.5 py-1 rounded-md text-[9px] font-mono border transition-colors"
                        style={{
                          borderColor: isSelected ? `${color}50` : "rgba(255, 255, 255, 0.1)",
                          color: isSelected ? color : "var(--text-muted)",
                          backgroundColor: isSelected ? `${color}15` : "rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        #{tag.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bento-card p-4 text-center">
                <span className="text-2xl font-bold text-neon-green font-mono">{totalSkills ?? skills.length}</span>
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
                        <div className="flex items-center gap-1.5">
                          {skill.soulPrinciple && <SoulBadge principle={skill.soulPrinciple} size="sm" />}
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
                      </div>

                      <p className="text-xs text-subtle line-clamp-2 mb-4 min-h-[32px] relative z-10">
                        {skill.description || t("marketplace_no_desc")}
                      </p>

                      {/* Tags list */}
                      {skill.tags && skill.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3 relative z-10">
                          {skill.tags.map((t) => {
                            const color = t.color || "#10b981";
                            return (
                              <span
                                key={t.id}
                                className="text-[7px] font-mono px-1 py-0.5 rounded-sm border"
                                style={{
                                  borderColor: `${color}30`,
                                  color: color,
                                  backgroundColor: `${color}08`,
                                }}
                              >
                                #{t.name}
                              </span>
                            );
                          })}
                        </div>
                      )}

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
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-start justify-between mb-2">
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

                {/* Skill tags inside modal */}
                {selectedSkill.tags && selectedSkill.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {selectedSkill.tags.map((t) => {
                      const color = t.color || "#10b981";
                      return (
                        <span
                          key={t.id}
                          className="text-[8px] font-mono px-2 py-0.5 rounded border"
                          style={{
                            borderColor: `${color}30`,
                            color: color,
                            backgroundColor: `${color}08`,
                          }}
                        >
                          #{t.name}
                        </span>
                      );
                    })}
                  </div>
                )}

                <p className="text-sm text-subtle mb-4">{selectedSkill.description || t("marketplace_no_desc")}</p>

                <div className="flex items-center gap-4 text-[10px] font-mono mb-6">
                  <span className="text-neon-green"><Download className="w-3 h-3 inline me-1" />{selectedSkill.installCount} {t("marketplace_installs_label")}</span>
                  <span className="text-amber-400"><Star className="w-3 h-3 inline me-1" />{(selectedSkill.avgRating ?? 0).toFixed(1)} ({selectedSkill.ratingCount})</span>
                  <span className="text-electric-blue"><Coins className="w-3 h-3 inline me-1" />{selectedSkill.pricePi === 0 ? t("marketplace_free") : `${selectedSkill.pricePi} π`}</span>
                  {selectedSkill.isInstalled && (
                    <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider">
                      {t("marketplace_installed") || "Installed"}
                    </span>
                  )}
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
                  <div className="mb-6">
                    <h3 className="text-xs font-mono font-bold mb-2" style={{ color: "var(--text-secondary)" }}>
                      {t("marketplace_test_suite")}
                    </h3>
                    <pre className="bg-black/40 border border-white/5 rounded-lg p-3 text-[10px] font-mono text-amber-400 overflow-x-auto max-h-48 scrollbar-thin whitespace-pre-wrap">
                      {selectedSkill.testSuite}
                    </pre>
                  </div>
                )}

                {/* Performance Stats */}
                {skillStats && skillStats.totalExecutions > 0 && (
                  <div className="mb-4 p-3 bg-black/30 border border-white/5 rounded-lg">
                    <h3 className="text-xs font-mono font-bold mb-2" style={{ color: "var(--text-secondary)" }}>
                      {language === "ar" ? "الأداء" : "Performance"}
                    </h3>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <span className="text-lg font-bold font-mono text-neon-green">{skillStats.totalExecutions}</span>
                        <p className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>{language === "ar" ? "عمليات التشغيل" : "executions"}</p>
                      </div>
                      <div>
                        <span className="text-lg font-bold font-mono text-electric-blue">{skillStats.successRate}%</span>
                        <p className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>{language === "ar" ? "معدل النجاح" : "success rate"}</p>
                      </div>
                      <div>
                        <span className="text-lg font-bold font-mono text-axiom-purple">{skillStats.avgDurationMs === null ? '—' : `${skillStats.avgDurationMs}ms`}</span>
                        <p className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>{language === "ar" ? "متوسط المدة" : "avg duration"}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Version History (Changelog) */}
                {(versionsLoading || versions.length > 0) && (
                  <div className="mb-6 border-t border-white/5 pt-4">
                    <h3 className="text-xs font-mono font-bold mb-2 text-surface">
                      {t("marketplace_version_history") || "Version History & Changelogs"}
                    </h3>
                    {versionsLoading ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-10 bg-white/5 rounded" />
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin pr-1">
                        {versions.map((ver) => (
                          <div key={ver.id} className="bg-white/5 border border-white/5 rounded-lg p-2.5 text-[9px] font-mono">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-emerald-400 font-bold">v{ver.version}</span>
                              <span className="text-faint">{new Date(ver.createdAt).toLocaleDateString()}</span>
                            </div>
                            {ver.changelog && (
                              <p className="text-subtle leading-relaxed whitespace-pre-wrap mt-1 border-t border-white/5 pt-1">{ver.changelog}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Reviews & Ratings Section */}
                <div className="mb-6 border-t border-white/5 pt-4">
                  <h3 className="text-xs font-mono font-bold mb-3 text-surface">
                    {t("marketplace_reviews") || "Community Reviews"}
                  </h3>

                  {/* Add Review Form */}
                  {selectedSkill.isInstalled && user && (
                    <form onSubmit={handleAddReview} className="bg-white/5 border border-white/10 rounded-lg p-3 mb-4">
                      <h4 className="text-[10px] font-mono font-bold mb-2 text-surface">{t("marketplace_add_review") || "Write a Review"}</h4>
                      <div className="flex gap-2 items-center mb-2">
                        <span className="text-[9px] font-mono text-faint">{t("marketplace_rating") || "Rating:"}</span>
                        <div className="flex gap-1" role="img" aria-label={`Rating: ${newRating} out of 5 stars`}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setNewRating(star)}
                              aria-label={`Set rating to ${star} out of 5`}
                              aria-pressed={newRating === star}
                              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                            >
                              <Star className={`w-3.5 h-3.5 ${star <= newRating ? "text-amber-400 fill-amber-400" : "text-gray-600"}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        value={newReviewText}
                        onChange={(e) => setNewReviewText(e.target.value)}
                        placeholder={t("marketplace_review_placeholder") || "Share your feedback about this skill..."}
                        className="w-full bg-black/20 border border-white/10 rounded p-2 text-[10px] font-mono text-surface placeholder-gray-600 focus:outline-none focus:border-emerald-500/40 mb-2 min-h-[40px] resize-y"
                        required
                      />
                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="btn-primary text-[8px] font-mono px-2.5 py-1.5"
                      >
                        {submittingReview ? t("marketplace_submitting") || "Submitting..." : t("marketplace_submit") || "Submit Review"}
                      </button>
                    </form>
                  )}

                  {/* Reviews List */}
                  {reviewsLoading ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-10 bg-white/5 rounded" />
                      <div className="h-10 bg-white/5 rounded" />
                    </div>
                  ) : reviews.length === 0 ? (
                    <p className="text-[9px] font-mono text-muted text-center py-2">{t("marketplace_no_reviews") || "No reviews yet."}</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                      {reviews.map((rev) => (
                        <div key={rev.id} className="border-b border-white/5 pb-2 last:border-b-0">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex gap-1.5 items-center">
                              <span className="text-[9px] font-mono text-surface font-bold">User {rev.userId.slice(0, 8)}</span>
                              <div className="flex gap-0.5" role="img" aria-label={`Rating: ${rev.rating} stars`}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star key={star} className={`w-2 h-2 ${star <= rev.rating ? "text-amber-400 fill-amber-400" : "text-gray-700"}`} />
                                ))}
                              </div>
                            </div>
                            <span className="text-faint text-[8px] font-mono">{new Date(rev.createdAt).toLocaleDateString()}</span>
                          </div>
                          {rev.review && (
                            <p className="text-subtle text-[9px] font-mono leading-relaxed whitespace-pre-wrap">{rev.review}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6 border-t border-white/5 pt-4">
                  {selectedSkill.isInstalled ? (
                    <button
                      onClick={() => handleUninstall(selectedSkill)}
                      disabled={installing || isConnecting}
                      aria-busy={installing}
                      aria-label={installing ? t("marketplace_uninstalling") || "Uninstalling..." : t("marketplace_uninstall") || "Uninstall Skill"}
                      className="flex-1 btn-ghost border-red-500/30 hover:bg-red-500/10 text-red-400 py-2.5 text-xs font-mono uppercase"
                    >
                      {installing ? t("marketplace_uninstalling") || "Uninstalling..." : t("marketplace_uninstall") || "Uninstall Skill"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleInstall(selectedSkill)}
                      disabled={installing || isConnecting}
                      aria-busy={installing}
                      aria-label={installing ? t("marketplace_installing") : isConnecting ? t("marketplace_connecting") : !user ? t("marketplace_connect_install") : t("marketplace_install_skill")}
                      className="flex-1 btn-primary py-2.5 text-xs font-mono uppercase"
                    >
                      {installing ? t("marketplace_installing") : isConnecting ? t("marketplace_connecting") : !user ? t("marketplace_connect_install") : t("marketplace_install_skill")}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(JSON.stringify({
                          slug: selectedSkill.slug,
                          manifest: selectedSkill.manifestMd,
                          script: selectedSkill.agentScript,
                        }, null, 2));
                      }
                    }}
                    className="btn-ghost py-2.5 text-xs font-mono px-4"
                  >
                    {t("marketplace_copy_payload")}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
      </dialog>
    </>
  );
}
