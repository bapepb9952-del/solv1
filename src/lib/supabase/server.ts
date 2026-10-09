import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";
import type { Database } from "./database.types";

export async function createClient() {
  const env = supabaseEnv();
  if (!env) throw new Error("Configure o Supabase em .env.local seguindo o README.");
  const cookieStore = await cookies();
  return createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Server Components are read-only; proxy refreshes the cookies. */ }
      },
    },
  });
}
