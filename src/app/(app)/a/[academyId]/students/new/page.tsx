import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { PageHeading } from "@/components/ui";
import { StudentForm } from "@/components/forms";
export default async function NewStudent({ params }: { params: Promise<{ academyId: string }> }) {
  const { academyId } = await params;
  await requireStaff(academyId);
  return <><Link className="back-link" href={`/a/${academyId}/students`}><ArrowLeft size={16} />Todos os alunos</Link><PageHeading eyebrow="MAIS UMA JORNADA" title="Novo aluno">O primeiro passo é fazer parte.</PageHeading><section className="panel form-panel"><StudentForm academyId={academyId} /></section></>;
}
