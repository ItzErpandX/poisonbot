module.exports = (client) => {
    process.on('unhandledRejection', (reason, p) => {
        console.log(' [AntiCrash] :: Unhandled Rejection/Catch');
        console.log(reason, p);
    });

    process.on('uncaughtException', (err, origin) => {
        console.log(' [AntiCrash] :: Uncaught Exception/Catch');
        console.log(err, origin);
    });

    process.on('uncaughtExceptionMonitor', (err, origin) => {
        console.log(' [AntiCrash] :: Uncaught Exception Monitor');
        console.log(err, origin);
    });

    client.on('error', console.error);
    client.on('shardError', console.error);
};
