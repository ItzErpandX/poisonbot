const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike')
    .setDescription('Manage staff strikes')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a strike to a staff member')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The staff member to give a strike to')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for the strike')
            .setRequired(true)
            .setMaxLength(500)
        )
        .addStringOption(option =>
          option
            .setName('duration')
            .setDescription('Duration of the strike (e.g., 30d, 7d, 1h) - leave empty for default')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('silent')
            .setDescription('Whether to send the strike silently (no DM to user)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a strike from a staff member')
        .addStringOption(option =>
          option
            .setName('strike_id')
            .setDescription('The ID of the strike to remove')
            .setRequired(true)
        )
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

      const subcommand = interaction.options.getSubcommand();

      if (subcommand === 'add') {
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const duration = interaction.options.getString('duration');
        const silent = interaction.options.getBoolean('silent') || false;

        await client.staffManagement.strikeUser(interaction, targetUser, reason, duration, silent);

      } else if (subcommand === 'remove') {
        const strikeId = interaction.options.getString('strike_id');

        await client.staffManagement.removeStrike(interaction, strikeId);
      }

    } catch (error) {
      console.error('Error in strike command:', error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while processing the strike command.',
          ephemeral: true
        });
      }
    }
  }
}; 