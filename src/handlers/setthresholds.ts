import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getSettings, updateSettings } from "../store.js";

const composer = new Composer<Ctx>();

const CURRENT_THRESHOLDS = (s: { max_links: number; max_duplicates: number; warn_action: string; mute_action: string }) =>
  `Current spam thresholds:\n\n` +
  `Links per minute: ${s.max_links}\n` +
  `Duplicate messages: ${s.max_duplicates}\n` +
  `Action on threshold: ${s.warn_action}\n` +
  `Escalation action: ${s.mute_action}\n\n` +
  `Tap below to update.`;
const CONFIRM_BTN = "Update thresholds";
const CANCEL_BTN = "Cancel";
const ASK_LINKS = "Send the max links per minute allowed (1–10).";
const ASK_DUPLICATES = "Send the max duplicate messages allowed (1–10).";
const DONE = (s: { max_links: number; max_duplicates: number }) =>
  `✅ Thresholds updated:\n\nLinks per minute: ${s.max_links}\nDuplicate messages: ${s.max_duplicates}`;

async function isAdmin(ctx: Ctx): Promise<boolean> {
  if (!ctx.chat || ctx.chat.type === "private") return true;
  try {
    const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from!.id);
    return ["administrator", "creator"].includes(member.status);
  } catch {
    return false;
  }
}

composer.command("setthresholds", async (ctx) => {
  if (!(await isAdmin(ctx))) {
    await ctx.reply("Only admins can use this command.");
    return;
  }

  const chatId = ctx.chat!.id;
  const settings = await getSettings(chatId);

  ctx.session.target_chat_id = chatId;

  await ctx.reply(CURRENT_THRESHOLDS(settings), {
    reply_markup: inlineKeyboard([
      [inlineButton(CONFIRM_BTN, "setthresholds:start")],
      [inlineButton(CANCEL_BTN, "setthresholds:cancel")],
    ]),
  });
});

composer.callbackQuery("setthresholds:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_max_links";
  await ctx.editMessageText(ASK_LINKS, {
    reply_markup: inlineKeyboard([[inlineButton(CANCEL_BTN, "setthresholds:cancel")]]),
  });
});

composer.callbackQuery("setthresholds:cancel", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = undefined;
  await ctx.editMessageText("Thresholds unchanged.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
