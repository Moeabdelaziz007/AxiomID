"use client";

import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/app/context/language-context";
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ExternalLink, Copy, CheckCircle2, Loader2, BarChart3, DollarSign, Pi, Shield, Zap, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface RevenueData {
  testnet: {
    totalRevenue: number;
    totalTransactions: number;
    avgRevenuePerTx: number;
    apps: Array<{
      id: string;
      name: string;
      revenue: number;
      transactions: number;
      status: "active" | "inactive" | "pending";
    }>;
  };
  mainnet: {
    totalRevenue: number;
    developerShare: number;
    platformFee: number;
    totalTransactions: number;
    apps: Array<{
      id: string;
      name: string;
      revenue: number;
      developerEarnings: number;
      platformFee: number;
      transactions: number;
      status: "active" | "inactive" | "pending";
    }>;
  };
  walletAddress: string;
  lastUpdated: string;
}

type AppRevenue = RevenueData["testnet"]["apps"][0] | RevenueData["mainnet"]["apps"][0];

interface Transaction {
  id: string;
  timestamp: string;
  type: "sale" | "purchase" | "fee" | "refund";
  amount: number;
  currency: "PI" | "USD";
  status: "completed" | "pending" | "failed";
  appName: string;
  txHash: string;
}

const WALLET_ADDRESS = "GCLXRHXZT44XQEQWIIWLAZOR2NYFWPYSKMUPFXVXPP4UENH2SMWJ2X36";
const BLOCK_EXPLORER_URL = "https://blockexplorer.minepi.com";

function formatPI(amount: number): string {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(amount);
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

function copyToClipboard(text: string, setCopied: (val: boolean) => void) {
  navigator.clipboard.writeText(text);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
}

const SkeletonCard = () => (
  <div className="bento-card p-6 animate-pulse space-y-4">
    <div className="h-6 bg-glass rounded w-1/4" />
    <div className="h-12 bg-glass rounded w-1/2" />
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map(i => <div key={i} className="h-10 bg-glass rounded" />)}
    </div>
  </div>
);

const StatCard = ({ icon: Icon, label, value, trend, trendLabel, accent = "emerald" }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  trend?: { value: number; label: string };
  trendLabel?: string;
  accent?: "emerald" | "blue" | "purple" | "amber";
}) => {
  const accentColors = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-electric-blue bg-electric-blue/10 border-electric-blue/20",
    purple: "text-axiom-purple bg-axiom-purple/10 border-axiom-purple/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };

  const colors = accentColors[accent];

  return (
    <motion.div
      className="bento-card p-6 relative overflow-hidden group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/[0.02] to-transparent pointer-events-none" />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-faint uppercase tracking-wider">{label}</p>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1">{value}</p>
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold ${trend.value >= 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
            {trend.value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{trendLabel || `${Math.abs(trend.value)}%`}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const AppRevenueCard = ({ app, environment, onViewDetails }: {
  app: AppRevenue;
  environment: "testnet" | "mainnet";
  onViewDetails: (app: AppRevenue) => void;
}) => {
  const { t } = useLanguage();
  const isMainnet = environment === "mainnet";
  const revenue = isMainnet ? (app as RevenueData["mainnet"]["apps"][0]).developerEarnings : (app as RevenueData["testnet"]["apps"][0]).revenue;
  const platformFee = isMainnet ? (app as RevenueData["mainnet"]["apps"][0]).platformFee : 0;

  return (
    <motion.div
      className="bento-card p-5 relative group"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center text-electric-blue">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">{app.name}</h4>
            <p className="text-[10px] font-mono text-faint">{app.id}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-[9px] font-mono uppercase tracking-wider font-semibold ${app.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : app.status === "pending" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"}`}>
          {t(`status_${app.status}`)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
          <p className="text-[9px] font-mono text-faint uppercase tracking-wider">{t("your_earnings")}</p>
          <p className="text-emerald-400 font-bold font-mono text-lg">{formatPI(revenue)} <span className="text-[10px] font-normal text-zinc-400">PI</span></p>
        </div>
        {isMainnet && platformFee > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <p className="text-[9px] font-mono text-faint uppercase tracking-wider">{t("platform_fee")}</p>
            <p className="text-axiom-purple font-bold font-mono text-lg">{formatPI(platformFee)} <span className="text-[10px] font-normal text-zinc-400">PI</span></p>
          </div>
        )}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
          <p className="text-[9px] font-mono text-faint uppercase tracking-wider">{t("transactions")}</p>
          <p className="text-electric-blue font-bold font-mono text-lg">{formatNumber(app.transactions)}</p>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
          <p className="text-[9px] font-mono text-faint uppercase tracking-wider">{t("avg_per_tx")}</p>
          <p className="text-axiom-purple font-bold font-mono text-sm">{isMainnet ? formatPI((app as RevenueData["mainnet"]["apps"][0]).developerEarnings / Math.max(1, app.transactions)) : formatPI(app.revenue / Math.max(1, app.transactions))} PI</p>
        </div>
      </div>

      <button
        onClick={() => onViewDetails(app)}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs tracking-wider transition-all focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:outline-none bg-glass border border-glass-hover text-subtle hover:bg-white/5 hover:text-white"
      >
        {t("view_details")}
        <ArrowUpRight className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};

const TransactionRow = ({ tx }: { tx: Transaction }) => {
  const { t } = useLanguage();
  const isPositive = tx.type === "sale";

  return (
    <motion.tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <td className="py-3 px-4 text-[10px] font-mono text-faint">{new Date(tx.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider ${tx.type === "sale" ? "bg-emerald-500/10 text-emerald-400" : tx.type === "fee" ? "bg-axiom-purple/10 text-axiom-purple" : tx.type === "refund" ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"}`}>
          {tx.type}
        </span>
      </td>
      <td className="py-3 px-4 text-sm font-mono text-white">{tx.appName}</td>
      <td className="py-3 px-4 font-mono text-sm">{isPositive ? "+" : "-"}{formatPI(tx.amount)} <span className="text-[10px] text-zinc-400">{tx.currency}</span></td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider ${tx.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : tx.status === "pending" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`}>
          {tx.status}
        </span>
      </td>
      <td className="py-3 px-4 text-[10px] font-mono text-faint truncate max-w-[120px]">{tx.txHash}</td>
    </motion.tr>
  );
};

export default function RevenueTab({ user }: { user: any }) {
  const { t, language } = useLanguage();
  const [environment, setEnvironment] = useState<"testnet" | "mainnet">("testnet");
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedApp, setSelectedApp] = useState<RevenueData["testnet"]["apps"][0] | RevenueData["mainnet"]["apps"][0] | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);

  // Mock data - in production this would come from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await new Promise(r => setTimeout(r, 800));
      
      const mockData: RevenueData = {
        walletAddress: WALLET_ADDRESS,
        lastUpdated: new Date().toISOString(),
        testnet: {
          totalRevenue: 12450.75,
          totalTransactions: 1247,
          avgRevenuePerTx: 9.98,
          apps: [
            { id: "app_001", name: "Agent Marketplace", revenue: 8420.50, transactions: 842, status: "active" },
            { id: "app_002", name: "Skill Registry", revenue: 3100.25, transactions: 310, status: "active" },
            { id: "app_003", name: "Trust Score API", revenue: 930.00, transactions: 95, status: "active" },
          ],
        },
        mainnet: {
          totalRevenue: 48500.00,
          developerShare: 33950.00,
          platformFee: 14550.00,
          totalTransactions: 3892,
          apps: [
            { id: "app_001", name: "Agent Marketplace", revenue: 48500.00, developerEarnings: 33950.00, platformFee: 14550.00, transactions: 3892, status: "active" },
            { id: "app_002", name: "Skill Registry", revenue: 0, developerEarnings: 0, platformFee: 0, transactions: 0, status: "pending" },
            { id: "app_003", name: "Trust Score API", revenue: 0, developerEarnings: 0, platformFee: 0, transactions: 0, status: "inactive" },
          ],
        },
      };
      setRevenueData(mockData);

      const mockTransactions: Transaction[] = [
        { id: "tx_001", timestamp: new Date(Date.now() - 3600000).toISOString(), type: "sale", amount: 12.50, currency: "PI", status: "completed", appName: "Agent Marketplace", txHash: "0x7a3f...9b2c" },
        { id: "tx_002", timestamp: new Date(Date.now() - 7200000).toISOString(), type: "sale", amount: 8.75, currency: "PI", status: "completed", appName: "Skill Registry", txHash: "0x4f1e...2a8d" },
        { id: "tx_003", timestamp: new Date(Date.now() - 10800000).toISOString(), type: "fee", amount: 3.75, currency: "PI", status: "completed", appName: "Agent Marketplace", txHash: "0x9c2b...5f1a" },
        { id: "tx_004", timestamp: new Date(Date.now() - 86400000).toISOString(), type: "sale", amount: 25.00, currency: "PI", status: "completed", appName: "Agent Marketplace", txHash: "0x1e8a...7c4f" },
        { id: "tx_005", timestamp: new Date(Date.now() - 172800000).toISOString(), type: "refund", amount: 5.00, currency: "PI", status: "completed", appName: "Trust Score API", txHash: "0x3d7f...1b9e" },
      ];
      setTransactions(mockTransactions);
      setLoading(false);
    };

    fetchData();
  }, []);

  const data = environment === "testnet" ? revenueData?.testnet : revenueData?.mainnet;
  const isMainnet = environment === "mainnet";
  const apps = data?.apps || [];

  const totalRevenue = data?.totalRevenue || 0;
  const totalTransactions = data?.totalTransactions || 0;
  const avgRevenue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const developerShare = isMainnet ? (revenueData?.mainnet.developerShare || 0) : totalRevenue;
  const platformFee = isMainnet ? (revenueData?.mainnet.platformFee || 0) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-electric-blue/10 text-electric-blue text-[10px] font-mono tracking-widest uppercase font-semibold mb-3">
            <BarChart3 className="w-3.5 h-3.5" />
            {t("revenue_dashboard")}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{t("app_revenue_title")}</h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">{t("app_revenue_desc")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTransactions(!showTransactions)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs tracking-wider bg-glass border border-glass-hover text-subtle hover:bg-white/5 hover:text-white transition-all focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:outline-none"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            {showTransactions ? t("hide_transactions") : t("view_transactions")}
          </button>
          <a
            href={`${BLOCK_EXPLORER_URL}/address/${WALLET_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs tracking-wider border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:border-white/20 transition-all focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:outline-none"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t("block_explorer")}
          </a>
        </div>
      </motion.div>

      {/* Wallet Address Card */}
      <motion.div className="bento-card p-5 relative overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <div className="absolute inset-0 bg-gradient-to-r from-electric-blue/5 via-transparent to-axiom-purple/5 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-faint uppercase tracking-wider">{t("wallet_address")}</p>
              <div className="flex items-center gap-2 mt-1">
                <code className="font-mono text-sm text-white bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.05] select-all">{WALLET_ADDRESS}</code>
                <button
                  onClick={() => copyToClipboard(WALLET_ADDRESS, setCopied)}
                  className={`p-2 rounded-lg transition-all ${copied ? "bg-emerald-500/20 text-emerald-400" : "bg-white/[0.03] text-zinc-400 hover:bg-white/5 hover:text-white"}`}
                  aria-label={copied ? t("copied") : t("copy_address")}
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2 sm:pt-0">
            <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 text-center min-w-[160px]">
              <p className="text-[9px] font-mono text-faint uppercase tracking-wider">{t("last_updated")}</p>
              <p className="text-sm font-mono text-white mt-1">{revenueData ? new Date(revenueData.lastUpdated).toLocaleString() : "—"}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Environment Toggle */}
      <motion.div className="bento-card p-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-faint uppercase tracking-wider mb-2">{t("environment")}</p>
            <p className="text-sm text-zinc-400">{isMainnet ? t("mainnet_desc") : t("testnet_desc")}</p>
          </div>
          <div className="relative inline-flex items-center p-1 bg-white/[0.03] rounded-xl">
            <button
              onClick={() => setEnvironment("testnet")}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${environment === "testnet" ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "text-zinc-400 hover:text-white"}`}
            >
              <Zap className="w-3.5 h-3.5 inline mr-1" />
              {t("testnet")}
            </button>
            <button
              onClick={() => setEnvironment("mainnet")}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${environment === "mainnet" ? "bg-axiom-purple text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]" : "text-zinc-400 hover:text-white"}`}
            >
              <Pi className="w-3.5 h-3.5 inline mr-1" />
              {t("mainnet")}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Revenue Split Info (Mainnet only) */}
      {isMainnet && revenueData && (
        <motion.div className="bento-card p-5 relative overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <div className="absolute inset-0 bg-gradient-to-r from-axiom-purple/5 via-transparent to-emerald-500/5 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-axiom-purple flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-black" />
              </div>
              <div>
                <h3 className="font-bold text-white">{t("revenue_split")}</h3>
                <p className="text-xs text-faint">{t("revenue_split_desc")}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-[9px] font-mono text-faint uppercase tracking-wider">{t("your_share")}</p>
                <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{formatPI(developerShare)} <span className="text-[10px] font-normal">PI</span></p>
                <p className="text-xs text-emerald-400/70 mt-1">{t("seventy_percent")}</p>
              </div>
              <div className="bg-axiom-purple/10 border border-axiom-purple/20 rounded-xl p-4">
                <p className="text-[9px] font-mono text-faint uppercase tracking-wider">{t("platform_fee")}</p>
                <p className="text-2xl font-bold font-mono text-axiom-purple mt-1">{formatPI(platformFee)} <span className="text-[10px] font-normal">PI</span></p>
                <p className="text-xs text-axiom-purple/70 mt-1">{t("thirty_percent")}</p>
              </div>
            </div>
            <div className="mt-4 h-2 bg-white/[0.03] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-axiom-purple" style={{ width: "70%" }} />
            </div>
          </div>
        </motion.div>
      )}

      {/* Testnet Notice */}
      {!isMainnet && (
        <motion.div className="bento-card p-4 border border-emerald-500/20 bg-emerald-500/5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-emerald-400">{t("testnet_notice_title")}</p>
              <p className="text-sm text-zinc-300 mt-1">{t("testnet_notice_desc")}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Key Stats */}
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
        <StatCard
          icon={DollarSign}
          label={t("total_revenue")}
          value={`${formatPI(totalRevenue)} PI`}
          trend={{ value: 23.5, label: t("vs_last_month") }}
          accent="emerald"
        />
        <StatCard
          icon={TrendingUp}
          label={t("developer_earnings")}
          value={`${formatPI(developerShare)} PI`}
          trend={{ value: isMainnet ? 18.2 : 31.7, label: t("vs_last_month") }}
          accent="blue"
        />
        <StatCard
          icon={BarChart3}
          label={t("transactions")}
          value={formatNumber(totalTransactions)}
          trend={{ value: 12.8, label: t("vs_last_month") }}
          accent="purple"
        />
        <StatCard
          icon={Zap}
          label={t("avg_per_transaction")}
          value={`${formatPI(avgRevenue)} PI`}
          trend={{ value: -2.1, label: t("vs_last_month") }}
          accent="amber"
        />
      </motion.div>

      {/* Apps Revenue Table */}
      <motion.div className="bento-card overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
        <div className="p-5 border-b border-white/[0.05]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-white">{t("apps_revenue")}</h3>
              <p className="text-xs text-faint mt-0.5">{t("apps_revenue_desc")}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-faint">{apps.length} {t("apps")}</span>
            </div>
          </div>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : apps.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">{t("no_apps_yet")}</p>
              <a href="/dashboard/marketplace" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs tracking-wider bg-gradient-to-r from-electric-blue to-axiom-purple text-white hover:from-electric-blue/90 hover:to-axiom-purple/90 transition-all">
                {t("create_first_app")}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {apps.map((app, index) => (
                <AppRevenueCard
                  key={app.id}
                  app={app}
                  environment={environment}
                  onViewDetails={setSelectedApp}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Transactions Table */}
      <AnimatePresence>
        {showTransactions && (
          <motion.div className="bento-card overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
            <div className="p-5 border-b border-white/[0.05] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-bold text-white">{t("transaction_history")}</h3>
                <p className="text-xs text-faint mt-0.5">{t("transaction_history_desc")}</p>
              </div>
              <a
                href={`${BLOCK_EXPLORER_URL}/address/${WALLET_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {t("view_on_explorer")}
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    <th className="py-3 px-4 text-[9px] font-mono text-faint uppercase tracking-wider">{t("date")}</th>
                    <th className="py-3 px-4 text-[9px] font-mono text-faint uppercase tracking-wider">{t("type")}</th>
                    <th className="py-3 px-4 text-[9px] font-mono text-faint uppercase tracking-wider">{t("app")}</th>
                    <th className="py-3 px-4 text-[9px] font-mono text-faint uppercase tracking-wider">{t("amount")}</th>
                    <th className="py-3 px-4 text-[9px] font-mono text-faint uppercase tracking-wider">{t("status")}</th>
                    <th className="py-3 px-4 text-[9px] font-mono text-faint uppercase tracking-wider">{t("tx_hash")}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse border-b border-white/[0.04]">
                        <td className="py-3 px-4"><div className="h-4 bg-glass rounded w-24" /></td>
                        <td className="py-3 px-4"><div className="h-4 bg-glass rounded w-20" /></td>
                        <td className="py-3 px-4"><div className="h-4 bg-glass rounded w-28" /></td>
                        <td className="py-3 px-4"><div className="h-4 bg-glass rounded w-20" /></td>
                        <td className="py-3 px-4"><div className="h-4 bg-glass rounded w-16" /></td>
                        <td className="py-3 px-4"><div className="h-4 bg-glass rounded w-32" /></td>
                      </tr>
                    ))
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td className="py-8 px-4 text-center text-zinc-500" colSpan={6}>{t("no_transactions")}</td>
                    </tr>
                  ) : (
                    transactions.map((tx, index) => (
                      <TransactionRow key={tx.id} tx={tx} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* App Detail Modal */}
      <AnimatePresence>
        {selectedApp && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedApp(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedApp(null)} />
            <motion.div
              className="relative bento-card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 border-b border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center text-electric-blue">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{selectedApp.name}</h3>
                    <p className="text-[10px] font-mono text-faint">{selectedApp.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="p-2 rounded-lg bg-white/[0.03] text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                  aria-label={t("close")}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
                    <p className="text-[9px] font-mono text-faint uppercase tracking-wider">{t("your_earnings")}</p>
                    <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{formatPI(isMainnet ? (selectedApp as RevenueData["mainnet"]["apps"][0]).developerEarnings : (selectedApp as RevenueData["testnet"]["apps"][0]).revenue)} <span className="text-[10px] font-normal text-zinc-400">PI</span></p>
                  </div>
                  {isMainnet && (selectedApp as RevenueData["mainnet"]["apps"][0]).platformFee > 0 && (
                    <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
                      <p className="text-[9px] font-mono text-faint uppercase tracking-wider">{t("platform_fee")}</p>
                      <p className="text-2xl font-bold font-mono text-axiom-purple mt-1">{formatPI((selectedApp as RevenueData["mainnet"]["apps"][0]).platformFee)} <span className="text-[10px] font-normal text-zinc-400">PI</span></p>
                    </div>
                  )}
                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
                    <p className="text-[9px] font-mono text-faint uppercase tracking-wider">{t("transactions")}</p>
                    <p className="text-2xl font-bold font-mono text-electric-blue mt-1">{formatNumber(selectedApp.transactions)}</p>
                  </div>
                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
                    <p className="text-[9px] font-mono text-faint uppercase tracking-wider">{t("status")}</p>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold mt-1 ${selectedApp.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : selectedApp.status === "pending" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"}`}>
                      {t(`status_${selectedApp.status}`)}
                    </span>
                  </div>
                </div>
                <div className="pt-4 border-t border-white/[0.05]">
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs tracking-wider transition-all focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:outline-none bg-glass border border-glass-hover text-subtle hover:bg-white/5 hover:text-white"
                  >
                    {t("close")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}