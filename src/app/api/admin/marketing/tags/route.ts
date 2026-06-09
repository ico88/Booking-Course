import { NextResponse } from "next/server";
import { getTagsDisponibili } from "@/lib/leads";

// Public endpoint — returns available tags for the self-registration form and course form
export async function GET() {
  const tags = await getTagsDisponibili();
  return NextResponse.json(tags);
}
