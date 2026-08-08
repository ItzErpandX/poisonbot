const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-staff')
    .setDescription('Remove all staff roles from a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to remove staff roles from')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('The reason for removing staff roles')
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

      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');

      await client.staffManagement.removeUser(interaction, targetUser, reason);

    } catch (error) {
      console.error('Error in remove command:', error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while removing staff roles.',
          ephemeral: true
        });
      }
    }
  }
}; 