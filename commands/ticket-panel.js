const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'ticket-panel',
    async handleTicketPanel(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "❌ You don't have permission to use this command.", ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('🎫 Create a Ticket')
            .setDescription('>>> Feel free to open a ticket for any questions, offers, or to purchase.')
            .setColor(0x00FF00);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('create_ticket').setLabel('Create Ticket').setStyle(ButtonStyle.Primary)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });

        return interaction.reply({ content: "✅ Ticket panel sent successfully!", ephemeral: true });
    }
};
