const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

let roastLines = [];

try {
    const data = fs.readFileSync('./roast_lines.json', 'utf8');
    roastLines = JSON.parse(data); 
    console.log("Roast lines loaded!")
} catch (err) {
    console.error("❌ Failed to load rizz lines from roast_lines.json:", err);
    roastLines = ["Oops! No roast lines available. 😢"];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roast')
        .setDescription('Send a random roast line to a user')
        .addUserOption(option => 
            option.setName('user')
            .setDescription('The user to roast')
            .setRequired(true)),
    
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const randomIndex = Math.floor(Math.random() * roastLines.length);
        const roastLine = roastLines[randomIndex];

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle(`Roast for ${user.username}`)
            .setDescription(roastLine)
            .setTimestamp()
            .setFooter({ text: `Roasted by ${interaction.user.username}` });

        await interaction.reply({ content: `<@${user.id}>`, embeds: [embed] });
    }
};