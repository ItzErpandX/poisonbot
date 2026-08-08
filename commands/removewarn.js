const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const { hasStaffPermission } = require('../utils/permissionCheck');
const { WARN_LOG_CHANNEL } = require('../config');
const db = require('../database');

module.exports = {
    name: 'removewarn',

    async handleRemoveWarn(interaction) {
        if (!hasStaffPermission(interaction.member)) {
            return interaction.reply({ content: "❌ You don't have permission to use this command.", ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const warnId = interaction.options.getString('warn_id');

        // Check if the warn exists
        const warn = await db.warning.findFirst({ where: { warnId, userId: user.id } });
        if (!warn) {
            return interaction.reply({ content: `❌ No warning found with ID **${warnId}** for <@${user.id}>.`, ephemeral: true });
        }

        // Remove the warning
        await db.warning.delete({ where: { warnId } });

        // Confirmation message
        await interaction.reply(`✅ Successfully removed warning **${warnId}** for <@${user.id}>.`);

        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('⚠️ Warning removed')
                .setColor('Orange')
                .addFields(
                    { name: '🛑 Removed by', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '🆔 Warn ID', value: warnId.toString(), inline: false }
                )
                .setFooter({ text: 'Be careful to avoid further penalties.' })
                .setTimestamp();

            // Create disabled button with server name
            const button = new ButtonBuilder()
                .setCustomId('server_info')
                .setLabel(`Sent from: ${interaction.guild.name}`)
                .setStyle('Secondary')
                .setDisabled(true); // Make button non-clickable

            const row = new ActionRowBuilder().addComponents(button);

            await user.send({ embeds: [dmEmbed], components: [row] });
        } catch (err) {
            console.log(`Could not DM ${user.tag}`);
        }

        // Optional: Log to staff channel
        const logChannel = interaction.guild.channels.cache.get(WARN_LOG_CHANNEL);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('⚠️ Warning removed')
                .setColor('Orange')
                .addFields(
                    { name: '👤 User', value: `<@${user.id}>`, inline: true },
                    { name: '🛑 Removed by', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '🆔 Warn ID', value: warnId.toString(), inline: false }
                )
                .setTimestamp();
            logChannel.send({ embeds: [logEmbed] });
        }
    }
};
