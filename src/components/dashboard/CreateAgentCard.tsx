"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, ArrowRight } from "lucide-react";

interface CreateAgentCardProps {
  onCreate: (name?: string) => Promise<void>;
}

export function CreateAgentCard({ onCreate }: CreateAgentCardProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    await onCreate(name || undefined);
    setLoading(false);
    setName("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bento-card p-6 sm:p-8 border border-axiom-purple/20 bg-axiom-purple/5"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-axiom-purple/10 border border-axiom-purple/30 flex items-center justify-center">
          <Bot className="w-5 h-5 text-axiom-purple" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Create Your Agent</h3>
          <p className="text-[11px] text-gray-500">Give your agent a name to get started.</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-5">
        Your agent will begin at Tier 1 with 0 XP and can be activated anytime.
      </p>
      <div className="flex gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Agent name (optional)"
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-green/40 font-mono transition-colors"
        />
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCreate}
          disabled={loading}
          className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2 group"
        >
          {loading ? "CREATING..." : "CREATE"}
          {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
        </motion.button>
      </div>
    </motion.div>
  );
}
