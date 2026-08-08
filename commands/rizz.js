const { EmbedBuilder } = require('discord.js');
const fs = require('fs');

let rizzLines = [];

try {
    const data = fs.readFileSync('./rizz_lines.json', 'utf8');
    rizzLines = JSON.parse(data); 
    console.log("Rizz lines loaded!")
} catch (err) {
    console.error("❌ Failed to load rizz lines from rizz_lines.json:", err);
    rizzLines = ["Oops! No rizz lines available. 😢"];
}

module.exports = {
    name: 'rizz',
    async handleRizz(interaction) {
        const user = interaction.options.getUser('user');

        if (!user) {
            return interaction.reply({ content: "❌ Please mention a user to rizz up!", ephemeral: true });
        }

        const randomRizz = rizzLines[Math.floor(Math.random() * rizzLines.length)];

        const embed = new EmbedBuilder()
            .setTitle("💘 Ultimate rizz activated!")
            .setDescription(`**${randomRizz}**`)
            .setColor('#FFC0CB')
            .setFooter({ text: `Sent to ${user.tag}` })
            .setTimestamp();

        return interaction.reply({ content: `💖 <@${user.id}>, someone just rizzed you up!`, embeds: [embed] });
    }
};
