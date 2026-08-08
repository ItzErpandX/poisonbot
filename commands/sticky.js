const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sticky')
        .setDescription('Manage sticky messages')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a sticky message to the current channel')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('The message to make sticky')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove the sticky message from the current channel'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all sticky messages')),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Check if user has admin permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return await interaction.reply({ content: 'You need the Administrator permission to use this command.', ephemeral: true });
        }

        switch (subcommand) {
            case 'add': {
                const message = interaction.options.getString('message');
                const MAX_LENGTH = 1024;
                const channelId = interaction.channelId;

                // Check if channel already has a sticky message
                const existing = await db.stickyMessage.findUnique({ where: { channelId } });
                if (existing) {
                    return await interaction.reply({ content: 'This channel already has a sticky message. Remove it first before adding a new one.', ephemeral: true });
                }

                // Enforce length limit
                if (message.length > MAX_LENGTH) {
                    return await interaction.reply({ content: `Sticky message is too long. Maximum length is ${MAX_LENGTH} characters.`, ephemeral: true });
                }

                // Add the sticky message
                const sentMessage = await interaction.channel.send(message);
                await db.stickyMessage.create({
                    data: {
                        channelId,
                        message,
                        lastMessageId: sentMessage.id,
                        lastReposted: Date.now()
                    }
                });
                
                await interaction.reply({ content: 'Sticky message has been added!', ephemeral: true });
                break;
            }
            case 'remove': {
                const channelId = interaction.channelId;
                const sticky = await db.stickyMessage.findUnique({ where: { channelId } });
                
                if (!sticky) {
                    return await interaction.reply({ content: 'There is no sticky message in this channel.', ephemeral: true });
                }

                // Fetch recent messages and delete all sticky messages
                const messages = await interaction.channel.messages.fetch({ limit: 100 });
                const stickyMessages = messages.filter(msg => 
                    msg.author.id === interaction.client.user.id && 
                    msg.content === sticky.message
                );

                // Delete all found sticky messages
                await Promise.all(stickyMessages.map(msg => msg.delete().catch(() => {})));

                // Remove from database
                await db.stickyMessage.delete({ where: { channelId } });
                await interaction.reply({ content: `Sticky message has been removed! (Cleaned up ${stickyMessages.size} sticky messages)`, ephemeral: true });
                break;
            }
            case 'list': {
                const stickies = await db.stickyMessage.findMany({});

                if (stickies.length === 0) {
                    return await interaction.reply({ content: 'There are no sticky messages set up.', ephemeral: true });
                }

                // Build embed with a field per sticky. Discord limits: embed description 4096, field value 1024, max 25 fields.
                const embed = new EmbedBuilder()
                    .setTitle('Sticky Messages')
                    .setColor(0x00AE86)
                    .setTimestamp();

                for (let i = 0; i < stickies.length && i < 25; i++) {
                    const sticky = stickies[i];
                    const channelMention = `<#${sticky.channelId}>`;
                    let channelName = channelMention;
                    try {
                        const channel = await interaction.client.channels.fetch(sticky.channelId);
                        if (channel && channel.name) channelName = `${channelMention}`;
                    } catch (e) {
                        // ignore fetch failures
                    }

                    // Ensure field value is at most 1024 characters. Wrap full message in code block.
                    let full = '```\n' + (sticky.message || '') + '\n```';
                    if (full.length > 1024) {
                        // Truncate the inner message to fit within 1016 chars (reserve for code fences)
                        const available = 1024 - 8; // for the triple backticks and newlines
                        const truncated = (sticky.message || '').slice(0, available - 3) + '...';
                        full = '```\n' + truncated + '\n```';
                    }

                    embed.addFields({ name: `${i + 1}. ${channelName}`, value: full });
                }

                // If there are more than 25 stickies, note that only first 25 are shown.
                if (stickies.length > 25) {
                    embed.setFooter({ text: `Showing 25 of ${stickies.length} stickies` });
                }

                await interaction.reply({ embeds: [embed], ephemeral: true });
                break;
            }
        }
    }
};