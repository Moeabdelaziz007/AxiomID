"use client";

import { QRCodeSVG } from "qrcode.react";

interface AgentQRProps {
  did: string;
  size?: number;
}

export function AgentQR({ did, size = 160 }: AgentQRProps) {
  const qrValue = `https://axiomid.app/passport/${did.split(':').pop()}`;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="bg-white p-3 rounded-xl">
        <QRCodeSVG
          value={qrValue}
          aria-label={`QR code for DID: ${did}`}
          size={size}
          bgColor="#ffffff"
          fgColor="#0a0a0a"
          level="M"
          includeMargin={false}
        />
      </div>
      <span className="text-[8px] font-mono text-gray-500 text-center max-w-[180px] break-all">
        {did}
      </span>
    </div>
  );
}
