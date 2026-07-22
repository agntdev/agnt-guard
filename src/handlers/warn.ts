import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { addInfraction, upsertMember, getMember } from "../store.js";

const composer = new Composer<Ctx>();

const USAGE = "Usage: Reply to a user's message with /warn <reason>\n\nOr use /warn @username <reason>";
const NO_TARGET = "Please reply to a user's message or mention them with @username.";
const DONE = (name: string, reason: string) =>
  `⚠️ Warned ${name}.\nReason: ${reason}`;
const SELF_WARN = "You can't warn yourself.";
const ALREADY_WARNED = (name: string, count: number) =>
  `${name} now has ${count} warning(s).`;

function parseTargetFromText(text: string): { username?: string; reason: string } {
  const parts = text.replace(/^\/warn(@\w+)?\s*/, "").trim().split(/\s+/);
  const username = parts.find((p) => p.startsWith("@"));
  const reason = parts.filter((p) => !p.startsWith("@")).join(" ") || "No reason provided";
  return { username, reason };
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

composer.command("warn", async (ctx) => {
  if (!(await isAdmin(ctx))) {
    await ctx.reply("Only admins can use this command.");
    return;
  }

  let targetUserId: number | undefined;
  let targetName = "Unknown";
  const reason = ctx.message?.text?.replace(/^\/warn(@\w+)?\s*/, "").trim() || "No reason provided";

  if (ctx.message?.reply_to_message?.from) {
    targetUserId = ctx.message.reply_to_message.from.id;
    targetName = ctx.message.reply_to_message.from.first_name;
  } else {
    const { username } = parseTargetFromText(ctx.message?.text ?? "");
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
    await ctx.reply(SELF_WARN);
    return;
  }

  const chatId = ctx.chat!.id;
  const actorId = ctx.from!.id;
  const now = Date.now();

  const member = await upsertMember(chatId, targetUserId!, {
    warning_count: ((await getMember(chatId, targetUserId!))?.warning_count ?? 0) + 1,
  });

  await addInfraction(chatId, {
    user_id: targetUserId!,
    action_type: "warn",
    actor: actorId,
    reason,
    timestamp: now,
  });

  await ctx.reply(DONE(targetName, reason) + "\n" + ALREADY_WARNED(targetName, member.warning_count), {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
