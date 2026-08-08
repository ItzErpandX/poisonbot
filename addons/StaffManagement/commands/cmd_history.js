const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('View staff history for a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to view history for')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option
        .setName('include_expired')
        .setDescription('Include expired strikes in the history')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction, client) {
    try {
      if (!client.staffManagement) {
        return await interaction.reply({
          content: '❌ Staff Management system is not initialized.',
          ephemeral: true
        });
      }

      if (!client.staffManagement.hasPermission(interaction.member, 'canViewHistory')) {
        return await interaction.reply({
          content: client.staffManagement.lang.commands.noPermission,
          ephemeral: true
        });
      }

      const targetUser = interaction.options.getUser('user');
      const includeExpired = interaction.options.getBoolean('include_expired') || false;

      await interaction.deferReply({ ephemeral: true });

      const { history, strikes } = await client.staffManagement.getStaffHistory(targetUser.id, includeExpired);

      if (history.length === 0 && strikes.length === 0) {
        return await interaction.editReply({
          content: client.staffManagement.lang.commands.history.noHistory.replace('{user}', targetUser.toString())
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(client.staffManagement.lang.history.title.replace('{username}', targetUser.username))
        .setColor(client.staffManagement.config.embedColors.log)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      const promotionHistory = history.filter(h => h.type === 'promotion' || h.type === 'demotion');
      if (promotionHistory.length > 0) {
        const historyText = promotionHistory
          .slice(0, 10)
          .map(h => {
            const action = h.type === 'promotion' ? '📈' : '📉';
            const roleChange = h.fromRole && h.toRole
              ? `${h.fromRole} → ${h.toRole}`
              : h.toRole
                ? `None → ${h.toRole}`
                : `${h.fromRole} → None`;
            const date = `<t:${Math.floor(h.timestamp.getTime() / 1000)}:d>`;
            const moderator = h.moderatorUsername;

            let line = `${action} ${roleChange} - ${date} by ${moderator}`;
            if (h.reason) {
              line += `\n   *${h.reason}*`;
            }
            return line;
          })
          .join('\n');

        embed.addFields({
          name: client.staffManagement.lang.history.fields.promotions,
          value: historyText || client.staffManagement.lang.history.fields.noHistory,
          inline: false
        });
      }

      if (strikes.length > 0) {
        const strikesText = strikes
          .slice(0, 10)
          .map(s => {
            const status = s.isActive ? '🔴' : '✅';
            const date = `<t:${Math.floor(s.issuedAt.getTime() / 1000)}:d>`;
            const expires = s.expiresAt ? `<t:${Math.floor(s.expiresAt.getTime() / 1000)}:d>` : 'Never';

            let line = `${status} **${s.strikeId}** - ${date}`;
            if (s.isActive && s.expiresAt) {
              line += ` (Expires: ${expires})`;
            }
            line += `\n   *${s.reason}* - by ${s.issuedByUsername}`;

            if (!s.isActive && s.removedBy) {
              line += `\n   ✅ Removed by ${s.removedByUsername}`;
            }

            return line;
          })
          .join('\n\n');

        const strikeFieldName = strikes.length > 0
          ? client.staffManagement.lang.history.fields.strikes.replace('{count}', strikes.filter(s => s.isActive).length)
          : client.staffManagement.lang.history.fields.noStrikes;

        embed.addFields({
          name: strikeFieldName,
          value: strikesText,
          inline: false
        });
      } else {
        embed.addFields({
          name: client.staffManagement.lang.history.fields.noStrikes,
          value: 'No strikes found',
          inline: false
        });
      }

      if (!includeExpired) {
        embed.setFooter({ text: client.staffManagement.lang.history.footerText });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in history command:', error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while retrieving history.',
          ephemeral: true
        });
      } else {
        await interaction.editReply({
          content: '❌ An error occurred while retrieving history.'
        });
      }
    }
  }
}; 