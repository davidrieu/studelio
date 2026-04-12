import type { MessageParam, TextBlock } from "@anthropic-ai/sdk/resources/messages";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildAndreSystemPrompt } from "@/lib/andre-prompt";
import { andreModel, getAnthropic } from "@/lib/anthropic";
import { niveauLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_USER_CHARS = 12_000;
const MAX_HISTORY_MESSAGES = 32;

function extractAssistantText(message: { content: unknown[] }): string {
  const blocks = message.content.filter((b): b is TextBlock => (b as TextBlock).type === "text");
  return blocks.map((b) => b.text).join("\n").trim();
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const client = getAnthropic();
  if (!client) {
    return NextResponse.json(
      { error: "Clé API Anthropic non configurée (ANTHROPIC_API_KEY)." },
      { status: 503 },
    );
  }

  let body: { sessionId?: string | null; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const raw = typeof body.message === "string" ? body.message.trim() : "";
  if (!raw) {
    return NextResponse.json({ error: "Message vide." }, { status: 400 });
  }
  if (raw.length > MAX_USER_CHARS) {
    return NextResponse.json({ error: "Message trop long." }, { status: 400 });
  }

  const userRow = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { studentProfile: true },
  });

  if (!userRow?.studentProfile) {
    return NextResponse.json({ error: "Profil élève introuvable." }, { status: 400 });
  }

  const sp = userRow.studentProfile;
  const firstName = userRow.name?.split(/\s+/)[0] ?? "toi";

  let chatSessionId = body.sessionId?.trim() || null;
  if (chatSessionId) {
    const existing = await prisma.chatSession.findFirst({
      where: { id: chatSessionId, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Session invalide." }, { status: 400 });
    }
  } else {
    const created = await prisma.chatSession.create({
      data: {
        userId: session.user.id,
        niveau: sp.niveau,
        subject: raw.slice(0, 120),
      },
    });
    chatSessionId = created.id;
  }

  await prisma.chatMessage.create({
    data: {
      sessionId: chatSessionId,
      role: "USER",
      content: raw,
    },
  });

  const historyRows = await prisma.chatMessage.findMany({
    where: { sessionId: chatSessionId },
    orderBy: { createdAt: "asc" },
    take: MAX_HISTORY_MESSAGES,
  });

  const anthropicMessages: MessageParam[] = [];
  for (const row of historyRows) {
    if (row.role === "USER") {
      anthropicMessages.push({ role: "user", content: row.content });
    } else if (row.role === "ANDRE") {
      anthropicMessages.push({ role: "assistant", content: row.content });
    }
  }

  const system = buildAndreSystemPrompt({
    studentFirstName: firstName,
    niveau: sp.niveau,
    niveauLabel: niveauLabel[sp.niveau],
    interests: sp.interests,
    tags: sp.tags,
  });

  const encoder = new TextEncoder();
  const sse = (obj: object) => encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);

  const stream = new ReadableStream({
    async start(controller) {
      const push = (obj: object) => controller.enqueue(sse(obj));
      try {
        push({ type: "session", id: chatSessionId });

        const msgStream = client.messages.stream({
          model: andreModel(),
          max_tokens: 4096,
          system,
          messages: anthropicMessages,
        });

        msgStream.on("text", (delta) => {
          push({ type: "delta", text: delta });
        });

        const final = await msgStream.finalMessage();
        const assistantText = extractAssistantText(final);
        if (!assistantText) {
          throw new Error("Réponse vide du modèle.");
        }

        await prisma.chatMessage.create({
          data: {
            sessionId: chatSessionId!,
            role: "ANDRE",
            content: assistantText,
            tokensUsed: final.usage?.output_tokens ?? null,
          },
        });

        await prisma.chatSession.update({
          where: { id: chatSessionId! },
          data: { updatedAt: new Date() },
        });

        push({
          type: "done",
          usage: {
            input: final.usage?.input_tokens ?? null,
            output: final.usage?.output_tokens ?? null,
          },
        });
      } catch (e) {
        console.error("[chat]", e);
        push({
          type: "error",
          message: e instanceof Error ? e.message : "Erreur lors de la réponse d’André.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
