import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { paginate } from "../toolkit/index.js";
import { getInfractions } from "../store.js";

const composer = new Composer<Ctx>();

const NO_LOGS = "No moderation actions logged yet.";
const LOG_ENTRY = (inf: { action_type: string; reason: string; timestamp: number; user_id: number }) =>
  `${actionEmoji(inf.action_type)} ${inf.action_type.toUpperCase()} — User ${inf.user_id}\nReason: ${inf.reason}\nTime: ${new Date(inf.timestamp).toLocaleString()}`;
const PAGE_HEADER = (page: number, total: number, count: number) =>
  `📋 Moderation log (${count} actions, page ${page + 1}/${total})`;
const CANCEL_BTN = "Cancel";

function actionEmoji(type: string): string {
  switch (type) {
    case "warn": return "⚠️";
    case "mute": return "🔇";
    case "kick": return "👢";
    case "ban": return "🚫";
    default: return "📝";
  }
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

async function showLogPage(ctx: Ctx, page: number) {
  const chatId = ctx.chat!.id;
  const infractions = await getInfractions(chatId);
  const reversed = [...infractions].reverse();

  if (reversed.length === 0) {
    await ctx.reply(NO_LOGS, {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const { pageItems, controls, totalPages } = paginate(reversed, {
    page,
    perPage: 5,
    callbackPrefix: "logpage",
  });

  const header = PAGE_HEADER(page, totalPages, reversed.length);
  const entries = pageItems.map(LOG_ENTRY).join("\n\n");
  const keyboard = inlineKeyboard([
    ...controls.inline_keyboard,
    [inlineButton(CANCEL_BTN, "menu:main")],
  ]);

  await ctx.reply(`${header}\n\n${entries}`, { reply_markup: keyboard });
}

composer.command("log", async (ctx) => {
  if (!(await isAdmin(ctx))) {
    await ctx.reply("Only admins can use this command.");
    return;
  }
  await showLogPage(ctx, 0);
});

composer.callbackQuery("modlog:view", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await isAdmin(ctx))) {
    await ctx.reply("Only admins can view logs.");
    return;
  }
  await showLogPage(ctx, 0);
});

composer.callbackQuery(/^logpage:prev:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const page = parseInt(ctx.match[1], 10);
  await showLogPage(ctx, page);
});

composer.callbackQuery(/^logpage:next:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const page = parseInt(ctx.match[1], 10);
  await showLogPage(ctx, page);
});

export default composer;
