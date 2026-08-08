const db = require('../database');
const { hasStaffPermission } = require('../utils/permissionCheck');

module.exports = {
    name: 'remove',
    async handleRemove(interaction) {
        const channel = interaction.channel;
        const member = interaction.options.getMember('member');

        if (!hasStaffPermission(interaction.member)) {
            return interaction.reply({ content: "❌ Only staff or higher can use this command.", ephemeral: true });
        }

        const ticketData = await db.ticket.findFirst({ where: { channelId: channel.id } });
        if (!ticketData) return interaction.reply({ content: "❌ Not a valid ticket channel.", ephemeral: true });

        await db.ticketMember.delete({
            where: { channelId_memberId: { channelId: channel.id, memberId: member.id } }
        }).catch(() => {});
        await channel.permissionOverwrites.delete(member.id);

        return interaction.reply({ content: `✅ **${member.user.tag}** has been removed from the ticket!` });
    }
};
