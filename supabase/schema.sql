-- AI Models Factory — Supabase Schema
-- Run this in the Supabase SQL editor to set up the database.

-- ── Fanvue connection ─────────────────────────────────────────
create table if not exists fanvue_connection (
  id           uuid primary key default gen_random_uuid(),
  api_key      text not null,
  creator_id   text,
  username     text,
  display_name text,
  avatar_url   text,
  connected_at timestamptz default now(),
  last_sync_at timestamptz
);

-- ── Subscribers ───────────────────────────────────────────────
create table if not exists subscribers (
  id                uuid primary key default gen_random_uuid(),
  fanvue_id         text unique not null,
  username          text not null,
  display_name      text,
  avatar_url        text,
  email             text,
  subscription_tier text,
  subscribed_at     timestamptz,
  expires_at        timestamptz,
  total_spent       numeric(10,2) default 0,
  status            text default 'active', -- active | expired | cancelled
  tags              text[] default '{}',
  notes             text default '',
  last_message_at   timestamptz,
  synced_at         timestamptz default now(),
  created_at        timestamptz default now()
);

create index if not exists subscribers_status_idx on subscribers(status);
create index if not exists subscribers_tags_idx on subscribers using gin(tags);

-- ── Chat messages ─────────────────────────────────────────────
create table if not exists messages (
  id                 uuid primary key default gen_random_uuid(),
  fanvue_chat_id     text not null,
  fanvue_message_id  text unique,
  subscriber_id      uuid references subscribers(id) on delete cascade,
  direction          text not null check (direction in ('inbound','outbound')),
  content            text default '',
  media_urls         text[] default '{}',
  sent_at            timestamptz not null,
  read_at            timestamptz,
  is_ppv             boolean default false,
  ppv_price          numeric(10,2),
  ppv_unlocked       boolean default false,
  automation_id      uuid,
  created_at         timestamptz default now()
);

create index if not exists messages_subscriber_idx on messages(subscriber_id);
create index if not exists messages_sent_at_idx on messages(sent_at desc);
create index if not exists messages_chat_idx on messages(fanvue_chat_id);

-- ── Automations ───────────────────────────────────────────────
create type automation_trigger as enum (
  'new_subscriber',
  'message_received',
  'renewal',
  'churn',
  'tip_received',
  'manual',
  'schedule'
);

create table if not exists automations (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text default '',
  enabled          boolean default true,
  trigger_type     automation_trigger not null,
  trigger_config   jsonb default '{}',  -- e.g. schedule cron, delay seconds
  conditions       jsonb default '[]',  -- array of condition objects
  actions          jsonb default '[]',  -- array of action objects
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  last_triggered_at timestamptz,
  trigger_count    int default 0
);

-- ── Automation logs ───────────────────────────────────────────
create table if not exists automation_logs (
  id              uuid primary key default gen_random_uuid(),
  automation_id   uuid references automations(id) on delete cascade,
  subscriber_id   uuid references subscribers(id) on delete set null,
  triggered_at    timestamptz default now(),
  actions_taken   jsonb default '[]',
  status          text default 'success' check (status in ('success','failed','partial','skipped'))
);

create index if not exists logs_automation_idx on automation_logs(automation_id);
create index if not exists logs_triggered_at_idx on automation_logs(triggered_at desc);

-- ── Content drafts ────────────────────────────────────────────
create type draft_status as enum ('draft','scheduled','published','failed');
create type draft_type as enum ('post','message','ppv','story');

create table if not exists content_drafts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null default 'Untitled',
  type            draft_type default 'post',
  body            text default '',
  media_urls      text[] default '{}',
  tags            text[] default '{}',
  price           numeric(10,2),           -- for PPV content
  tier_id         text,                    -- target subscription tier
  status          draft_status default 'draft',
  scheduled_at    timestamptz,
  published_at    timestamptz,
  fanvue_post_id  text,
  ai_generated    boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists drafts_status_idx on content_drafts(status);
create index if not exists drafts_scheduled_idx on content_drafts(scheduled_at) where status = 'scheduled';

-- ── Webhook events ────────────────────────────────────────────
create table if not exists webhook_events (
  id                   uuid primary key default gen_random_uuid(),
  event_type           text not null,
  payload              jsonb not null,
  received_at          timestamptz default now(),
  processed_at         timestamptz,
  automation_triggered boolean default false,
  error                text
);

create index if not exists webhook_event_type_idx on webhook_events(event_type);
create index if not exists webhook_received_idx on webhook_events(received_at desc);

-- ── AI personas ───────────────────────────────────────────────
create table if not exists ai_personas (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  is_default   boolean default false,
  system_prompt text not null,
  tone         text default 'friendly',    -- friendly | flirty | professional | playful
  created_at   timestamptz default now()
);

-- Insert a default persona
insert into ai_personas (name, is_default, system_prompt, tone)
values (
  'Default',
  true,
  'You are a friendly content creator replying to your fans. Keep replies warm, personal, and engaging. Match the energy of the fan''s message. Keep replies concise (1-3 sentences). Never mention you are an AI.',
  'friendly'
) on conflict do nothing;

-- ── Enable realtime ───────────────────────────────────────────
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table subscribers;
