import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getSettings, updateSettings } from "../store.js";

const composer = new Composer<Ctx>();

const ASK_TEXT = "Send the group rules text now.\n\nWrite clear, concise rules for your community.";
const CONFIRM = (text: string) => `✅ Rules updated:\n\n${text}`;
const USAGE = "Usage: /setrules — then send the rules text.";
const CURRENT = (text: string) => `Current rules:\n\n${text}\n\nTo change them, tap below.`;
const CONFIRM_BTN = "Set rules";
const CANCEL_BTN = "Cancel";

async function isAdmin(ctx: Ctx): Promise<boolean> {
  if (!ctx.chat || ctx.chat.type === "private") return true;
  try {
    const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from!.id);
    return ["administrator", "creator"].includes(member.status);
  } catch {
    return false;
  }
}

composer.command("setrules", async (ctx) => {
  if (!(await isAdmin(ctx))) {
    await ctx.reply("Only admins can use this command.");
    return;
  }

  const chatId = ctx.chat!.id;
  const settings = await getSettings(chatId);

  ctx.session.step = "awaiting_rules";
  ctx.session.target_chat_id = chatId;

  await ctx.reply(CURRENT(settings.rules_text), {
    reply_markup: inlineKeyboard([
      [inlineButton(CONFIRM_BTN, "setrules:edit")],
      [inlineButton(CANCEL_BTN, "setrules:cancel")],
    ]),
  });
});

composer.callbackQuery("setrules:edit", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_rules";
  await ctx.editMessageText(ASK_TEXT, {
    reply_markup: inlineKeyboard([[inlineButton(CANCEL_BTN, "setrules:cancel")]]),
  });
});

composer.callbackQuery("setrules:cancel", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = undefined;
  await ctx.editMessageText("Rules unchanged.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
