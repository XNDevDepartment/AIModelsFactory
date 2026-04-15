/**
 * ConversationSession — a small, in-memory orchestrator for multi-turn chats
 * with any model in MODEL_CATALOG.
 *
 * It is intentionally storage-agnostic: pass an existing `Conversation` in or
 * start a fresh one, mutate it by calling `send()`, and persist the result
 * wherever you like (Supabase, localStorage, etc.).
 *
 * Usage:
 *   const session = ConversationSession.create({ model: "gemini-nano-banana-2" });
 *   await session.send({ kind: "prompt", text: "Design a neon cyberpunk cat." });
 *   await session.send({
 *     kind: "edit",
 *     text: "Make the background red and add a scarf.",
 *   });
 *   const transcript = session.conversation.turns;
 */

import { MODEL_CATALOG, type ModelKey } from "@/lib/models";

import { runAdapter } from "./adapters";
import type {
  Attachment,
  Conversation,
  ConversationTurn,
  SendMessageInput,
} from "./types";

function rid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export interface CreateSessionOptions {
  model: ModelKey;
  title?: string;
  /** Optional system prompt prepended as the first turn. */
  system?: string;
}

export class ConversationSession {
  conversation: Conversation;

  private constructor(conversation: Conversation) {
    this.conversation = conversation;
  }

  static create(opts: CreateSessionOptions): ConversationSession {
    if (!MODEL_CATALOG[opts.model]) {
      throw new Error(`Unknown model: ${opts.model}`);
    }
    const now = Date.now();
    const turns: ConversationTurn[] = [];
    if (opts.system) {
      turns.push({
        id: rid(),
        role: "system",
        kind: "prompt",
        text: opts.system,
        createdAt: now,
      });
    }
    return new ConversationSession({
      id: rid(),
      model: opts.model,
      title: opts.title,
      turns,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromConversation(conversation: Conversation): ConversationSession {
    return new ConversationSession(conversation);
  }

  /** Most recent image anywhere in the conversation (assistant or user). */
  private lastImage(): { turnId: string; image: Attachment } | undefined {
    for (let i = this.conversation.turns.length - 1; i >= 0; i--) {
      const t = this.conversation.turns[i];
      if (t.images?.length) return { turnId: t.id, image: t.images[t.images.length - 1] };
    }
    return undefined;
  }

  /** Find an image on a specific turn by id. */
  private imageOnTurn(turnId: string): Attachment | undefined {
    const turn = this.conversation.turns.find((t) => t.id === turnId);
    return turn?.images?.[turn.images.length - 1];
  }

  /**
   * Send a user turn (prompt / upload / edit) and append the assistant reply.
   */
  async send(input: SendMessageInput): Promise<ConversationTurn> {
    const model = input.model ?? this.conversation.model;
    const descriptor = MODEL_CATALOG[model];
    if (!descriptor) throw new Error(`Unknown model: ${model}`);

    // Capability guardrails — fail fast with a clear message.
    if (input.kind === "edit" && !descriptor.capabilities.includes("image-edit")) {
      // Non-image models can still "describe" an edit, so we don't block them,
      // but we do warn via a helpful message in the turn text downstream.
    }
    if (input.kind === "upload" && !descriptor.capabilities.includes("vision") &&
        !descriptor.capabilities.includes("image-edit")) {
      throw new Error(`Model ${descriptor.label} does not accept image input.`);
    }

    // Resolve edit target if applicable.
    let editTarget: Attachment | undefined;
    if (input.kind === "edit") {
      const ref = input.editTargetTurnId
        ? this.imageOnTurn(input.editTargetTurnId)
        : this.lastImage()?.image;
      if (!ref) {
        throw new Error("Edit requested but no previous image exists in the conversation.");
      }
      editTarget = ref;
    }

    // Append the user turn.
    const now = Date.now();
    const userTurn: ConversationTurn = {
      id: rid(),
      role: "user",
      kind: input.kind,
      text: input.text,
      images: input.images,
      createdAt: now,
    };
    this.conversation.turns.push(userTurn);

    // Run the provider adapter against the history BEFORE the user turn,
    // since the user turn gets shaped inside the adapter (edit framing, etc.).
    const historyForAdapter = this.conversation.turns.slice(0, -1);

    const reply = await runAdapter(model, {
      history: historyForAdapter,
      input,
      editTarget,
    });

    const assistantTurn: ConversationTurn = {
      id: rid(),
      role: "assistant",
      kind: "response",
      text: reply.text,
      images: reply.images,
      model,
      createdAt: Date.now(),
    };
    this.conversation.turns.push(assistantTurn);
    this.conversation.updatedAt = assistantTurn.createdAt;

    return assistantTurn;
  }

  /** Convenience: send a text-only prompt. */
  prompt(text: string, model?: ModelKey) {
    return this.send({ kind: "prompt", text, model });
  }

  /** Convenience: upload one or more images with a text prompt. */
  upload(text: string, images: Attachment[], model?: ModelKey) {
    return this.send({ kind: "upload", text, images, model });
  }

  /** Convenience: request an edit of the last image (or a specific turn's image). */
  edit(text: string, opts: { turnId?: string; model?: ModelKey } = {}) {
    return this.send({
      kind: "edit",
      text,
      editTargetTurnId: opts.turnId,
      model: opts.model,
    });
  }
}
