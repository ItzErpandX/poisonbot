const prisma = require('../../../database');

class StaffHistory {
    static async create(data) {
        return await prisma.staffHistory.create({
            data: {
                guildId: data.guildId,
                userId: data.userId,
                username: data.username,
                type: data.type,
                fromRole: data.fromRole,
                toRole: data.toRole,
                reason: data.reason,
                moderatorId: data.moderatorId,
                moderatorUsername: data.moderatorUsername,
                strikeId: data.strikeId
            }
        });
    }

    static async findByUserId(guildId, userId) {
        return await prisma.staffHistory.findMany({
            where: {
                guildId,
                userId
            },
            orderBy: {
                timestamp: 'desc'
            }
        });
    }

    static async findAll(guildId) {
        return await prisma.staffHistory.findMany({
            where: { guildId },
            orderBy: { timestamp: 'desc' }
        });
    }
}

// Support for new() syntax like Mongoose
module.exports = class StaffHistoryWrapper {
    constructor(data) {
        Object.assign(this, data);
    }

    async save() {
        return StaffHistory.create(this);
    }

    static find(query) {
        if (query.guildId && query.userId) {
            return StaffHistory.findByUserId(query.guildId, query.userId);
        }
        return StaffHistory.findAll(query.guildId);
    }

    static async findOne(query) {
        const results = await prisma.staffHistory.findMany({
            where: query,
            take: 1
        });
        return results[0] || null;
    }
};

