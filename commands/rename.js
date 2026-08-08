const db = require('../database');
const { hasStaffPermission } = require('../utils/permissionCheck');

module.exports = {
    name: 'rename',
    async handleRename(interaction) {
        const channel = interaction.channel;
        const newName = interaction.options.getString('name');

        if (!hasStaffPermission(interaction.member)) {
            return interaction.reply({ content: "❌ Only staff or higher can rename tickets.", ephemeral: true });
        }

        const ticketData = await db.ticket.findFirst({ where: { channelId: channel.id } });
        if (!ticketData) return interaction.reply({ content: "❌ Not a valid ticket channel.", ephemeral: true });

        await channel.setName(newName).catch(() => {
            return interaction.reply({ content: "❌ Failed to rename ticket.", ephemeral: true });
        });

        return interaction.reply({ content: `✅ Ticket renamed to **${newName}**!`, ephemeral: true });
    }
};