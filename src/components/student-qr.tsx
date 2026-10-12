"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QrCode } from "lucide-react";
import { issueQrAction, qrStatusAction } from "@/features/check-ins/qr-actions";
import { QR_PREFIX, type QrIssued } from "@/features/check-ins/qr-schema";
import { QrCodeCanvas } from "./qr-code-canvas";
import { Spinner } from "./ui";

export function StudentQr({ academyId, studentId }: { academyId: string; studentId: string }) {
  const [qr, setQr] = useState<QrIssued | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => {
    if (!qr) return;
    const deadline = performance.now() + Math.max(0, Date.parse(qr.expires_at) - Date.parse(qr.server_now));
    let active = true;
    let checking = false;
    const tick = async () => {
      if (!active) return;
      const seconds = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
      setRemaining(seconds);
      if (checking) return;
      checking = true;
      try {
        const result = await qrStatusAction(academyId, qr.id);
        if (!active) return;
        if (result.error) setMessage(result.error);
        if (result.status?.consumed) { setConfirmed(true); setQr(null); setMessage(""); router.refresh(); }
        else if (result.status?.expired || result.status?.revoked) { setQr(null); setMessage("QR expirado ou substituído. Gere outro para continuar."); }
        else setMessage("");
      } catch { if (active) setMessage("Sem conexão para confirmar o treino. Reconecte e atualize seu perfil."); }
      finally { checking = false; }
    };
    const countdown = setInterval(() => setRemaining(Math.max(0, Math.ceil((deadline - performance.now()) / 1000))), 1000);
    const polling = setInterval(() => void tick(), 4000);
    void tick();
    return () => { active = false; clearInterval(countdown); clearInterval(polling); };
  }, [qr, academyId, router]);
  return <section className="panel qr-panel"><h2>Minha presença por QR</h2><p>Mostre ao professor. O QR dura 2 minutos e pode ser utilizado uma vez.</p>
    {confirmed && <p role="status" className="feedback feedback-success">Treino confirmado pelo professor. Confira sua jornada atualizada.</p>}
    {qr && remaining > 0 ? <><QrCodeCanvas value={QR_PREFIX + qr.token} /><p className="qr-countdown">Válido por {remaining}s</p></> : qr ? <p role="status">QR expirado. Gere outro quando o professor estiver pronto.</p> : null}
    {message && <p role="alert" className="feedback feedback-error">{message}</p>}
    <button className="button button-primary" disabled={pending} onClick={() => startTransition(async () => {
      setQr(null); setMessage(""); setConfirmed(false);
      try { const result = await issueQrAction(academyId, studentId); if (result.qr) { setRemaining(120); setQr(result.qr); } else setMessage(result.error ?? "Não foi possível gerar o QR."); }
      catch { setMessage("Não foi possível gerar o QR. Confira a conexão e tente novamente."); }
    })}>{pending ? <Spinner /> : <QrCode size={18} />}{qr ? "Renovar QR" : "Gerar QR de presença"}</button>
    <p className="policy-note">O check-in manual continua disponível. Este QR não contém seu nome, e-mail ou credencial de login.</p>
  </section>;
}
