const db = require('../database');
const { hasStaffPermission } = require('../utils/permissionCheck');
const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
require('dotenv').config();

module.exports = {
    name: 'close',
    async handleClose(interaction) {
        const channel = interaction.channel;

        if (!hasStaffPermission(interaction.member)) {
            return interaction.reply({ content: "❌ Only staff members can close tickets.", ephemeral: true });
        }

        const ticketData = await db.ticket.findFirst({ where: { channelId: channel.id } });
        if (!ticketData) {
            return interaction.reply({ content: "❌ This ticket is already scheduled for deleting.", ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId('close_ticket_modal')
            .setTitle('🔒 Close Ticket')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('close_reason')
                        .setLabel('Reason for closing this ticket')
                        .setStyle(TextInputStyle.Paragraph)
                        .setMaxLength(500)
                        .setRequired(true)
                )
            );

        return interaction.showModal(modal);
    }
};
