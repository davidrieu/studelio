import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId requis." }, { status: 400 });
  }

  const chat = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
    select: { id: true },
  });
  if (!chat) {
    return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, createdAt: true },
  });

  return NextResponse.json({ messages });
}
