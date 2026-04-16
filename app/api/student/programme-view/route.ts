import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStudentProgrammeViewData } from "@/lib/student-programme-view-data";

export const dynamic = "force-dynamic";

/**
 * JSON « live » pour la page Parcours (radar + barres modules), sans cache navigateur.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ ok: false, code: "unauthorized" as const }, { status: 401 });
  }

  const data = await getStudentProgrammeViewData(session.user.id);

  if (!data.ok && data.code === "no_profile") {
    return NextResponse.json(data, { status: 404 });
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
