import type { ChatSessionKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const kindParam = searchParams.get("kind");
  const kind: ChatSessionKind | undefined =
    kindParam === "PROGRAMME_GUIDED" || kindParam === "FREE" ? kindParam : undefined;

  const rows = await prisma.chatSession.findMany({
    where: { userId: session.user.id, ...(kind ? { kind } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 25,
    select: {
      id: true,
      subject: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({ sessions: rows });
}
