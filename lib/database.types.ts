export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      fanvue_connection: {
        Row: {
          id: string;
          api_key: string;
          creator_id: string | null;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          connected_at: string;
          last_sync_at: string | null;
        };
        Insert: {
          api_key: string;
          creator_id?: string | null;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          connected_at?: string;
          last_sync_at?: string | null;
        };
        Update: {
          api_key?: string;
          creator_id?: string | null;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          connected_at?: string;
          last_sync_at?: string | null;
        };
        Relationships: [];
      };
      subscribers: {
        Row: {
          id: string;
          fanvue_id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          email: string | null;
          subscription_tier: string | null;
          subscribed_at: string | null;
          expires_at: string | null;
          total_spent: number;
          status: string;
          tags: string[];
          notes: string;
          last_message_at: string | null;
          synced_at: string;
          created_at: string;
        };
        Insert: {
          fanvue_id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          email?: string | null;
          subscription_tier?: string | null;
          subscribed_at?: string | null;
          expires_at?: string | null;
          total_spent?: number;
          status?: string;
          tags?: string[];
          notes?: string;
          last_message_at?: string | null;
          synced_at?: string;
        };
        Update: {
          fanvue_id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          email?: string | null;
          subscription_tier?: string | null;
          subscribed_at?: string | null;
          expires_at?: string | null;
          total_spent?: number;
          status?: string;
          tags?: string[];
          notes?: string;
          last_message_at?: string | null;
          synced_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          fanvue_chat_id: string;
          fanvue_message_id: string | null;
          subscriber_id: string | null;
          direction: "inbound" | "outbound";
          content: string;
          media_urls: string[];
          sent_at: string;
          read_at: string | null;
          is_ppv: boolean;
          ppv_price: number | null;
          ppv_unlocked: boolean;
          automation_id: string | null;
          created_at: string;
        };
        Insert: {
          fanvue_chat_id: string;
          fanvue_message_id?: string | null;
          subscriber_id?: string | null;
          direction: "inbound" | "outbound";
          content: string;
          media_urls?: string[];
          sent_at: string;
          read_at?: string | null;
          is_ppv?: boolean;
          ppv_price?: number | null;
          ppv_unlocked?: boolean;
          automation_id?: string | null;
        };
        Update: {
          fanvue_chat_id?: string;
          fanvue_message_id?: string | null;
          subscriber_id?: string | null;
          direction?: "inbound" | "outbound";
          content?: string;
          media_urls?: string[];
          sent_at?: string;
          read_at?: string | null;
          is_ppv?: boolean;
          ppv_price?: number | null;
          ppv_unlocked?: boolean;
          automation_id?: string | null;
        };
        Relationships: [];
      };
      automations: {
        Row: {
          id: string;
          name: string;
          description: string;
          enabled: boolean;
          trigger_type: string;
          trigger_config: Json;
          conditions: Json;
          actions: Json;
          created_at: string;
          updated_at: string;
          last_triggered_at: string | null;
          trigger_count: number;
        };
        Insert: {
          name: string;
          description?: string;
          enabled?: boolean;
          trigger_type: string;
          trigger_config?: Json;
          conditions?: Json;
          actions: Json;
          last_triggered_at?: string | null;
          trigger_count?: number;
        };
        Update: {
          name?: string;
          description?: string;
          enabled?: boolean;
          trigger_type?: string;
          trigger_config?: Json;
          conditions?: Json;
          actions?: Json;
          last_triggered_at?: string | null;
          trigger_count?: number;
        };
        Relationships: [];
      };
      automation_logs: {
        Row: {
          id: string;
          automation_id: string | null;
          subscriber_id: string | null;
          triggered_at: string;
          actions_taken: Json;
          status: string;
        };
        Insert: {
          automation_id?: string | null;
          subscriber_id?: string | null;
          triggered_at?: string;
          actions_taken?: Json;
          status: string;
        };
        Update: {
          automation_id?: string | null;
          subscriber_id?: string | null;
          triggered_at?: string;
          actions_taken?: Json;
          status?: string;
        };
        Relationships: [];
      };
      content_drafts: {
        Row: {
          id: string;
          title: string;
          type: string;
          body: string;
          media_urls: string[];
          tags: string[];
          price: number | null;
          tier_id: string | null;
          status: string;
          scheduled_at: string | null;
          published_at: string | null;
          fanvue_post_id: string | null;
          ai_generated: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title?: string;
          type?: string;
          body?: string;
          media_urls?: string[];
          tags?: string[];
          price?: number | null;
          tier_id?: string | null;
          status?: string;
          scheduled_at?: string | null;
          published_at?: string | null;
          fanvue_post_id?: string | null;
          ai_generated?: boolean;
        };
        Update: {
          title?: string;
          type?: string;
          body?: string;
          media_urls?: string[];
          tags?: string[];
          price?: number | null;
          tier_id?: string | null;
          status?: string;
          scheduled_at?: string | null;
          published_at?: string | null;
          fanvue_post_id?: string | null;
          ai_generated?: boolean;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          id: string;
          event_type: string;
          payload: Json;
          received_at: string;
          processed_at: string | null;
          automation_triggered: boolean;
          error: string | null;
        };
        Insert: {
          event_type: string;
          payload: Json;
          received_at?: string;
          processed_at?: string | null;
          automation_triggered?: boolean;
          error?: string | null;
        };
        Update: {
          event_type?: string;
          payload?: Json;
          received_at?: string;
          processed_at?: string | null;
          automation_triggered?: boolean;
          error?: string | null;
        };
        Relationships: [];
      };
      ai_personas: {
        Row: {
          id: string;
          name: string;
          is_default: boolean;
          system_prompt: string;
          tone: string;
          created_at: string;
        };
        Insert: {
          name: string;
          is_default?: boolean;
          system_prompt: string;
          tone?: string;
        };
        Update: {
          name?: string;
          is_default?: boolean;
          system_prompt?: string;
          tone?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
