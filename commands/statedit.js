const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('statedit')
        .setDescription('Modify a user\'s ticket stats (Bot Owner only).')
        .addSubcommand(subcommand =>
            subcommand
                .setName('modify')
                .setDescription('Modify a specific stat')
                .addStringOption(option =>
                    option.setName('stat')
                        .setDescription('The stat to modify.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Tickets Opened', value: 'tickets_opened' },
                            { name: 'Tickets Closed', value: 'tickets_closed' },
                            { name: 'Tickets Claimed', value: 'tickets_claimed' },
                            { name: 'Tickets Unclaimed', value: 'tickets_unclaimed' },
                            { name: 'Tickets Message Sent', value: 'tickets_message_sent' },
                            { name: 'Tickets Staff Message Sent', value: 'tickets_staff_message_sent' }
                        )
                )
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Choose an action.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' },
                            { name: 'Set', value: 'set' }
                        )
                )
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user whose stat you want to modify.')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('The value to modify the stat by.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset all stats for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user whose stats you want to reset.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('transfer')
                .setDescription('Transfer all stats from one user to another')
                .addUserOption(option =>
                    option.setName('source')
                        .setDescription('The user to transfer stats FROM.')
                        .setRequired(true)
                )
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('The user to transfer stats TO.')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ content: '❌ Only the bot owner can use this command.', ephemeral: true });
        }

        if (subcommand === 'modify') {
            const stat = interaction.options.getString('stat');
            const action = interaction.options.getString('action');
            const user = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');

            const statMap = {
                'tickets_opened': 'ticketsOpened',
                'tickets_closed': 'ticketsClosed',
                'tickets_claimed': 'ticketsClaimed',
                'tickets_unclaimed': 'ticketsUnclaimed',
                'tickets_message_sent': 'ticketsMessageSent',
                'tickets_staff_message_sent': 'ticketsStaffMessageSent'
            };
            const prismaField = statMap[stat];

            let userStats = await db.TicketStats.findUnique({ where: { userId: user.id } });
            if (!userStats) {
                await db.TicketStats.create({
                    data: {
                        userId: user.id,
                        [prismaField]: action === 'remove' ? 0 : amount
                    }
                });
            } else {
                let newValue = userStats[prismaField] || 0;

                if (action === 'add') {
                    newValue += amount;
                } else if (action === 'remove') {
                    newValue = Math.max(0, newValue - amount);
                } else if (action === 'set') {
                    newValue = amount;
                }

                await db.TicketStats.update({
                    where: { userId: user.id },
                    data: { [prismaField]: newValue }
                });
            }

            let message;
            if (action === 'remove') {
                message = `✅ Successfully removed \`${amount}\` from **${stat}** for <@${user.id}>.`;
            } else if (action === 'add') {
                message = `✅ Successfully added \`${amount}\` to **${stat}** for <@${user.id}>.`;
            } else if (action === 'set') {
                message = `✅ Successfully set **${stat}** to \`${amount}\` for <@${user.id}>.`;
            }

            return interaction.reply({
                content: message,
                ephemeral: false
            });

        } else if (subcommand === 'reset') {
            const user = interaction.options.getUser('user');
            await db.TicketStats.update({
                where: { userId: user.id },
                data: {
                    ticketsClaimed: 0,
                    ticketsClosed: 0,
                    ticketsOpened: 0,
                    ticketsUnclaimed: 0,
                    ticketsMessageSent: 0,
                    ticketsStaffMessageSent: 0
                }
            }).catch(() => {});
            return interaction.reply({
                content: `✅ Successfully reset all stats for <@${user.id}>.`,
                ephemeral: false
            });

        } else if (subcommand === 'transfer') {
            const source = interaction.options.getUser('source');
            const target = interaction.options.getUser('target');

            const sourceStats = await db.TicketStats.findUnique({ where: { userId: source.id } });
            if (!sourceStats) {
                return interaction.reply({ content: `❌ <@${source.id}> doesn't have any stats to transfer.`, ephemeral: true });
            }

            const fields = ['ticketsClaimed', 'ticketsClosed', 'ticketsOpened', 'ticketsUnclaimed', 'ticketsMessageSent', 'ticketsStaffMessageSent'];

            let targetStats = await db.TicketStats.findUnique({ where: { userId: target.id } });
            if (!targetStats) {
                await db.TicketStats.create({
                    data: {
                        userId: target.id,
                        ticketsClaimed: 0,
                        ticketsClosed: 0,
                        ticketsOpened: 0,
                        ticketsUnclaimed: 0,
                        ticketsMessageSent: 0,
                        ticketsStaffMessageSent: 0
                    }
                });
                targetStats = Object.fromEntries(fields.map(f => [f, 0]));
            }

            const newTargetStats = {};
            for (const field of fields) {
                newTargetStats[field] = (targetStats[field] || 0) + (sourceStats[field] || 0);
            }

            const updateData = {};
            for (const field of fields) {
                updateData[field] = newTargetStats[field];
            }

            await db.TicketStats.update({
                where: { userId: target.id },
                data: updateData
            });

            const resetData = {};
            for (const field of fields) {
                resetData[field] = 0;
            }
            await db.TicketStats.update({
                where: { userId: source.id },
                data: resetData
            });

            return interaction.reply({
                content: `✅ Successfully transferred all stats from <@${source.id}> to <@${target.id}> and reset the source user's stats.`,
                ephemeral: false
            });
        }
    }
};