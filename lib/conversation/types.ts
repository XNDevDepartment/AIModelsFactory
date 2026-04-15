/**
 * Types for the multi-model conversation simulator.
 *
 * The simulator lets callers hold a threaded chat with any of the models in
 * MODEL_CATALOG — prompting, uploading images, asking for edits to previously
 * generated images, etc. — while keeping a normalized history that any backend
 * adapter can replay.
 */

import type { ModelKey } from "@/lib/models";

export type Role = "user" | "assistant" | "system";

export type TurnKind =
  /** Plain text prompt. */
  | "prompt"
  /** User uploaded one or more images alongside a text prompt. */
  | "upload"
  /** User asked the model to edit the previously produced / last-referenced image. */
  | "edit"
  /** Model response (text, images, or both). */
  | "response";

export interface Attachment {
  /** Data URL (`data:image/png;base64,...`) or `http(s)://` URL. */
  url: string;
  mimeType: string;
  /** Optional name shown in the UI. */
  name?: string;
}

export interface ConversationTurn {
  id: string;
  role: Role;
  kind: TurnKind;
  /** Text content (prompt or model reply). */
  text?: string;
  /** Images attached by the user, or produced by the model. */
  images?: Attachment[];
  /** Model that produced this turn (assistant turns only). */
  model?: ModelKey;
  createdAt: number;
}

export interface Conversation {
  id: string;
  model: ModelKey;
  title?: string;
  turns: ConversationTurn[];
  createdAt: number;
  updatedAt: number;
}

export interface SendMessageInput {
  /** Free-form user text — required for prompt/upload/edit. */
  text: string;
  /** Data URLs to attach. */
  images?: Attachment[];
  /** Override the model for this single turn. */
  model?: ModelKey;
  /**
   * For "edit" kinds, the caller may reference a previously produced image
   * by turn id. If omitted, the most recent image in the conversation is used.
   */
  editTargetTurnId?: string;
  kind: Exclude<TurnKind, "response">;
}
