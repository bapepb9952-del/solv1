"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import type { ActionState } from "@/lib/actions";

const credentials = z.object({ email: z.email("Informe um e-mail válido."), password: z.string().min(12, "Use uma senha com pelo menos 12 caracteres.").max(128) });
export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  if (!supabaseEnv()) return { error: "Configure o Supabase antes de entrar. Veja o README." };
  const parsed = z.object({ email: z.email(), password: z.string().min(1) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Informe seu e-mail e senha." };
  const client = await createClient();
  const { error } = await client.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.code === "email_not_confirmed" ? "Confirme seu e-mail antes de entrar." : "Não foi possível entrar. Confira o e-mail, a senha e sua conexão." };
  redirect("/academies");
}
export async function signupAction(_: ActionState, form: FormData): Promise<ActionState> {
  if (!supabaseEnv()) return { error: "Configure o Supabase antes de criar uma conta. Veja o README." };
  const parsed = credentials.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const client = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await client.auth.signUp({ ...parsed.data, options: { emailRedirectTo: `${siteUrl}/auth/confirm` } });
  if (error) return { error: "Não foi possível criar a conta. Confira os dados e tente novamente em alguns minutos." };
  if (data.session) redirect("/academies");
  return { success: "Confira seu e-mail para confirmar a conta. Se já possui cadastro, entre com sua senha." };
}
export async function logoutAction() {
  const client = await createClient();
  const { error } = await client.auth.signOut();
  if (error) throw new Error("Não foi possível sair. Tente novamente.");
  redirect("/login");
}
