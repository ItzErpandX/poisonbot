const db = require('../database');

async function incrementUserStat(userId, column) {
    const exists = await db.ticketStat.findUnique({ where: { userId } });

    if (!exists) {
        await db.ticketStat.create({
            data: {
                userId,
                [column]: 1
            }
        });
    } else {
        const currentValue = exists[column] || 0;
        await db.ticketStat.update({
            where: { userId },
            data: { [column]: currentValue + 1 }
        });
    }
}

async function incrementMessageCount(userId) {
    const exists = await db.userMessage.findUnique({ where: { userId } });

    if (!exists) {
        await db.userMessage.create({
            data: {
                userId,
                messageCount: 1
            }
        });
    } else {
        const currentCount = exists.messageCount || 0;
        await db.userMessage.update({
            where: { userId },
            data: { messageCount: currentCount + 1 }
        });
    }
}

module.exports = { incrementUserStat, incrementMessageCount };