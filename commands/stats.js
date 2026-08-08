const { EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
    name: 'stats',

    async handleStats(interaction) {
        const user = interaction.options.getUser('user');
        const stats = await db.TicketStats.findUnique({ where: { userId: user.id } });

        if (!stats) {
            return interaction.reply({ content: `❌ No ticket stats found for **${user.tag}**.`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(`📊 Ticket Stats for ${user.tag}`)
            .setColor('Blue')
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFields(
                { name: "📂 Tickets Opened", value: stats.ticketsOpened.toString(), inline: true },
                { name: "✅ Tickets Closed", value: stats.ticketsClosed.toString(), inline: true },
                { name: "📌c Tickets Claimed", value: stats.ticketsClaimed.toString(), inline: true },
                { name: "🚧 Tickets Unclaimed", value: stats.ticketsUnclaimed.toString(), inline: true },
                { name: "⚡ Force Claims", value: stats.ticketsForceClained.toString(), inline: true },
                { name: "💬 Messages Sent", value: stats.ticketsMessageSent.toString(), inline: true },
                { name: "🔧 Staff Messages Sent", value: stats.ticketsStaffMessageSent.toString(), inline: true }
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
