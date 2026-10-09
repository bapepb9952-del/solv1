import { redirect } from "next/navigation";
import { academyContext } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui";
export default async function Me({ params }: { params: Promise<{ academyId: string }> }) {
  const { academyId } = await params;
  const { client, user, isStaff } = await academyContext(academyId);
  if (isStaff) redirect(`/a/${academyId}/dashboard`);
  const { data, error } = await client.from("students").select("id").eq("academy_id", academyId).eq("user_id", user.id).maybeSingle();
  if (error) throw new Error("Não foi possível carregar seu perfil.");
  if (!data) return <div className="panel"><EmptyState title="Seu perfil está quase pronto"><p>Peça ao professor para vincular seu cadastro à sua conta.</p></EmptyState></div>;
  redirect(`/a/${academyId}/students/${data.id}`);
}
