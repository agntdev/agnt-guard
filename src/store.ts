import { MemorySessionStorage } from "./toolkit/session/memory.js";

export interface Member {
  user_id: number;
  display_name: string;
  join_time: number;
  verified: boolean;
  trusted: boolean;
  warning_count: number;
}

export interface Infraction {
  user_id: number;
  action_type: string;
  actor: number;
  reason: string;
  timestamp: number;
}

export interface Settings {
  welcome_text: string;
  rules_text: string;
  max_links: number;
  max_duplicates: number;
  warn_action: string;
  mute_action: string;
  trusted_users: number[];
  infractions: Infraction[];
}

function defaultSettings(): Settings {
  return {
    welcome_text: "Welcome to the group! Please verify you're human.",
    rules_text: "Be respectful and follow community guidelines.",
    max_links: 3,
    max_duplicates: 3,
    warn_action: "warn",
    mute_action: "mute",
    trusted_users: [],
    infractions: [],
  };
}

const memberStore = new MemorySessionStorage<Member>();
const settingsStore = new MemorySessionStorage<Settings>();

function memberKey(chatId: number, userId: number): string {
  return `${chatId}:${userId}`;
}

function settingsKey(chatId: number): string {
  return String(chatId);
}

export async function getMember(chatId: number, userId: number): Promise<Member | null> {
  const member = memberStore.read(memberKey(chatId, userId));
  return member ?? null;
}

export async function upsertMember(chatId: number, userId: number, data: Partial<Member>): Promise<Member> {
  const existing = memberStore.read(memberKey(chatId, userId));
  const merged: Member = {
    user_id: userId,
    display_name: data.display_name ?? existing?.display_name ?? "",
    join_time: data.join_time ?? existing?.join_time ?? Date.now(),
    verified: data.verified ?? existing?.verified ?? false,
    trusted: data.trusted ?? existing?.trusted ?? false,
    warning_count: data.warning_count ?? existing?.warning_count ?? 0,
  };
  memberStore.write(memberKey(chatId, userId), merged);
  return merged;
}

export async function getSettings(chatId: number): Promise<Settings> {
  const s = settingsStore.read(settingsKey(chatId));
  return s ?? defaultSettings();
}

export async function updateSettings(chatId: number, data: Partial<Settings>): Promise<Settings> {
  const existing = settingsStore.read(settingsKey(chatId));
  const base = existing ?? defaultSettings();
  const updated: Settings = { ...base, ...data };
  settingsStore.write(settingsKey(chatId), updated);
  return updated;
}

export async function addInfraction(chatId: number, infraction: Infraction): Promise<void> {
  const settings = await getSettings(chatId);
  settings.infractions.push(infraction);
  await updateSettings(chatId, { infractions: settings.infractions });
}

export async function getInfractions(chatId: number): Promise<Infraction[]> {
  const settings = await getSettings(chatId);
  return settings.infractions;
}
