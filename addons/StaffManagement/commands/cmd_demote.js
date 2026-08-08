const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('demote')
    .setDescription('Demote a user to a lower staff role')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to demote')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The specific role to demote to (optional)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the demotion (optional)')
        .setRequired(false)
        .setMaxLength(500)
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
      const targetRole = interaction.options.getRole('role');
      const reason = interaction.options.getString('reason');
      const targetRoleId = targetRole ? targetRole.id : null;

      if (targetRoleId && !client.staffManagement.roleHierarchy.has(targetRoleId)) {
        return await interaction.reply({
          content: '❌ The specified role is not a staff role.',
          ephemeral: true
        });
      }

      await client.staffManagement.demoteUser(interaction, targetUser, targetRoleId, reason);

    } catch (error) {
      console.error('Error in demote command:', error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while processing the demotion.',
          ephemeral: true
        });
      }
    }
  },

  async autocomplete(interaction, client) {
    try {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'role' && client.staffManagement) {
        const choices = [];

        const roleEntries = Array.from(client.staffManagement.roleNames.entries())
          .sort(([aId], [bId]) => {
            const aHierarchy = client.staffManagement.roleHierarchy.get(aId);
            const bHierarchy = client.staffManagement.roleHierarchy.get(bId);
            return bHierarchy - aHierarchy;
          });

        for (const [roleId, roleName] of roleEntries) {
          const role = interaction.guild.roles.cache.get(roleId);
          if (role) {
            const hierarchy = client.staffManagement.roleHierarchy.get(roleId);
            choices.push({
              name: `${roleName} (Level ${hierarchy})`,
              value: roleId
            });
          }
        }
        const filtered = choices.filter(choice =>
          choice.name.toLowerCase().includes(focusedOption.value.toLowerCase())
        );

        await interaction.respond(filtered.slice(0, 25));
      }
    } catch (error) {
      console.error('Error in demote autocomplete:', error);
    }
  }
}; 