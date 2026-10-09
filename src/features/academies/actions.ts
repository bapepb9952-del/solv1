"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { academySchema } from "./schema";
import { databaseError, type ActionState } from "@/lib/actions";

export async function createAcademyAction(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = academySchema.safeParse({ name: form.get("name"), timezone: form.get("timezone") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const { client } = await requireUser();
  const { data, error } = await client.rpc("create_academy", { p_name: parsed.data.name, p_timezone: parsed.data.timezone });
  if (error || !data) return databaseError(error?.code, "Não foi possível criar a academia. Tente novamente.");
  revalidatePath("/academies");
  redirect(`/a/${data}/dashboard`);
}
