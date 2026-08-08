const math = require('mathjs');
const prisma = require('../../database');

const COUNTING_CHANNEL_ID = '1481675678632906773';
const RESET_ROLE_ID = '1480575883399139328';

class Counting {
    constructor(client) {
        this.client = client;
        this.gameState = null;
    }

    async init() {
        // Initialize or get the game state
        let gameState = await prisma.gameState.findFirst();
        
        if (!gameState) {
            gameState = await prisma.gameState.create({
                data: {
                    currentCount: 1,
                    lastUserId: null
                }
            });
        }
        
        this.gameState = gameState;
        this.setupMessageListener();
        console.log("Counting game addon is loaded and ready!");
    }

    isValidCount(input) {
        return Number.isInteger(input) && input > 0;
    }

    async sendTemporaryMessage(channel, content, delay = 5000) {
        const tempMessage = await channel.send(content);
        setTimeout(() => tempMessage.delete().catch(() => {}), delay);
    }

    async safeReact(message, emoji, delayMs = 100) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                message
                    .react(emoji)
                    .then(resolve)
                    .catch(reject);
            }, delayMs);
        });
    }

    setupMessageListener() {
        this.client.on('messageCreate', async (message) => {
            if (message.author.bot) return;

            // Handle reset command
            if (message.content.toLowerCase() === '!resetcounting') {
                if (message.channel.id !== COUNTING_CHANNEL_ID) return;

                if (!message.member || !message.member.roles.cache.has(RESET_ROLE_ID)) {
                    await message.reply("You don't have permission to perform this command.");
                    return;
                }

                this.gameState = await prisma.gameState.updateMany({
                    data: {
                        currentCount: 1,
                        lastUserId: null
                    }
                });

                await message.channel.send(`Counting has been reset by <@${message.author.id}>!`);
                return;
            }

            // Only process in counting channel
            if (message.channel.id !== COUNTING_CHANNEL_ID) return;

            try {
                let expression = message.content.replace(/ln/g, 'log');
                const node = math.parse(expression);

                // Validate expression safety
                node.traverse((node) => {
                    if (node.type === 'SymbolNode') {
                        throw new Error('Invalid token detected: Symbol not allowed.');
                    }
                    if (node.type === 'FunctionNode') {
                        const allowedFunctions = ['log'];
                        if (!allowedFunctions.includes(node.name)) {
                            throw new Error(`Function "${node.name}" is not allowed.`);
                        }
                    }
                });

                const userNumber = node.evaluate();

                if (this.isValidCount(userNumber)) {
                    // Check if same user posted twice in a row
                    if (message.author.id === this.gameState.lastUserId) {
                        await message.delete();
                        return;
                    }

                    // Check if the count is correct
                    if (userNumber === this.gameState.currentCount) {
                        this.gameState.lastUserId = message.author.id;
                        this.gameState.currentCount++;

                        // Update game state in database
                        await prisma.gameState.updateMany({
                            data: {
                                currentCount: this.gameState.currentCount,
                                lastUserId: this.gameState.lastUserId
                            }
                        });

                        await message.delete();

                        // Send webhook message to show count
                        const webhooks = await message.channel.fetchWebhooks();
                        let countingWebhook = webhooks.find(wh => wh.name === "CountingSudo" && wh.owner.id === this.client.user.id);

                        if (!countingWebhook) {
                            countingWebhook = await message.channel.createWebhook({
                                name: "CountingSudo"
                            });
                        }

                        await countingWebhook.send({
                            content: `${userNumber}`,
                            username: message.author.username,
                            avatarURL: message.author.displayAvatarURL({ dynamic: true })
                        });
                    } else {
                        // Wrong count
                        await message.delete();
                        await this.sendTemporaryMessage(
                            message.channel,
                            `Wrong count, <@${message.author.id}>! The next number is ${this.gameState.currentCount}.`
                        );
                    }
                } else {
                    // Invalid number
                    await message.delete();
                }
            } catch (error) {
                console.error(`Error evaluating expression: ${error.message}`);
                await message.delete();
            }
        });

        this.client.on('messageDelete', async (message) => {
            if (message.channel.id !== COUNTING_CHANNEL_ID) return;
            if (message.author && message.author.bot) return;

            // Handle message delete if needed
        });
    }
}

module.exports = Counting;