const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, PermissionsBitField, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { sendCloseDm, handleRatingInteraction } = require('../utils/sendRating');
const db = require('../database');
const { CATEGORY_ID, STAFF_ROLE_ID } = require('../config');
const { generateTranscript } = require('../utils/transcript');
const { hasStaffPermission } = require('../utils/permissionCheck');
const { handleTicketPanel } = require('../commands/ticket-panel');
const { handleAdd } = require('../commands/add');
const { handleRemove } = require('../commands/remove');
const { handleClose } = require('../commands/close');
const { handleRename } = require('../commands/rename');
const { handleBannerCommand } = require('../commands/banner');
const leaderboardCommand = require('../commands/leaderboard');
const { incrementUserStat } = require('../helpers/statistics');
const { handleStats } = require('../commands/stats.js');
const { handleRizz } = require('../commands/rizz.js');
const { handleWarn } = require('../commands/warn.js');
const { handleRemoveWarn } = require('../commands/removewarn.js');
const { handleResetWarns } = require('../commands/resetwarns.js');
const { handleWarnings } = require('../commands/warnings.js');
const { handleSay } = require('../commands/say.js');
const stateditCommand = require('../commands/statedit');
const roastCommand = require('../commands/roast');
const messagesCommand = require('../commands/messages');
const stickyCommand = require('../commands/sticky.js');

// Staff Management commands
const promoteCommand = require('../addons/StaffManagement/commands/cmd_promote');
const demoteCommand = require('../addons/StaffManagement/commands/cmd_demote');
const removeCommand = require('../addons/StaffManagement/commands/cmd_remove');
const strikeCommand = require('../addons/StaffManagement/commands/cmd_strike');
const historyCommand = require('../addons/StaffManagement/commands/cmd_history');


module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {

        // ─── Rating Button Interactions (DMs) ────────────────────────────
        if (
            interaction.isButton() && (
                interaction.customId === 'rate_start_yes' ||
                interaction.customId === 'rate_start_no' ||
                interaction.customId.startsWith('rate_quality_') ||
                interaction.customId.startsWith('rate_speed_')
            )
        ) {
            return handleRatingInteraction(interaction);
        }

        // ─── Slash Commands ───────────────────────────────────────────────
        if (interaction.isCommand()) {
            const cmd = interaction.commandName;
            if (cmd === 'ticket-panel') return handleTicketPanel(interaction);
            if (cmd === 'add') return handleAdd(interaction);
            if (cmd === 'say') return handleSay(interaction);
            if (cmd === 'remove') return handleRemove(interaction);
            if (cmd === 'close') return handleClose(interaction);
            if (cmd === 'rename') return handleRename(interaction);
            if (cmd === 'banner') return handleBannerCommand(interaction);
            if (cmd === 'warn') return handleWarn(interaction);
            if (cmd === 'removewarn') return handleRemoveWarn(interaction);
            if (cmd === 'resetwarns') return handleResetWarns(interaction);
            if (cmd === 'warnings') return handleWarnings(interaction);
            if (cmd === 'rizz') return handleRizz(interaction);
            if (cmd === 'sticky') return stickyCommand.execute(interaction);
            if (cmd === 'roast') return roastCommand.execute(interaction);
            if (cmd === 'stats') return handleStats(interaction);
            if (cmd === 'statedit') return stateditCommand.execute(interaction);
            if (cmd === 'messages') return messagesCommand.execute(interaction);
            if (cmd === 'leaderboard') return leaderboardCommand.handleLeaderboard(interaction);
            
            // Staff Management commands
            if (cmd === 'promote') return promoteCommand.execute(interaction, client);
            if (cmd === 'demote') return demoteCommand.execute(interaction, client);
            if (cmd === 'remove-staff') return removeCommand.execute(interaction, client);
            if (cmd === 'strike') return strikeCommand.execute(interaction, client);
            if (cmd === 'history') return historyCommand.execute(interaction, client);
        }

        // Handle autocomplete for staff commands
        if (interaction.isAutocomplete()) {
            const cmd = interaction.commandName;
            if (cmd === 'promote') return promoteCommand.autocomplete(interaction, client);
            if (cmd === 'demote') return demoteCommand.autocomplete(interaction, client);
            if (cmd === 'remove-staff') return removeCommand.autocomplete(interaction, client);
            if (cmd === 'strike') return strikeCommand.autocomplete(interaction, client);
            if (cmd === 'history') return historyCommand.autocomplete(interaction, client);
        }

        // ─── Button Interactions ──────────────────────────────────────────
        if (interaction.isButton()) {
            const { customId, member, channel } = interaction;

            // Open ticket modal
            if (customId === 'create_ticket') {
                const existingTicket = await db.ticket.findFirst({ where: { userId: member.id } });
                if (existingTicket) {
                    return interaction.reply({ content: `❌ You already have an open ticket: <#${existingTicket.channelId}>`, ephemeral: true });
                }

                const modal = new ModalBuilder()
                    .setCustomId('ticket_reason_modal')
                    .setTitle('🎫 Ticket Creation')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('ticket_reason')
                                .setLabel('Why are you opening this ticket?')
                                .setStyle(TextInputStyle.Paragraph)
                                .setMaxLength(1000)
                                .setRequired(true)
                        )
                    );

                return interaction.showModal(modal);
            }

            // Claim ticket
            if (customId === 'claim_ticket') {
                if (!hasStaffPermission(interaction.member)) {
                    return interaction.reply({ content: "❌ Only staff can claim tickets.", ephemeral: true });
                }

                const ticketData = await db.ticket.findFirst({ where: { channelId: channel.id } });
                if (!ticketData) {
                    return interaction.reply({ content: "❌ This is not a valid ticket channel.", ephemeral: true });
                }

                if (ticketData.staffId) {
                    return interaction.reply({ content: "❌ This ticket is already claimed.", ephemeral: true });
                }

                const userId = interaction.user.id;
                await incrementUserStat(userId, 'ticketsClaimed');
                await db.ticket.update({
                    where: { channelId: channel.id },
                    data: { staffId: member.id }
                });

                await channel.permissionOverwrites.edit(STAFF_ROLE_ID, { SendMessages: false });
                await channel.permissionOverwrites.edit(member.id, { SendMessages: true });

                await channel.send(`✅ Ticket has been claimed by **${member.user.tag}**.`);
                return interaction.reply({ content: "✅ You have successfully claimed this ticket.", ephemeral: true });
            }

            // Unclaim ticket
            if (customId === 'unclaim_ticket') {
                if (!hasStaffPermission(interaction.member)) {
                    return interaction.reply({ content: "❌ Only staff can unclaim tickets.", ephemeral: true });
                }

                const ticketData = await db.ticket.findFirst({ where: { channelId: channel.id } });
                if (!ticketData) {
                    return interaction.reply({ content: "❌ This is not a valid ticket channel.", ephemeral: true });
                }

                if (ticketData.staffId !== member.id) {
                    return interaction.reply({ content: "❌ You can only unclaim tickets that you have claimed.", ephemeral: true });
                }

                const userId = interaction.user.id;
                await incrementUserStat(userId, 'ticketsUnclaimed');
                await db.ticket.update({
                    where: { channelId: channel.id },
                    data: { staffId: null }
                });

                await channel.permissionOverwrites.edit(STAFF_ROLE_ID, { SendMessages: true });
                await channel.permissionOverwrites.edit(member.id, { SendMessages: false });

                await channel.send(`✅ Ticket has been unclaimed and is now available for staff to claim.`);
                return interaction.reply({ content: "✅ You have successfully unclaimed this ticket.", ephemeral: true });
            }

            // Close ticket — show reason modal
            if (customId === 'close_ticket') {
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

        } // ← isButton() ends HERE

        // ─── Modal Submissions ────────────────────────────────────────────

        // Ticket creation modal
        if (interaction.isModalSubmit() && interaction.customId === 'ticket_reason_modal') {
            await interaction.deferReply({ ephemeral: true });

            try {
                const member = interaction.member;

                const existingTicket = await db.ticket.findFirst({ where: { userId: member.id } });
                if (existingTicket) {
                    return interaction.editReply({ content: `❌ You already have an open ticket: <#${existingTicket.channelId}>` });
                }

                const reason = interaction.fields.getTextInputValue('ticket_reason');
                const guild = interaction.guild;
                const userId = interaction.user.id;
                await incrementUserStat(userId, 'ticketsOpened');

                const ticketChannel = await guild.channels.create({
                    name: `ticket-${member.user.username}`,
                    type: 0,
                    parent: CATEGORY_ID,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks] },
                        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks] }
                    ]
                });

                await db.ticket.create({
                    data: {
                        channelId: ticketChannel.id,
                        userId: member.id
                    }
                });

                const embed = new EmbedBuilder()
                    .setTitle('🎫 Ticket Created')
                    .setDescription('A staff member will be with you shortly.\nClick "Close" if you want to close this ticket.')
                    .setColor(0x00FF00)
                    .addFields({ name: '📌 Reason', value: reason });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('unclaim_ticket').setLabel('Unclaim Ticket').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger)
                );

                const ticketMessage = await ticketChannel.send({ content: `<@${member.id}>, <@&${TICKET_MANAGER_ROLE_ID}>`, embeds: [embed], components: [row] });
                await ticketMessage.pin();

                return interaction.editReply({ content: `✅ Ticket created: ${ticketChannel}` });

            } catch (err) {
                console.error(err);
                return interaction.editReply({ content: "❌ An error occurred while creating your ticket." });
            }
        }

        // ✅ Close ticket modal — TOP LEVEL, outside isButton()
        if (interaction.isModalSubmit() && interaction.customId === 'close_ticket_modal') {
            await interaction.deferReply({ ephemeral: true });

            const reason = interaction.fields.getTextInputValue('close_reason');
            const channel = interaction.channel;

            const ticketData = await db.ticket.findFirst({ where: { channelId: channel.id } });
            if (!ticketData) {
                return interaction.editReply({ content: "❌ This ticket is already scheduled for deleting." });
            }

            await db.ticket.delete({ where: { channelId: channel.id } });
            await db.ticketMember.deleteMany({ where: { channelId: channel.id } });

            try {
                await generateTranscript(channel, interaction.member);
            } catch (err) {
                console.error("❌ Error generating transcript:", err);
            }

            const userId = interaction.user.id;
            await incrementUserStat(userId, 'ticketsClosed');

            try {
                const ticketOwner = await interaction.guild.members.fetch(ticketData.userId);
                await sendCloseDm(ticketOwner.user, channel.name, interaction.member, reason);
            } catch (err) {
                console.error("❌ Could not send close DM:", err);
            }

            await interaction.editReply({ content: "✅ Ticket closed and user notified." });
            await channel.send("🔒 Ticket will close in 10 seconds.");
            setTimeout(() => channel.delete().catch(console.error), 10000);
        }

    }
};