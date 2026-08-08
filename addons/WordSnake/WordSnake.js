const axios = require('axios');
const prisma = require('../../database');
const WORD_SNAKE_CHANNEL_ID = '1367025181729751071';

// Function to validate words using the Dictionary API
const isValidEnglishWord = async (word) => {
    try {
        const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        return response.status === 200 && Array.isArray(response.data);
    } catch (error) {
        console.error(`Word validation failed for "${word}":`, error.message);
        return false;
    }
};

class WordSnake {
    constructor(client) {
        this.client = client;
    }

    async init() {
        // Initialize or get the word snake game state
        let wordSnake = await prisma.wordSnake.findUnique({
            where: { channelId: WORD_SNAKE_CHANNEL_ID }
        });

        if (!wordSnake) {
            wordSnake = await prisma.wordSnake.create({
                data: {
                    channelId: WORD_SNAKE_CHANNEL_ID,
                    lastWord: '',
                    lastUserId: null
                }
            });
        }

        this.setupMessageListener();
        console.log("Word snake game addon is loaded and ready!");
    }

    setupMessageListener() {
        this.client.on('messageCreate', async (message) => {
            if (message.author.bot || message.channel.id !== WORD_SNAKE_CHANNEL_ID) return;

            const word = message.content.trim().toLowerCase();

            // Check if the input is alphabetic only
            if (!/^[a-z]+$/.test(word)) {
                await message.delete();
                const warningMessage = await message.channel.send(`Please use only alphabetic characters for the word.`);
                setTimeout(() => warningMessage.delete(), 3000);
                return;
            }

            // Validate the word using the dictionary API
            const isValidWord = await isValidEnglishWord(word);
            if (!isValidWord) {
                await message.delete();
                const warningMessage = await message.channel.send(`"${word}" is not a valid English word. Try again.`);
                setTimeout(() => warningMessage.delete(), 3000);
                return;
            }

            // Get current game state
            let wordSnakeState = await prisma.wordSnake.findUnique({
                where: { channelId: WORD_SNAKE_CHANNEL_ID }
            });

            // Check if the word starts with the last letter of the previous word
            if (wordSnakeState.lastWord) {
                const lastLetter = wordSnakeState.lastWord.slice(-1);
                if (word[0] !== lastLetter) {
                    await message.delete();
                    const warningMessage = await message.channel.send(`The word must start with '${lastLetter.toUpperCase()}'.`);
                    setTimeout(() => warningMessage.delete(), 3000);
                    return;
                }
            }

            // Prevent the same player from playing consecutively
            if (message.author.id === wordSnakeState.lastUserId) {
                await message.delete();
                const warningMessage = await message.channel.send(`You cannot play consecutively. Wait for someone else.`);
                setTimeout(() => warningMessage.delete(), 3000);
                return;
            }

            // Update the game state in Prisma
            wordSnakeState = await prisma.wordSnake.update({
                where: { channelId: WORD_SNAKE_CHANNEL_ID },
                data: {
                    lastWord: word,
                    lastUserId: message.author.id
                }
            });

            // Delete the original message so we can re-post it via webhook impersonation
            await message.delete();

            // Fetch existing webhooks in the channel to reuse one if possible
            const webhooks = await message.channel.fetchWebhooks();
            let sudoWebhook = webhooks.find(wh => wh.name === "WordSnakeSudo" && wh.owner.id === this.client.user.id);

            // If the webhook doesn't exist, create one
            if (!sudoWebhook) {
                sudoWebhook = await message.channel.createWebhook({
                    name: "WordSnakeSudo"
                });
            }

            // Send the message via the webhook, impersonating the user
            await sudoWebhook.send({
                content: word,
                username: message.author.username,
                avatarURL: message.author.displayAvatarURL({ dynamic: true })
            });
        });
    }
}

module.exports = WordSnake;
