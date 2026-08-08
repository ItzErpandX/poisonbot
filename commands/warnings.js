const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { hasStaffPermission } = require('../utils/permissionCheck');
const db = require('../database');

module.exports = {
    name: 'warnings',

    async handleWarnings(interaction) {
        if (!hasStaffPermission(interaction.member)) {
            return interaction.reply({ content: "❌ You don't have permission to use this command.", ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const warns = await db.warning.findMany({ where: { userId: user.id }, orderBy: { timestamp: 'desc' } });

        if (!warns.length) {
            return interaction.reply({ content: `✅ **${user.tag}** has no warnings.`, ephemeral: true });
        }

        const warnsPerPage = 5;
        let currentPage = 0;
        const totalPages = Math.ceil(warns.length / warnsPerPage);

        const generateEmbed = (page) => {
            const start = page * warnsPerPage;
            const end = start + warnsPerPage;
            const pageWarns = warns.slice(start, end);

            const description = pageWarns.map((warn, index) =>
                `**${start + index + 1}.** ID: \`${warn.warn_id}\`\n📜 **Reason**: ${warn.reason}\n🛑 **Warned by**: <@${warn.moderator_id}>\n📅 <t:${Math.floor(new Date(warn.timestamp).getTime() / 1000)}:F>\n`
            ).join('\n');

            return new EmbedBuilder()
                .setTitle(`⚠️ Warnings for ${user.tag}`)
                .setDescription(description)
                .setFooter({ text: `Page ${page + 1} of ${totalPages}` })
                .setColor('Orange')
                .setTimestamp();
        };

        const generateRow = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev_warnings').setLabel('⬅️ Previous').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId('next_warnings').setLabel('➡️ Next').setStyle(ButtonStyle.Secondary).setDisabled(page === totalPages - 1)
            );
        };

        const embed = generateEmbed(currentPage);
        const row = generateRow(currentPage);
        const reply = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

        const collector = reply.createMessageComponentCollector({ time: 60_000 });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.user.id !== interaction.user.id) return btnInteraction.reply({ content: "❌ These buttons aren't for you.", ephemeral: true });

            if (btnInteraction.customId === 'prev_warnings') currentPage--;
            if (btnInteraction.customId === 'next_warnings') currentPage++;

            await btnInteraction.update({ embeds: [generateEmbed(currentPage)], components: [generateRow(currentPage)] });
        });

        collector.on('end', async () => {
            await interaction.editReply({ components: [] });
        });
    }
};
