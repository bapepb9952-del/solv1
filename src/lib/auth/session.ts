import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";

export const requireUser = cache(async () => {
  if (!supabaseEnv()) redirect("/setup");
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { client, user: data.user };
});

export const academyContext = cache(async (academyId: string) => {
  if (!z.uuid().safeParse(academyId).success) notFound();
  const { client, user } = await requireUser();
  const [{ data: membership }, { data: academy }] = await Promise.all([
    client.from("memberships").select("*").eq("academy_id", academyId).eq("user_id", user.id).maybeSingle(),
    client.from("academies").select("*").eq("id", academyId).maybeSingle(),
  ]);
  if (!membership || !academy) notFound();
  return { client, user, academy, role: membership.role, isStaff: membership.role !== "STUDENT" };
});

export async function requireStaff(academyId: string) {
  const context = await academyContext(academyId);
  if (!context.isStaff) notFound();
  return context;
}
