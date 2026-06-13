"use client";

import { useLanguage } from "@/app/context/language-context";

interface TrustScoreGaugeProps {
  score: number;
  size?: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#00ff41";
  if (score >= 60) return "#00d4ff";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

export function TrustScoreGauge({ score, size = 120 }: TrustScoreGaugeProps) {
  const { t } = useLanguage();
  const color = getScoreColor(score);
  const label = score >= 90 ? t('score_excellent') : score >= 70 ? t('score_strong') : score >= 50 ? t('score_moderate') : score >= 30 ? t('score_low') : t('score_new');
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="trust-gauge" style={{ width: size, height: size }} role="img" aria-label={`Trust score: ${score} out of 100, ${label}`}>
      <svg
        className="trust-gauge-ring"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background ring */}
        <circle
          className="trust-gauge-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          className="trust-gauge-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      {/* Center text */}
      <div className="trust-gauge-text flex-col items-center justify-center">
        <span
          className="text-2xl font-bold"
          style={{ color, textShadow: `0 0 10px ${color}40` }}
        >
          {score}
        </span>
        <span className="text-[8px] tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
    </div>
  );
}
