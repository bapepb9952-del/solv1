"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { Camera, CameraOff } from "lucide-react";
import { previewQrAction, redeemQrAction } from "@/features/check-ins/qr-actions";
import { type QrPreview } from "@/features/check-ins/qr-schema";
import { Spinner } from "./ui";

export function QrScanner({ academyId }: { academyId: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef<number | null>(null);
  const generation = useRef(0);
  const [camera, setCamera] = useState(false);
  const [starting, setStarting] = useState(false);
  const [payload, setPayload] = useState("");
  const [preview, setPreview] = useState<QrPreview | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const releaseCamera = useCallback(() => {
    generation.current++;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);
  useEffect(() => () => releaseCamera(), [releaseCamera]);
  const stopCamera = () => { releaseCamera(); setCamera(false); setStarting(false); };
  const inspect = (value: string) => {
    stopCamera(); setPayload(value);
    startTransition(async () => {
      try { const result = await previewQrAction(academyId, value); if (result.preview) setPreview(result.preview); else setError(result.error ?? "QR indisponível."); }
      catch { setError("Não foi possível validar o QR. Confira a conexão ou atualize a página."); }
    });
  };
  const startCamera = async () => {
    releaseCamera(); const request = generation.current;
    setError(""); setSuccess(""); setStudentId(null); setPreview(null); setPayload(""); setStarting(true);
    if (!navigator.mediaDevices?.getUserMedia) { setStarting(false); setError("Câmera indisponível. Abra em HTTPS e permita a câmera, ou registre o treino manualmente."); return; }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 640 } }, audio: false });
      if (request !== generation.current) { media.getTracks().forEach((track) => track.stop()); return; }
      stream.current = media;
      if (!video.current) { stopCamera(); return; }
      video.current.srcObject = media;
      setCamera(true);
      await video.current.play();
      if (request !== generation.current) return;
      setStarting(false);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Camera decode unavailable");
      let last = 0;
      const scan = (time: number) => {
        if (request !== generation.current) return;
        const element = video.current;
        if (element && element.readyState >= 2 && element.videoWidth && time - last > 100) {
          last = time;
          const scale = Math.min(1, 640 / element.videoWidth);
          canvas.width = Math.round(element.videoWidth * scale); canvas.height = Math.round(element.videoHeight * scale);
          try {
            context.drawImage(element, 0, 0, canvas.width, canvas.height);
            const data = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(data.data, data.width, data.height, { inversionAttempts: "dontInvert" });
            if (code) { inspect(code.data); return; }
          } catch { stopCamera(); setError("Não foi possível ler a câmera. Use o registro manual ou tente novamente."); return; }
        }
        frame.current = requestAnimationFrame(scan);
      };
      frame.current = requestAnimationFrame(scan);
    } catch {
      if (request !== generation.current) return;
      stopCamera(); setError("Câmera recusada, ocupada ou indisponível. Permita o acesso nas configurações do navegador ou use o check-in manual.");
    }
  };
  return <section className="panel qr-panel"><h2>Escanear presença</h2><p>Peça ao aluno para abrir seu perfil e gerar o QR. Confira o nome antes de confirmar.</p>
    <video ref={video} hidden={!camera} autoPlay playsInline muted className="qr-video" aria-label="Câmera para escanear o QR do aluno" />
    {starting && <p role="status"><Spinner />Abrindo câmera…</p>}
    {camera && <button className="button button-ghost" onClick={stopCamera}><CameraOff size={18} />Fechar câmera</button>}
    {pending && <p role="status"><Spinner />Validando com o servidor…</p>}
    {error && <p className="feedback feedback-error" role="alert">{error}</p>}
    {success && <p className="feedback feedback-success" role="status">{success}</p>}
    {preview && <div className="qr-confirm"><p>Confirmar presença de <strong>{preview.student_name}</strong>?</p><p>O servidor verificará novamente a validade e o acesso.</p>
      <div className="button-row"><button className="button button-primary" disabled={pending} onClick={() => startTransition(async () => {
        setError("");
        try {
          const result = await redeemQrAction(academyId, payload);
          if (result.error) setError(result.error);
          else { setSuccess(result.success ?? "Presença confirmada."); setStudentId(result.studentId ?? null); router.refresh(); }
        } catch { setError("A resposta não chegou. Confira o perfil antes de repetir: o treino pode já ter sido registrado."); }
        finally { setPreview(null); setPayload(""); }
      })}>Confirmar treino</button><button className="button button-ghost" disabled={pending} onClick={() => { setPreview(null); setPayload(""); setError(""); }}>Cancelar</button></div></div>}
    {studentId && <div className="button-row"><Link className="button button-soft" href={`/a/${academyId}/students/${studentId}`}>Ver perfil atualizado</Link><Link className="button button-ghost" href={`/a/${academyId}/dashboard`}>Ver dashboard</Link></div>}
    {!camera && !preview && <button className="button button-primary" disabled={pending || starting} onClick={() => void startCamera()}><Camera size={18} />{success || error ? "Escanear outro QR" : "Abrir câmera"}</button>}
    <p><Link className="back-link" href={`/a/${academyId}/students`}>Câmera indisponível? Registrar treino manualmente</Link></p>
    <p className="policy-note">A imagem é processada neste aparelho e não é enviada ao servidor. Nunca escaneie QR de outra academia para confirmar presença aqui.</p>
  </section>;
}
