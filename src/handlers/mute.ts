import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { addInfraction } from "../store.js";

const composer = new Composer<Ctx>();

const USAGE = "Usage: Reply to a user's message with /mute <duration>\n\nExample: /mute 30m\nSupported: 10m, 1h, 1d, 7d";
const NO_TARGET = "Please reply to a user's message or mention them with @username.";
const DONE = (name: string, duration: string) =>
  `🔇 Muted ${name} for ${duration}.`;
const SELF_MUTE = "You can't mute yourself.";

function parseDuration(text: string): { minutes: number; label: string } | null {
  const cleaned = text.replace(/^\/mute(@\w+)?\s*/, "").trim();
  const match = cleaned.match(/^(\d+)(m|h|d)$/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit === "m") return { minutes: num, label: `${num} minute${num !== 1 ? "s" : ""}` };
  if (unit === "h") return { minutes: num * 60, label: `${num} hour${num !== 1 ? "s" : ""}` };
  if (unit === "d") return { minutes: num * 1440, label: `${num} day${num !== 1 ? "s" : ""}` };
  return null;
}

async function isAdmin(ctx: Ctx): Promise<boolean> {
  if (!ctx.chat || ctx.chat.type === "private") return true;
  try {
    const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from!.id);
    return ["administrator", "creator"].includes(member.status);
  } catch {
    return false;
  }
}

composer.command("mute", async (ctx) => {
  if (!(await isAdmin(ctx))) {
    await ctx.reply("Only admins can use this command.");
    return;
  }

  let targetUserId: number | undefined;
  let targetName = "Unknown";

  if (ctx.message?.reply_to_message?.from) {
    targetUserId = ctx.message.reply_to_message.from.id;
    targetName = ctx.message.reply_to_message.from.first_name;
  } else {
    await ctx.reply(USAGE, {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  if (targetUserId === ctx.from?.id) {
    await ctx.reply(SELF_MUTE);
    return;
  }

  const duration = parseDuration(ctx.message?.text ?? "");
  if (!duration) {
    await ctx.reply(USAGE, {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const chatId = ctx.chat!.id;
  const actorId = ctx.from!.id;

  try {
    await ctx.api.restrictChatMember(chatId, targetUserId!, {
      can_send_messages: false,
      can_send_audios: false,
      can_send_documents: false,
      can_send_photos: false,
      can_send_videos: false,
      can_send_video_notes: false,
      can_send_voice_notes: false,
      can_send_polls: false,
      can_send_other_messages: false,
      can_add_web_page_previews: false,
      can_invite_users: false,
      can_change_info: false,
      can_pin_messages: false,
      can_manage_topics: false,
    });
  } catch {
    await ctx.reply("Couldn't mute that user. They may have higher permissions.");
    return;
  }

  await addInfraction(chatId, {
    user_id: targetUserId!,
    action_type: "mute",
    actor: actorId,
    reason: `Muted for ${duration.label}`,
    timestamp: Date.now(),
  });

  await ctx.reply(DONE(targetName, duration.label), {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
