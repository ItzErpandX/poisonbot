const { Events, PermissionsBitField } = require('discord.js');
const db = require('../database.js');
const { incrementUserStat, incrementMessageCount } = require('../helpers/statistics');
const { isTicketChannel } = require('../utils/tickets');
const { hasStaffPermission } = require('../utils/permissionCheck');
const { handleRatingMessage } = require('../utils/sendRating');

const cooldowns = new Map();

const requiredPerms = [
  PermissionsBitField.Flags.ViewChannel,
  PermissionsBitField.Flags.SendMessages,
  PermissionsBitField.Flags.ReadMessageHistory,
];

const isOlderThan = (msg, ms) => Date.now() - msg.createdTimestamp > ms;

async function safeSend(channel, content, retries = 2) {
  try {
    return await channel.send(content);
  } catch {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 2000));
      return safeSend(channel, content, retries - 1);
    }
    return null;
  }
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;

    // handle rating messages first
    // using this way it makes sure that only the rating messages are handled
    // and so someone cant abuse the message count system
    await handleRatingMessage(message);
    
    if (!message.guild || !message.member) return;

    // Handle ticket statistics
    // for some reason this took me 2 hours of debugging
    // i fucking hate myself smh
    const isTicket = await isTicketChannel(message.channel.id);
    const isStaff = await hasStaffPermission(message.member);
    const stat = isStaff ? 'ticketsStaffMessageSent' : 'ticketsMessageSent';

    if (!isTicket) {
      await incrementMessageCount(message.author.id);
    } else {
      await incrementMessageCount(message.author.id);
      await incrementUserStat(message.author.id, stat);
    }

    // handling sticky messages
    // probably will need to rewrite that someday lol
    // but as long as it works it's fine ig
    const sticky = await db.stickyMessage.findUnique({ where: { channelId: message.channelId } });
    if (!sticky) return;

    const me = message.guild.members.me;
    if (!me.permissionsIn(message.channel).has(requiredPerms)) {
      await db.stickyMessage.delete({ where: { channelId: message.channelId } });
      console.warn(`[Sticky] Removed from #${message.channel.name} (no perms)`);
      return;
    }

    const now = Date.now();
    const cooldown = cooldowns.get(message.channelId) || 0;
    if (now < cooldown) return;
    cooldowns.set(message.channelId, now + 10_000); // 10s cooldown

    try {
      const history = await message.channel.messages.fetch({ limit: 8 });
      const messages = Array.from(history.values());
      const stickyMessage = messages.find(m => m.id === sticky.last_message_id && m.author.id === message.client.user.id);

      if (stickyMessage && isOlderThan(stickyMessage, 15000)) {
        await stickyMessage.delete().catch(() => {});
        const newMsg = await safeSend(message.channel, sticky.message);
        if (newMsg)
          await db.stickyMessage.update({
            where: { channelId: message.channelId },
            data: { lastMessageId: newMsg.id }
          });
        return;
      }

      const stickyVisible = messages.slice(0, 5).some(m => m.id === sticky.lastMessageId && m.author.id === message.client.user.id);
      if (!stickyVisible) {
        if (sticky.lastMessageId)
          await message.channel.messages.delete(sticky.lastMessageId).catch(() => {});
        const newMsg = await safeSend(message.channel, sticky.message);
        if (newMsg)
          await db.stickyMessage.update({
            where: { channelId: message.channelId },
            data: { lastMessageId: newMsg.id }
          });
        else {
          await db.stickyMessage.delete({ where: { channelId: message.channelId } });
          console.warn(`[Sticky] Removed from #${message.channel.name} (send failure)`);
        }
      }

      const allStickies = messages.filter(m => m.author.id === message.client.user.id && m.content === sticky.message);
      if (allStickies.length > 1) {
        allStickies.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
        const [, ...dupes] = allStickies;
        for (const d of dupes) d.delete().catch(() => {});
      }
    } catch (error) {
      console.error(`[Sticky] Error in #${message.channel.name}:`, error);
    }
  },
};
