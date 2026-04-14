/**
 * Fanvue API client
 * Docs: https://api.fanvue.com/docs
 *
 * All requests require:
 *   X-Fanvue-API-Version: YYYY-MM-DD  (use latest)
 *   X-Fanvue-API-Key: <key>
 */

const BASE_URL = "https://api.fanvue.com";
const API_VERSION = "2025-06-26";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FanvueSubscriber {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  email?: string;
  subscriptionTier?: string;
  subscribedAt: string;
  expiresAt?: string;
  totalSpent?: number;
  status: "active" | "expired" | "cancelled";
}

export interface FanvueMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  mediaUrls?: string[];
  sentAt: string;
  readAt?: string;
  isPpv?: boolean;
  ppvPrice?: number;
  ppvUnlocked?: boolean;
}

export interface FanvueChat {
  id: string;
  subscriberId: string;
  subscriber: Pick<FanvueSubscriber, "id" | "username" | "displayName" | "avatarUrl">;
  lastMessage?: FanvueMessage;
  unreadCount: number;
  updatedAt: string;
}

export interface FanvuePost {
  id: string;
  body: string;
  mediaUrls: string[];
  type: "post" | "ppv" | "story";
  price?: number;
  publishedAt?: string;
  createdAt: string;
}

export interface FanvueInsights {
  subscriberCount: number;
  activeSubscriberCount: number;
  newSubscribersThisMonth: number;
  churnsThisMonth: number;
  totalRevenue: number;
  revenueThisMonth: number;
  topSpenders: Array<{ subscriberId: string; username: string; totalSpent: number }>;
}

export interface SendMessageInput {
  chatId: string;
  content: string;
  mediaUrls?: string[];
  isPpv?: boolean;
  ppvPrice?: number;
}

export interface CreatePostInput {
  body: string;
  mediaUrls?: string[];
  type?: "post" | "ppv" | "story";
  price?: number;
  tierId?: string;
  scheduledAt?: string;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class FanvueClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Fanvue-API-Version": API_VERSION,
        "X-Fanvue-API-Key": this.apiKey,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Fanvue API ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  // ── Creator profile ────────────────────────────────────────

  async getMe() {
    return this.request<{ id: string; username: string; displayName: string; avatarUrl: string }>("/v1/me");
  }

  // ── Subscribers ────────────────────────────────────────────

  async getSubscribers(params?: { page?: number; limit?: number; status?: string }) {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.status) q.set("status", params.status);
    return this.request<{ data: FanvueSubscriber[]; total: number; page: number }>(`/v1/subscribers?${q}`);
  }

  async getAllSubscribers(): Promise<FanvueSubscriber[]> {
    const all: FanvueSubscriber[] = [];
    let page = 1;
    while (true) {
      const res = await this.getSubscribers({ page, limit: 100 });
      all.push(...res.data);
      if (all.length >= res.total || res.data.length === 0) break;
      page++;
    }
    return all;
  }

  // ── Chats & Messages ───────────────────────────────────────

  async getChats(params?: { page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit ?? "50"));
    return this.request<{ data: FanvueChat[]; total: number }>(`/v1/chats?${q}`);
  }

  async getMessages(chatId: string, params?: { page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit ?? "50"));
    return this.request<{ data: FanvueMessage[]; total: number }>(`/v1/chats/${chatId}/messages?${q}`);
  }

  async sendMessage(input: SendMessageInput) {
    return this.request<FanvueMessage>(`/v1/chats/${input.chatId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content: input.content,
        mediaUrls: input.mediaUrls,
        isPpv: input.isPpv,
        ppvPrice: input.ppvPrice,
      }),
    });
  }

  async sendMassMessage(subscriberIds: string[], content: string, isPpv = false, ppvPrice?: number) {
    return this.request<{ sent: number; failed: number }>("/v1/messages/mass", {
      method: "POST",
      body: JSON.stringify({ subscriberIds, content, isPpv, ppvPrice }),
    });
  }

  // ── Posts ──────────────────────────────────────────────────

  async createPost(input: CreatePostInput) {
    return this.request<FanvuePost>("/v1/posts", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getPosts(params?: { page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit ?? "20"));
    return this.request<{ data: FanvuePost[]; total: number }>(`/v1/posts?${q}`);
  }

  // ── Insights ───────────────────────────────────────────────

  async getInsights() {
    return this.request<FanvueInsights>("/v1/insights");
  }
}

// ─── Factory: load API key from DB or env ─────────────────────────────────────

/**
 * Creates a FanvueClient using the stored API key.
 * Pass an explicit key to override (e.g. for initial setup).
 */
export function createFanvueClient(apiKey?: string): FanvueClient {
  const key = apiKey ?? process.env.FANVUE_API_KEY;
  if (!key) throw new Error("No Fanvue API key found. Add it in Settings.");
  return new FanvueClient(key);
}
