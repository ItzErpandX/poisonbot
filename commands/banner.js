const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const bannerCommand = new SlashCommandBuilder()
    .setName('banner')
    .setDescription('Get the banner of a user')
    .addUserOption(option => 
        option.setName('user')
              .setDescription('The user you want the banner of')
              .setRequired(false)
    );

const handleBannerCommand = async (interaction) => {
    const user = interaction.options.getUser('user') || interaction.user;
    const fetchedUser = await interaction.client.users.fetch(user.id, { force: true });

    // Check if the user has a banner
    if (!fetchedUser.banner) {
        return interaction.reply({ content: "❌ This user does not have a banner.", ephemeral: true });
    }

    // Get banner URL (static or animated)
    const bannerUrl = `https://cdn.discordapp.com/banners/${user.id}/${fetchedUser.banner}.${fetchedUser.banner.startsWith('a_') ? 'gif' : 'png'}?size=4096`;

    const embed = new EmbedBuilder()
        .setTitle(`${user.username}'s banner`)
        .setImage(bannerUrl)
        .setColor('Random')
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

    return interaction.reply({ embeds: [embed] });
};

module.exports = { bannerCommand, handleBannerCommand };
