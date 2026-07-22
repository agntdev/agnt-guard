import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { upsertMember, getMember, getSettings, updateSettings } from "../store.js";

const composer = new Composer<Ctx>();

const USAGE = "Usage: Reply to a user's message with /trust\n\nOr use /trust @username";
const DONE = (name: string) => `✅ ${name} is now trusted — exempt from spam checks.`;
const ALREADY_TRUSTED = (name: string) => `${name} is already trusted.`;
const SELF_TRUST = "You're already trusted (or can't trust yourself).";

async function isAdmin(ctx: Ctx): Promise<boolean> {
  if (!ctx.chat || ctx.chat.type === "private") return true;
  try {
    const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from!.id);
    return ["administrator", "creator"].includes(member.status);
  } catch {
    return false;
  }
}

composer.command("trust", async (ctx) => {
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
    const parts = (ctx.message?.text ?? "").replace(/^\/trust(@\w+)?\s*/, "").trim().split(/\s+/);
    const username = parts.find((p) => p.startsWith("@"));
    if (username) {
      targetName = username;
    } else {
      await ctx.reply(USAGE, {
        reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
      });
      return;
    }
  }

  if (targetUserId === ctx.from?.id) {
    await ctx.reply(SELF_TRUST);
    return;
  }

  const chatId = ctx.chat!.id;

  const existing = await getMember(chatId, targetUserId!);
  if (existing?.trusted) {
    await ctx.reply(ALREADY_TRUSTED(targetName), {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  await upsertMember(chatId, targetUserId!, { trusted: true });

  const settings = await getSettings(chatId);
  if (!settings.trusted_users.includes(targetUserId!)) {
    settings.trusted_users.push(targetUserId!);
    await updateSettings(chatId, { trusted_users: settings.trusted_users });
  }

  await ctx.reply(DONE(targetName), {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
