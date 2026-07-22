import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { upsertMember, getSettings } from "../store.js";

const composer = new Composer<Ctx>();

composer.on("message:new_chat_members", async (ctx) => {
  const members = ctx.message.new_chat_members;
  if (!members || members.length === 0) return;

  const chatId = ctx.chat!.id;
  const settings = await getSettings(chatId);

  for (const member of members) {
    if (member.is_bot) continue;

    await upsertMember(chatId, member.id, {
      display_name: member.first_name,
      join_time: Date.now(),
      verified: false,
    });

    const welcomeText = settings.welcome_text || "Welcome to the group! Please verify you're human.";
    const displayName = member.first_name || "there";
    const text = `${welcomeText.replace("{user}", displayName).replace("{group}", ctx.chat!.title ?? "the group")}\n\nTap the button below to verify you're human.`;

    await ctx.reply(text, {
      reply_markup: inlineKeyboard([
        [inlineButton("I'm human", "verification:confirm")],
      ]),
    });
  }
});

export default composer;
