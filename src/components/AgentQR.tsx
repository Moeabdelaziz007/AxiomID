"use client";

import { QRCodeSVG } from "qrcode.react";

interface AgentQRProps {
  did: string;
  size?: number;
}

/**
 * Render a centered QR code for a DID with a small monospaced DID label below it.
 *
 * @param did - The Decentralized Identifier (DID) string to encode in the QR code.
 * @param size - The width and height in pixels of the generated QR code. Defaults to `160`.
 * @returns A JSX element containing the QR code for `did` and a monospaced, wrapped/truncated label showing the DID.
 */
export function AgentQR({ did, size = 160 }: AgentQRProps) {
  const qrValue = did;

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
