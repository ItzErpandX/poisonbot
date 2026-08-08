const { STAFF_ROLE_ID } = require('../config');

function hasStaffPermission(member) {
    const staffRole = member.guild.roles.cache.get(STAFF_ROLE_ID);
    if (!staffRole) return false;
    return member.roles.highest.position >= staffRole.position;
}

module.exports = { hasStaffPermission };
