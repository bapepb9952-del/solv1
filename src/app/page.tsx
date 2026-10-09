import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
export const dynamic = "force-dynamic";
export default async function Home() { await requireUser(); redirect("/academies"); }
