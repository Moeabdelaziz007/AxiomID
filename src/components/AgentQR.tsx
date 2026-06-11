"use client";

import { QRCodeSVG } from "qrcode.react";

interface AgentQRProps {
  did: string;
  walletAddress: string;
  size?: number;
}

export function AgentQR({ did, walletAddress, size = 160 }: AgentQRProps) {
  const qrValue = JSON.stringify({
    type: "AxiomID",
    did,
    wallet: walletAddress,
    network: "pi",
    version: "1.0",
  });

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="bg-white p-3 rounded-xl">
        <QRCodeSVG
          value={qrValue}
          size={size}
          bgColor="#ffffff"
          fgColor="#0a0a0a"
          level="M"
          includeMargin={false}
          imageSettings={{
            src: "",
            height: 0,
            width: 0,
            excavate: false,
          }}
        />
      </div>
      <span className="text-[8px] font-mono text-gray-500 text-center max-w-[180px] break-all">
        {did}
      </span>
    </div>
  );
}
