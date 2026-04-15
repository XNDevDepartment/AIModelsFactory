import { NextRequest, NextResponse } from "next/server";

import { MODEL_CATALOG, type ModelKey } from "@/lib/models";
import { ConversationSession, type Conversation, type SendMessageInput } from "@/lib/conversation";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RequestBody {
  conversation?: Conversation;
  /** Used when `conversation` is absent to start a fresh session. */
  init?: { model: ModelKey; system?: string; title?: string };
  input: SendMessageInput;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;

    if (!body.input?.text && !body.input?.images?.length) {
      return NextResponse.json(
        { error: "input.text or input.images is required." },
        { status: 400 }
      );
    }

    const session = body.conversation
      ? ConversationSession.fromConversation(body.conversation)
      : ConversationSession.create({
          model: body.init?.model ?? "gemini-nano-banana-2",
          system: body.init?.system,
          title: body.init?.title,
        });

    const assistantTurn = await session.send(body.input);

    return NextResponse.json({
      conversation: session.conversation,
      assistantTurn,
    });
  } catch (err: unknown) {
    console.error("Conversation error:", err);
    const message = err instanceof Error ? err.message : "Conversation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    models: Object.entries(MODEL_CATALOG).map(([key, m]) => ({
      key,
      id: m.id,
      label: m.label,
      provider: m.provider,
      capabilities: m.capabilities,
      aliases: m.aliases ?? [],
    })),
  });
}
