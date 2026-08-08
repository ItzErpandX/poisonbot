const db = require('../database');
const { hasStaffPermission } = require('../utils/permissionCheck');

module.exports = {
    name: 'add',
    async handleAdd(interaction) {
        const channel = interaction.channel;
        const member = interaction.options.getMember('member');

        if (!hasStaffPermission(interaction.member)) {
            return interaction.reply({ content: "❌ Only staff or higher can use this command.", ephemeral: true });
        }

        const ticketData = await db.ticket.findFirst({ where: { channelId: channel.id } });
        if (!ticketData) return interaction.reply({ content: "❌ Not a valid ticket channel.", ephemeral: true });

        await db.ticketMember.upsert({
            where: { channelId_memberId: { channelId: channel.id, memberId: member.id } },
            update: {},
            create: { channelId: channel.id, memberId: member.id }
        });
        await channel.permissionOverwrites.edit(member.id, { ViewChannel: true, SendMessages: true, AttachFiles: true, EmbedLinks: true });

        return interaction.reply({ content: `✅ **${member.user.tag}** has been added to the ticket!` });
    }
};
