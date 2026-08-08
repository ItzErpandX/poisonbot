const prisma = require('../../../database');

class StaffStrikeUtil {
    static async create(data) {
        return await prisma.staffStrike.create({
            data: {
                strikeId: data.strikeId,
                guildId: data.guildId,
                userId: data.userId,
                username: data.username,
                reason: data.reason,
                issuedBy: data.issuedBy,
                issuedByUsername: data.issuedByUsername,
                expiresAt: data.expiresAt,
                silent: data.silent || false
            }
        });
    }

    static async findOne(query) {
        return await prisma.staffStrike.findFirst({
            where: query
        });
    }

    static async findMany(query) {
        return await prisma.staffStrike.findMany({
            where: query,
            orderBy: { issuedAt: 'desc' }
        });
    }

    static async find(query) {
        return await prisma.staffStrike.findMany({
            where: query,
            orderBy: { issuedAt: 'desc' }
        });
    }

    static async deleteOne(query) {
        return await prisma.staffStrike.deleteMany({
            where: query
        });
    }

    static async deleteMany(query) {
        return await prisma.staffStrike.deleteMany({
            where: query
        });
    }

    static async getActiveStrikes(guildId, userId) {
        const now = new Date();
        return await prisma.staffStrike.findMany({
            where: {
                guildId,
                userId,
                isActive: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: now } }
                ]
            }
        });
    }

    static async updateById(id, data) {
        return await prisma.staffStrike.update({
            where: { id },
            data
        });
    }
}

module.exports = class StaffStrike {
    constructor(data) {
        Object.assign(this, data);
    }

    async save() {
        return StaffStrikeUtil.create(this);
    }

    isExpired() {
        if (!this.expiresAt) return false;
        return new Date() > this.expiresAt;
    }

    async deleteOne() {
        return await prisma.staffStrike.deleteMany({
            where: { id: this.id }
        });
    }

    static findOne(query) {
        return StaffStrikeUtil.findOne(query);
    }

    static find(query) {
        return StaffStrikeUtil.find(query);
    }

    static findMany(query) {
        return StaffStrikeUtil.findMany(query);
    }

    static delete(query) {
        return StaffStrikeUtil.deleteOne(query);
    }

    static deleteMany(query) {
        return StaffStrikeUtil.deleteMany(query);
    }

    static getActiveStrikes(guildId, userId) {
        return StaffStrikeUtil.getActiveStrikes(guildId, userId);
    }
};

