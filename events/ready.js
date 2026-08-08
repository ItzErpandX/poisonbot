const { REST, Routes, SlashCommandBuilder, ActivityType } = require('discord.js');
const { CLIENT_ID, GUILD_ID, TOKEN } = require('../config');
const { bannerCommand } = require('../commands/banner');
const stateditCommand = require('../commands/statedit');
const messagesCommand = require('../commands/messages');
const roastCommand = require('../commands/roast')
const stickyCommand = require('../commands/sticky.js');
const { cleanupExpiredWarnings } = require('../tasks/cleanupWarnings');
const promoteCommand = require('../addons/StaffManagement/commands/cmd_promote');
const demoteCommand = require('../addons/StaffManagement/commands/cmd_demote');
const removeStaffCommand = require('../addons/StaffManagement/commands/cmd_remove');
const strikeCommand = require('../addons/StaffManagement/commands/cmd_strike');
const historyCommand = require('../addons/StaffManagement/commands/cmd_history');
const StaffManagement = require('../addons/StaffManagement/StaffManagement');
const WordSnake = require('../addons/WordSnake/WordSnake');
const Counting = require('../addons/Counting/Counting');


module.exports = {
    name: 'clientReady',
    async execute(client) {

        const staffManagement = new StaffManagement(client);
        const wordSnake = new WordSnake(client);
        const counting = new Counting(client);    

        await staffManagement.init();
        await wordSnake.init();
        await counting.init();

        console.log(`${client.user.tag} is online!`);

        client.user.setPresence({
            activities: [{ name: "Rushed", type: ActivityType.Watching }],
            status: "idle"
        });

        const commands = [
            //add
            new SlashCommandBuilder().setName('add').setDescription('Add a member to the ticket (Staff only)').addUserOption(option => option.setName('member').setDescription('Member').setRequired(true)),
            //banner
            bannerCommand.toJSON(),
            //close
            new SlashCommandBuilder().setName('close').setDescription('Close the ticket (Staff only)'),                       
            //leaderboard    
            new SlashCommandBuilder()
                .setName('leaderboard')
                .setDescription('Show ticket statistics leaderboard.')
                .addStringOption(option =>
                    option.setName('option')
                        .setDescription('Choose a leaderboard type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Tickets Opened', value: 'tickets_opened' },
                            { name: 'Tickets Closed', value: 'tickets_closed' },
                            { name: 'Tickets Claimed', value: 'tickets_claimed' },
                            { name: 'Tickets Unclaimed', value: 'tickets_unclaimed' },
                            { name: 'Tickets Force Claimed', value: 'tickets_force_claimed' },
                            { name: 'Tickets Message Sent', value: 'tickets_message_sent' },
                            { name: 'Tickets Staff Message Sent', value: 'tickets_staff_message_sent' },
                            { name: 'Messages Sent', value: 'messages_sent' }
                        )
                ),  
            //remove
            new SlashCommandBuilder().setName('remove').setDescription('Remove a member from the ticket (Staff only)').addUserOption(option => option.setName('member').setDescription('Member').setRequired(true)),
            //removewarn
            new SlashCommandBuilder().setName('removewarn').setDescription('Remove a specific warning. (Staff only)').addUserOption(option => option.setName('user').setDescription('User').setRequired(true)).addStringOption(option => option.setName('warn_id').setDescription('Warn ID').setRequired(true)),
            //rename
            new SlashCommandBuilder().setName('rename').setDescription('Rename the ticket (Staff only)').addStringOption(option => option.setName('name').setDescription('New ticket name').setRequired(true)),
            //resetwarns
            new SlashCommandBuilder().setName('resetwarns').setDescription('Reset warnings for a user or all. (Admin only)').addUserOption(option => option.setName('user').setDescription('The user whose warn you want to remove').setRequired(false)).addBooleanOption(option => option.setName('all').setDescription('Reset warns for all users? (true/false)').setRequired(false)),
            //rizz
            new SlashCommandBuilder().setName('rizz').setDescription('Send a random rizz line to a user').addUserOption(option => option.setName('user').setDescription('The user you want to rizz up').setRequired(true)),
            //say
            new SlashCommandBuilder().setName('say').setDescription('Make the bot send a message (Bot owner only)').addStringOption(option => option.setName('message').setDescription('the message for the bot to send').setRequired(true)),
            //statedit    
            stateditCommand.data.toJSON(),
            //messages
            messagesCommand.data.toJSON(),
            //stats    
            new SlashCommandBuilder()
                .setName('stats')
                .setDescription('View ticket stats of a user.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user whose stats you want to check.')
                        .setRequired(true)
                ),
            roastCommand.data.toJSON(),
            //sticky
            stickyCommand.data.toJSON(),
            //ticket-panel
            new SlashCommandBuilder().setName('ticket-panel').setDescription('Send the ticket panel (Admin only)'),                
            //warn
            new SlashCommandBuilder().setName('warn').setDescription('Warn a user. (Staff only)').addUserOption(option => option.setName('user').setDescription('User to warn').setRequired(true)).addStringOption(option => option.setName('reason').setDescription('Reason for warning').setRequired(true)),
            //warnings
            new SlashCommandBuilder().setName('warnings').setDescription('Check a user\'s warnings. (Staff only)').addUserOption(option => option.setName('user').setDescription('User to check').setRequired(true)),
            // Staff Management commands
            promoteCommand.data.toJSON(),
            demoteCommand.data.toJSON(),
            removeStaffCommand.data.toJSON(),
            strikeCommand.data.toJSON(),
            historyCommand.data.toJSON(),
        ];

        const rest = new REST({ version: '10' }).setToken(TOKEN);
        try {
            await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
            console.log('✅ Commands registered successfully!');
            commands.forEach(command => {
                console.log(`- /${command.name}`);
            });
        } catch (error) {
            console.error('❌ Failed to register commands:', error);
        }



    client.on('interactionCreate', async (interaction) => {
        console.log(`Interaction received: ${interaction.type}, customId: ${interaction.customId ?? 'N/A'}`);
    });
        
    cleanupExpiredWarnings();

    }
};