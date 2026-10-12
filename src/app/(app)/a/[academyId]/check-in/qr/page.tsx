import { requireStaff } from "@/lib/auth/session";
import { PageHeading } from "@/components/ui";
import { QrScanner } from "@/components/qr-scanner";
export default async function QrCheckIn({ params }: { params: Promise<{ academyId: string }> }) {
  const { academyId } = await params;
  await requireStaff(academyId);
  return <><PageHeading eyebrow="PRESENÇA NO TATAME" title="Check-in por QR">Uma presença, 10 XP e mais um passo na jornada.</PageHeading><QrScanner academyId={academyId} /></>;
}
