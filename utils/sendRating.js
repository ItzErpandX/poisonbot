const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../database');
const { FEEDBACK_LOG_CHANNEL_ID } = require('../config');

async function sendCloseDm(user, channelName, closedBy, reason) {
    try {
        const dmChannel = await user.createDM();

        // Embed 1 — Ticket closed notification
        const closedEmbed = new EmbedBuilder()
            .setTitle('🔒 Your Ticket Has Been Closed')
            .setColor(0xFF0000)
            .addFields(
                { name: '🎫 Ticket', value: channelName, inline: true },
                { name: '👤 Closed By', value: `<@${closedBy.id}> (${closedBy.user.tag})`, inline: true },
                { name: '📋 Reason', value: reason }
            )
            .setTimestamp();

        await dmChannel.send({ embeds: [closedEmbed] });

        // Embed 2 — Rate experience prompt
        const rateEmbed = new EmbedBuilder()
            .setTitle('⭐ Rate Your Support Experience')
            .setDescription('Would you like to rate your support experience?')
            .setColor(0x5865F2);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('rate_start_yes').setLabel('✅ Yes').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('rate_start_no').setLabel('❌ No').setStyle(ButtonStyle.Danger)
        );

        await dmChannel.send({ embeds: [rateEmbed], components: [row] });

    } catch (err) {
        console.error(`❌ Could not DM user ${user.tag}:`, err);
    }
}

async function disableButtons(interaction) {
    try {
        const disabledRow = new ActionRowBuilder().addComponents(
            interaction.message.components[0].components.map(btn =>
                ButtonBuilder.from(btn).setDisabled(true)
            )
        );
        await interaction.message.edit({ components: [disabledRow] });
    } catch (err) {
        console.error('❌ Could not disable buttons:', err);
    }
}

async function finalizeFeedback(client, userId, dmChannel, comment) {
    const temp = client._ratingTemp?.[userId];
    if (!temp) return;

    if (temp.timeoutId) clearTimeout(temp.timeoutId);

    const { quality, speed } = temp;

    client._ratingTemp[userId].comment_done = true;
    delete client._ratingTemp[userId];

    await db.ticketRating.create({
        data: {
            userId,
            quality,
            speed,
            comment
        }
    });

    const stars = (n) => '⭐'.repeat(n) + '✩'.repeat(5 - n);

    const summaryEmbed = new EmbedBuilder()
        .setTitle('✅ Thank You for Your Feedback!')
        .setColor(0x00FF00)
        .addFields(
            { name: '⭐ Support Quality', value: stars(quality), inline: true },
            { name: '⚡ Response Speed', value: stars(speed), inline: true },
            { name: '💬 Comment', value: comment }
        )
        .setFooter({ text: 'Your feedback helps us improve!' });

    await dmChannel.send({ embeds: [summaryEmbed] });

    try {
        const logChannel = await client.channels.fetch("1480569286337757314");
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('📋 New Ticket Rating')
                .setColor(0x5865F2)
                .addFields(
                    { name: '👤 User', value: `<@${userId}>`, inline: true },
                    { name: '⭐ Quality', value: stars(quality), inline: true },
                    { name: '⚡ Speed', value: stars(speed), inline: true },
                    { name: '💬 Comment', value: comment }
                )
                .setTimestamp()
                .setFooter({ text: `User ID: ${userId}` });

            await logChannel.send({ embeds: [logEmbed] });
        }
    } catch (err) {
        console.error("❌ Could not log feedback to channel:", err);
    }
}

async function handleRatingInteraction(interaction) {
    const { customId } = interaction;

    // User declined to rate
    if (customId === 'rate_start_no') {
        await disableButtons(interaction);
        return interaction.reply({ content: 'No problem! Thanks for using our support. 👋', ephemeral: false });
    }

    // User agreed to rate — start quality question
    if (customId === 'rate_start_yes') {
        await interaction.deferUpdate();
        await disableButtons(interaction);

        interaction.client._ratingTemp = interaction.client._ratingTemp || {};
        interaction.client._ratingTemp[interaction.user.id] = {};

        const embed = new EmbedBuilder()
            .setTitle('⭐ Support Quality')
            .setDescription('How would you rate the **quality** of support you received?\n\n`1` = Very Poor\n`2` = Poor\n`3` = Neutral\n`4` = Good\n`5` = Excellent')
            .setColor(0x5865F2);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('rate_quality_1').setLabel('⭐ 1').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rate_quality_2').setLabel('⭐ 2').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rate_quality_3').setLabel('⭐ 3').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rate_quality_4').setLabel('⭐ 4').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rate_quality_5').setLabel('⭐ 5').setStyle(ButtonStyle.Success)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
    }

    // Step 1: Quality selected
    if (customId.startsWith('rate_quality_')) {
        const qualityScore = parseInt(customId.split('_')[2]);

        interaction.client._ratingTemp = interaction.client._ratingTemp || {};
        interaction.client._ratingTemp[interaction.user.id] = {
            ...interaction.client._ratingTemp[interaction.user.id],
            quality: qualityScore
        };

        await interaction.deferUpdate();
        await disableButtons(interaction);

        const embed = new EmbedBuilder()
            .setTitle('⚡ Response Speed')
            .setDescription('How **fast** did the staff respond to you?\n\n`1` = Very Slow\n`2` = Slow\n`3` = Moderate\n`4` = Fast\n`5` = Very Fast')
            .setColor(0x5865F2);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('rate_speed_1').setLabel('🐢 1').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rate_speed_2').setLabel('🐢 2').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rate_speed_3').setLabel('⚡ 3').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rate_speed_4').setLabel('⚡ 4').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rate_speed_5').setLabel('🚀 5').setStyle(ButtonStyle.Success)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
    }

    // Step 2: Speed selected — ask for comment via chat
    if (customId.startsWith('rate_speed_')) {
        const speedScore = parseInt(customId.split('_')[2]);

        interaction.client._ratingTemp = interaction.client._ratingTemp || {};
        interaction.client._ratingTemp[interaction.user.id] = {
            ...interaction.client._ratingTemp[interaction.user.id],
            speed: speedScore,
            awaitingComment: true
        };

        await interaction.deferUpdate();
        await disableButtons(interaction);

        const embed = new EmbedBuilder()
            .setTitle('💬 Additional Comments')
            .setDescription('Do you have any additional comments?\n\n**Type your message** in this DM and it will be saved.\nOr type `skip` to finish without a comment.')
            .setColor(0x5865F2);

        await interaction.channel.send({ embeds: [embed] });
    }
}

// Handles plain DM messages for the comment step
async function handleRatingMessage(message) {
    if (message.author.bot) return;
    if (message.guild) return; // DMs only

    const temp = message.client._ratingTemp?.[message.author.id];
    if (!temp?.awaitingComment) return;

    const comment = message.content.toLowerCase() === 'skip'
        ? 'No comment provided.'
        : message.content;

    await finalizeFeedback(message.client, message.author.id, message.channel, comment);
}

module.exports = { sendCloseDm, handleRatingInteraction, handleRatingMessage };
