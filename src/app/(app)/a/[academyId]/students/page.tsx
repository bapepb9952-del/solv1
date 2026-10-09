import Link from "next/link";
import { Plus } from "lucide-react";
import { listStudents } from "@/features/students/queries";
import { PageHeading } from "@/components/ui";
import { StudentList } from "@/components/student-list";
export default async function Students({ params, searchParams }: { params: Promise<{ academyId: string }>; searchParams: Promise<{ status?: string }> }) {
  const { academyId } = await params;
  const { status } = await searchParams;
  const students = await listStudents(academyId);
  const filter = ["ACTIVE", "ATTENTION", "RISK"].includes(status ?? "") ? status : "ALL";
  return <><PageHeading eyebrow="SUA COMUNIDADE" title="Quem faz o dojo." action={<Link className="button button-primary" href={`/a/${academyId}/students/new`}><Plus size={17} />Novo aluno</Link>}>Um olhar sobre cada jornada no tatame.</PageHeading><StudentList key={filter} students={students} academyId={academyId} initialStatus={filter} /></>;
}
