const db = require('../database');

function cleanupExpiredWarnings() {
    const now = new Date().toISOString();

    console.log(`No expired warnings found...`)
    
    db.warning.deleteMany({
        where: { expiresAt: { lte: now } }
    }).then(result => {
        if (result.count > 0) {
            console.log(`🗑️ Removed ${result.count} expired warnings.`);
        }
    });
}

// Run cleanup every hour
setInterval(cleanupExpiredWarnings, 60 * 60 * 1000);

module.exports = { cleanupExpiredWarnings };
