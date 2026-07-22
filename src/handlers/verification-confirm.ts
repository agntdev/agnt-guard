import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { upsertMember, getMember } from "../store.js";

const composer = new Composer<Ctx>();

const VERIFY_SUCCESS = "✅ You're verified! Welcome to the group.";
const ALREADY_VERIFIED = "You're already verified.";

composer.callbackQuery("verification:confirm", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.callbackQuery.from.id;
  const chatId = ctx.callbackQuery.message?.chat.id ?? ctx.chat?.id ?? 0;

  const existing = await getMember(chatId, userId);
  if (existing?.verified) {
    await ctx.editMessageText(ALREADY_VERIFIED, {
      reply_markup: inlineKeyboard([]),
    });
    return;
  }

  await upsertMember(chatId, userId, {
    verified: true,
    join_time: existing?.join_time ?? Date.now(),
  });

  await ctx.editMessageText(VERIFY_SUCCESS, {
    reply_markup: inlineKeyboard([]),
  });
});

export default composer;
