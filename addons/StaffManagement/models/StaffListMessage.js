const prisma = require('../../../database');

class StaffListMessageUtil {
    static async create(data) {
        return await prisma.staffListMessage.create({
            data: {
                guildId: data.guildId,
                messageId: data.messageId,
                channelId: data.channelId
            }
        });
    }

    static async findOne(query) {
        return await prisma.staffListMessage.findFirst({
            where: query
        });
    }

    static async updateById(id, data) {
        return await prisma.staffListMessage.update({
            where: { id },
            data
        });
    }
}

module.exports = class StaffListMessage {
    constructor(data) {
        Object.assign(this, data);
    }

    async save() {
        if (this.id) {
            return StaffListMessageUtil.updateById(this.id, this);
        }
        return StaffListMessageUtil.create(this);
    }

    static findOne(query) {
        return StaffListMessageUtil.findOne(query);
    }

    static create(data) {
        return StaffListMessageUtil.create(data);
    }
};

