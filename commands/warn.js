const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const { hasStaffPermission } = require('../utils/permissionCheck');
const { WARN_LOG_CHANNEL } = require('../config');
const db = require('../database');

module.exports = {
    name: 'warn',

    async handleWarn(interaction) {
        await interaction.deferReply();
        
        if (!hasStaffPermission(interaction.member)) {
            return interaction.editReply({ content: "❌ You don't have permission to use this command.", ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const member = interaction.guild.members.cache.get(user.id);
        const moderator = interaction.member;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (member.roles.highest.position >= moderator.roles.highest.position) {
            return interaction.editReply({ content: `❌ You cannot warn **${user.tag}** because they have a higher or equal role.`, ephemeral: true });
        }

        const warnId = [...Array(6)]
            .map(() => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
            .charAt(Math.floor(Math.random() * 62)))
            .join('');

        const warnExpiresAt = new Date();
        warnExpiresAt.setDate(warnExpiresAt.getDate() + 7);

        await db.warning.create({
            data: {
                warnId,
                userId: user.id,
                moderatorId: interaction.user.id,
                reason,
                timestamp: new Date().toISOString(),
                expiresAt: warnExpiresAt.toISOString()
            }
        });

        const warnings = await db.warning.findMany({ where: { userId: user.id } });
        const totalWarnings = warnings.length;

        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('⚠️ You have been warned')
                .setColor('Orange')
                .addFields(
                    { name: '📜 Reason', value: reason, inline: false },
                    { name: '🛑 Warned by', value: `<@${interaction.user.id}>`, inline: false },
                    { name: '🔢 Total warnings', value: totalWarnings.toString(), inline: false },
                    { name: '🆔 Warning ID', value: `\`${warnId}\``, inline: false },
                    { name: '⏳ Expires on', value: `<t:${Math.floor(warnExpiresAt.getTime() / 1000)}:F>`, inline: false }
                )
                .setFooter({ text: 'Be careful to avoid further penalties.' })
                .setTimestamp();

            const button = new ButtonBuilder()
                .setCustomId('server_info')
                .setLabel(`Sent from: ${interaction.guild.name}`)
                .setStyle('Secondary')
                .setDisabled(true); 

            const row = new ActionRowBuilder().addComponents(button);

            await user.send({ embeds: [dmEmbed], components: [row] });
        } catch (err) {
            console.log(`Could not DM ${user.tag}`);
        }

        if (totalWarnings % 3 === 0 && member && member.moderatable) {
            const timeoutDuration = 60 * 60 * 1000;
            await member.timeout(timeoutDuration, `Accumulated ${totalWarnings} warnings.`);
            const timeoutMessage = `⏳ <@${user.id}> has been **timed out for 60 minutes** due to reaching **${totalWarnings} warnings**.`;
            await interaction.channel.send(timeoutMessage);
            const logChannel = interaction.guild.channels.cache.get(WARN_LOG_CHANNEL);
            if (logChannel) logChannel.send(timeoutMessage);
        }


        const embed = new EmbedBuilder()
            .setTitle('⚠️ User warned')
            .setColor('Orange')
            .addFields(
                { name: '👤 User', value: `<@${user.id}>`, inline: true },
                { name: '🛑 Warned by', value: `<@${interaction.user.id}>`, inline: true },
                { name: '📜 Reason', value: reason, inline: false },
                { name: '🆔 Warning ID', value: `\`${warnId}\``, inline: false },
                { name: '⚠️ Total warnings', value: totalWarnings.toString(), inline: true },
                { name: '⏳ Expires on', value: `<t:${Math.floor(warnExpiresAt.getTime() / 1000)}:F>`, inline: false }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        const logChannel = interaction.guild.channels.cache.get(WARN_LOG_CHANNEL);
        if (logChannel) logChannel.send({ embeds: [embed] });
    }
};
