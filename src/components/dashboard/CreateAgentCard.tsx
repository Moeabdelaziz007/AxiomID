"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";
import { PiPaymentButton } from "@/components/PiPaymentButton";

interface CreateAgentCardProps {
  onCreate: (name?: string) => Promise<void>;
  requiresPayment?: boolean;
  paymentAmount?: number;
}

export function CreateAgentCard({ 
  onCreate, 
  requiresPayment = false,
  paymentAmount = 1 
}: CreateAgentCardProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const handleCreate = async () => {
    setLoading(true);
    await onCreate(name || undefined);
    setLoading(false);
    setName("");
  };

  return (
    <div className="bento-card p-6 sm:p-8" style={{ borderColor: 'var(--card-border)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <Bot className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('create_agent_title')}</h3>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t('create_agent_desc')}</p>
        </div>
      </div>
      <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>
        {t('create_agent_tier_info')}
      </p>
      
      <div className="flex gap-3 mb-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('create_agent_placeholder')}
          className="flex-1 rounded-lg px-4 py-2 text-sm font-mono transition-colors focus:outline-none focus:border-blue-500/40"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
        />
      </div>

      {requiresPayment ? (
        <PiPaymentButton
          amount={paymentAmount}
          memo={`Create Agent: ${name || "My Agent"}`}
          metadata={{ purpose: "agent_creation", agentName: name }}
          onSuccess={() => handleCreate()}
          disabled={!name.trim()}
        >
          Create Agent
        </PiPaymentButton>
      ) : (
        <button
          onClick={handleCreate}
          disabled={loading || !name.trim()}
          className="btn-primary text-sm px-5 py-2.5 w-full"
        >
          {loading ? t('create_agent_creating') : t('create_agent_create')}
        </button>
      )}
    </div>
  );
}
