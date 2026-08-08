const fs = require('fs');
const path = require('path');

function loadEvents(client) {
    const eventFiles = fs.readdirSync(path.join(__dirname)).filter(file => file.endsWith('.js') && file !== 'loader.js');
    for (const file of eventFiles) {
        const event = require(`./${file}`);
        client.on(event.name, (...args) => event.execute(...args, client));
        console.log(`✅ Loaded event: ${file}`);
    }
}

module.exports = { loadEvents };
