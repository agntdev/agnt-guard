import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getInfractions, getSettings } from "../store.js";

const composer = new Composer<Ctx>();

const STATS_HEADER = "📊 Moderation statistics";
const STATS_BODY = (data: {
  total_infractions: number;
  warns: number;
  mutes: number;
  kicks: number;
  bans: number;
  trusted_count: number;
}) =>
  `Total actions: ${data.total_infractions}\n` +
  `⚠️ Warns: ${data.warns}\n` +
  `🔇 Mutes: ${data.mutes}\n` +
  `👢 Kicks: ${data.kicks}\n` +
  `🚫 Bans: ${data.bans}\n\n` +
  `Trusted users: ${data.trusted_count}`;
const NO_DATA = "No moderation data yet. Actions will appear here once you start moderating.";

async function isAdmin(ctx: Ctx): Promise<boolean> {
  if (!ctx.chat || ctx.chat.type === "private") return true;
  try {
    const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from!.id);
    return ["administrator", "creator"].includes(member.status);
  } catch {
    return false;
  }
}

async function showStats(ctx: Ctx) {
  const chatId = ctx.chat!.id;
  const infractions = await getInfractions(chatId);
  const settings = await getSettings(chatId);

  if (infractions.length === 0) {
    await ctx.reply(NO_DATA, {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const data = {
    total_infractions: infractions.length,
    warns: infractions.filter((i) => i.action_type === "warn").length,
    mutes: infractions.filter((i) => i.action_type === "mute").length,
    kicks: infractions.filter((i) => i.action_type === "kick").length,
    bans: infractions.filter((i) => i.action_type === "ban").length,
    trusted_count: settings.trusted_users.length,
  };

  await ctx.reply(`${STATS_HEADER}\n\n${STATS_BODY(data)}`, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
}

composer.command("stats", async (ctx) => {
  if (!(await isAdmin(ctx))) {
    await ctx.reply("Only admins can use this command.");
    return;
  }
  await showStats(ctx);
});

composer.callbackQuery("modstats:view", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await isAdmin(ctx))) {
    await ctx.reply("Only admins can view stats.");
    return;
  }
  await showStats(ctx);
});

export default composer;
