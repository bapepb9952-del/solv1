"use client";
// Adapted from electrocicla/martial-arts-manager, commit 1c05e47bc643fe1e0ee13be09fd73c2ca713dce4.
// Copyright (c) 2025-2026 Luis Salgado Reyes. MIT; full notice: public/licenses/martial-arts-manager-MIT.txt.
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export function QrCodeCanvas({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failedValue, setFailedValue] = useState<string | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let active = true;
    QRCode.toCanvas(canvas, value, { width: 256, margin: 4, errorCorrectionLevel: "M", color: { dark: "#17231f", light: "#ffffff" } })
      .catch(() => { if (active) setFailedValue(value); });
    return () => { active = false; };
  }, [value]);
  if (failedValue === value) return <p className="feedback feedback-error" role="alert">Não foi possível desenhar o QR. Gere um novo ou peça o check-in manual ao professor.</p>;
  return <canvas ref={canvasRef} width={256} height={256} className="qr-canvas" role="img" aria-label="QR temporário para o professor confirmar sua presença" />;
}
