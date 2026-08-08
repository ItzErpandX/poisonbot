const { EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
    name: 'leaderboard',
    async handleLeaderboard(interaction) {
        const option = interaction.options.getString('option');
        const validOptions = [
            'tickets_opened',
            'tickets_closed',
            'tickets_claimed',
            'tickets_unclaimed',
            'tickets_force_claimed',
            'tickets_message_sent',
            'tickets_staff_message_sent',
            'messages_sent'
        ];

        if (!validOptions.includes(option)) {
            return interaction.reply({ content: "❌ Invalid option. Please choose a valid one.", ephemeral: true });
        }

        if (option === 'messages_sent') {
            const leaderboard = await db.userMessage.findMany({
                where: { messageCount: { gt: 0 } },
                orderBy: { messageCount: 'desc' },
                take: 10
            });

            if (!leaderboard.length) {
                return interaction.reply({ content: "❌ No data found for **messages** leaderboard.", ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle("🏆 Leaderboard - MESSAGES SENT")
                .setColor('Gold')
                .setTimestamp();

            const description = leaderboard
                .map((entry, index) => `**${index + 1}.** <@${entry.userId}> - **${entry.messageCount}**`)
                .join("\n");

            embed.setDescription(description);

            return interaction.reply({ embeds: [embed] });
        }

        const leaderboardMap = {
            'tickets_opened': 'ticketsOpened',
            'tickets_closed': 'ticketsClosed',
            'tickets_claimed': 'ticketsClaimed',
            'tickets_unclaimed': 'ticketsUnclaimed',
            'tickets_force_claimed': 'ticketsForceClained',
            'tickets_message_sent': 'ticketsMessageSent',
            'tickets_staff_message_sent': 'ticketsStaffMessageSent'
        };
        const prismaField = leaderboardMap[option];
        const leaderboard = await db.ticketStat.findMany({
            where: { [prismaField]: { gt: 0 } },
            orderBy: { [prismaField]: 'desc' },
            take: 10
        });

        if (!leaderboard.length) {
            return interaction.reply({ content: `❌ No data found for **${option}** leaderboard.`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(`🏆 Leaderboard - ${option.replaceAll('_', ' ').toUpperCase()}`)
            .setColor('Gold')
            .setTimestamp();

        const description = leaderboard
            .map((entry, index) => `**${index + 1}.** <@${entry.userId}> - **${entry[prismaField]}**`)
            .join("\n");

        embed.setDescription(description);

        return interaction.reply({ embeds: [embed] });
    }
};
