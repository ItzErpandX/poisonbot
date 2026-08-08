const db = require('../database');

module.exports = {
    async isTicketChannel(channelId) {
        try {
            const ticket = await db.ticket.findUnique({ where: { channelId } });
            console.log(`Checked if channel ${channelId} is a ticket channel: ${!!ticket}`);
            return !!ticket;
        } catch (error) {
            console.error(`Error checking ticket channel: ${error.message}`);
            return false;
        }
    }
};
