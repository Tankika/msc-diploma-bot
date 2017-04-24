const net = require('net');
const client = net.connect({
        port: 6667,
        host: 'irc.chat.twitch.tv'
    }, () => {
        // 'connect' listener
        // console.log('connected to server!');
        client.write('PASS oauth:9lnozel9qqgasq4cs1tc405c6weixg\r\n');
        client.write('NICK tankikabot\r\n');
        // client.write('JOIN #tankika\r\n');
        // client.write('PRIVMSG #tankika :Test\r\n'); 
});

client.on('data', (data) => {
    console.log(data.toString());
    //client.end();
});

client.on('end', () => {
    console.log('disconnected from server');
});

module.export = {
    "connect" : function() {
        return net.connect({
                port: 6667,
                host: 'irc.chat.twitch.tv'
            }, () => {
                // 'connect' listener
                // console.log('connected to server!');
                client.write('PASS oauth:9lnozel9qqgasq4cs1tc405c6weixg\r\n');
                client.write('NICK tankikabot\r\n');
                // client.write('JOIN #tankika\r\n');
                // client.write('PRIVMSG #tankika :Test\r\n'); 
        });
    }
}