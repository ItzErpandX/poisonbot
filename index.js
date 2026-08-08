const { Client, GatewayIntentBits, Partials } = require('discord.js');
const antiCrash = require('./utils/anticrash');
const { loadEvents } = require('./events/loader');
const StaffManagement = require('./addons/StaffManagement/StaffManagement');
const WordSnake = require('./addons/WordSnake/WordSnake');
const Counting = require('./addons/Counting/Counting');
require('dotenv').config();

const client = new Client({
    intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.AutoModerationConfiguration,
    GatewayIntentBits.AutoModerationExecution
    ],
    partials: [Partials.Channel]
});

antiCrash(client);
loadEvents(client);

// Initialize Staff Management addon
const staffManagement = new StaffManagement(client);
const wordSnake = new WordSnake(client);
const counting = new Counting(client);

client.once('ready', async () => {
    await staffManagement.init();
    await wordSnake.init();
    await counting.init();
});

client.login(process.env.TOKEN);