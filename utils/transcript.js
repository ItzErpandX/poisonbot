const fs = require('fs');
const moment = require('moment');
const path = require('path');
const discordTranscripts = require('discord-html-transcripts');
const { TRANSCRIPT_CHANNEL_ID } = require('../config');

// Main function to generate transcript and handle file + embed
async function generateTranscript(channel, closer) {
    try {
        // Generate the transcript using discord-html-transcripts
        const attachment = await discordTranscripts.createTranscript(channel, {
            limit: -1, // Max amount of messages to fetch. `-1` recursively fetches.
            returnType: 'attachment', // Return the result as an attachment
            filename: `${channel.name}-${channel.id}.html`, // Name of the file
            saveImages: false, // Don't download images
            footerText: `Ticket closed by ${closer.user.tag} at ${moment().format("YYYY-MM-DD HH:mm:ss")}`, // Custom footer with the closure details
            poweredBy: false, // Disable powered by footer
            hydrate: true // Whether to hydrate the html server-side
        });

        const transcriptsDir = './transcripts';
        if (!fs.existsSync(transcriptsDir)) {
            fs.mkdirSync(transcriptsDir, { recursive: true });
        }

        // Save the file locally using the buffer from the attachment
        const filePath = path.join(transcriptsDir, `${channel.name}-${channel.id}.html`);
        fs.writeFileSync(filePath, attachment.attachment); // Save the buffer as a file

        // Fetch the transcript channel from the client
        const transcriptChannel = channel.client.channels.cache.get(TRANSCRIPT_CHANNEL_ID);
        if (!transcriptChannel) {
            console.error(`Transcript channel with ID ${TRANSCRIPT_CHANNEL_ID} not found.`);
            return;
        }

        // Embed to announce transcript
        const embed = {
            title: "🎫 Ticket Closed",
            color: 0xff0000,
            description: `The ticket **${channel.name}** has been closed.`,
            fields: [
                { name: "🔒 Closed by", value: `<@${closer.id}>`, inline: true },
                { name: "📅 Closed at", value: moment().format("YYYY-MM-DD HH:mm:ss"), inline: true }
            ],
            footer: { text: `Ticket ID: ${channel.id}` },
            timestamp: new Date()
        };

        // Send embed + transcript to staff transcript channel
        await transcriptChannel.send({
            embeds: [embed],
            files: [attachment]
        });

        // Notify the original ticket channel
        await channel.send({
            content: "📜 The transcript has been saved and sent to staff.",
            files: [attachment]
        });

    } catch (error) {
        console.error('Error generating transcript:', error);
    }
}

// Export function
module.exports = { generateTranscript };
