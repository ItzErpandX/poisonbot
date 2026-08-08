const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('messages')
        .setDescription('Check your or another user\'s message count')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check')
                .setRequired(false)),
    
    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        try {
            const result = await db.userMessage.findUnique({ where: { userId: user.id } });
            const count = result?.messageCount || 0;
            const embed = new EmbedBuilder()
                .setTitle("📊 Message Count")
                .setDescription(`**${user.username}** has sent **${count}** messages`)
                .setColor('#0099FF')
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error checking message count:', error);
            await interaction.reply({ 
                content: 'There was an error checking the message count.', 
                ephemeral: true 
            });
        }
    }
};