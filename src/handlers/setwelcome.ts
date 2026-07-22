import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getSettings, updateSettings } from "../store.js";

const composer = new Composer<Ctx>();

const ASK_TEXT = "Send the new welcome message template now.\n\nUse {user} to mention the new member, {group} for the group name.";
const CONFIRM = (text: string) => `✅ Welcome message updated:\n\n${text}`;
const USAGE = "Usage: /setwelcome — then send the template text.";
const CURRENT = (text: string) => `Current welcome message:\n\n${text}\n\nTo change it, tap below.`;
const CONFIRM_BTN = "Set welcome message";
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

composer.command("setwelcome", async (ctx) => {
  if (!(await isAdmin(ctx))) {
    await ctx.reply("Only admins can use this command.");
    return;
  }

  const chatId = ctx.chat!.id;
  const settings = await getSettings(chatId);

  ctx.session.step = "awaiting_welcome";
  ctx.session.target_chat_id = chatId;

  await ctx.reply(CURRENT(settings.welcome_text), {
    reply_markup: inlineKeyboard([
      [inlineButton(CONFIRM_BTN, "setwelcome:edit")],
      [inlineButton(CANCEL_BTN, "setwelcome:cancel")],
    ]),
  });
});

composer.callbackQuery("setwelcome:edit", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_welcome";
  await ctx.editMessageText(ASK_TEXT, {
    reply_markup: inlineKeyboard([[inlineButton(CANCEL_BTN, "setwelcome:cancel")]]),
  });
});

composer.callbackQuery("setwelcome:cancel", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = undefined;
  await ctx.editMessageText("Welcome message unchanged.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
