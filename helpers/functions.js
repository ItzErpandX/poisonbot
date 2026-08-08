// helpers/functions.js

function parseTime(duration) {
    const match = duration.match(/^(\d+)([smhd])$/i);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers = {
        's': 1,
        'm': 60,
        'h': 3600,
        'd': 86400
    };

    return value * (multipliers[unit] || 1);
}

function formatTime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [
        days > 0 ? `${days}d` : '',
        hours > 0 ? `${hours}h` : '',
        minutes > 0 ? `${minutes}m` : '',
        `${secs}s`
    ].filter(Boolean).join(' ') || '0s';
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    parseTime,
    formatTime,
    wait
};
