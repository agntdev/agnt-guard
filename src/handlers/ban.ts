import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { addInfraction } from "../store.js";

const composer = new Composer<Ctx>();

const USAGE = "Usage: Reply to a user's message with /ban\n\nOr use /ban @username";
const DONE = (name: string) => `🚫 Banned ${name} from the group.`;
const SELF_BAN = "You can't ban yourself.";

async function isAdmin(ctx: Ctx): Promise<boolean> {
  if (!ctx.chat || ctx.chat.type === "private") return true;
  try {
    const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from!.id);
    return ["administrator", "creator"].includes(member.status);
  } catch {
    return false;
  }
}

composer.command("ban", async (ctx) => {
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
    const parts = (ctx.message?.text ?? "").replace(/^\/ban(@\w+)?\s*/, "").trim().split(/\s+/);
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
    await ctx.reply(SELF_BAN);
    return;
  }

  const chatId = ctx.chat!.id;
  const actorId = ctx.from!.id;

  try {
    await ctx.api.banChatMember(chatId, targetUserId!);
  } catch {
    await ctx.reply("Couldn't ban that user. They may have higher permissions.");
    return;
  }

  await addInfraction(chatId, {
    user_id: targetUserId!,
    action_type: "ban",
    actor: actorId,
    reason: "Banned from group",
    timestamp: Date.now(),
  });

  await ctx.reply(DONE(targetName), {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
