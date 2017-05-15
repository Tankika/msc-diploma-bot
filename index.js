const net = require('net');

const NICK = 'tankikabot',
    PING_PATTERN = /PING :([a-zA-Z\\.]+)/;

function Bot(channel) {
    
    const COMMAND_PATTERN = new RegExp(`PRIVMSG #${channel} :!(.*)\\s*$`);

    var commands = {};
    var client = net.connect({
            port: 6667,
            host: 'irc.chat.twitch.tv'
        }, () => {
            console.log('connected to server!');
            send('PASS oauth:9lnozel9qqgasq4cs1tc405c6weixg');
            send(`NICK ${NICK}`);
            send(`JOIN #${channel}`);
        });

    client.on('data', (data) => {
        console.log(data.toString());
    });

    client.on('data', (data) => {
        var matches = COMMAND_PATTERN.exec(data);
        if(matches) {
            var name = matches[1];
            if(name in commands) {
                console.log(`Matched command: ${name}`);
                sendMessage(commands[name]);
            } else {
                const message = `Unknown command: ${name}`;
                console.log(message);
                sendMessage(message);
            }
        }
    });

    client.on('data', (data) => {
        var matches = PING_PATTERN.exec(data);
        if(matches) {
            console.log(`PONG on ${channel}`);
            send(`PONG ${NICK}, ${matches[1]}`);
        }
    });

    client.on('end', () => {
        console.log('disconnected from server');
    });

    this.addCommand = addCommand;
    this.resetCommands = resetCommands;

    function send(message) {
        client.write(`${message}\r\n`);
    };

    function sendMessage(message) {
        client.write(`PRIVMSG #${channel} :${message}\r\n`);
    };

    function addCommand(name, text) {
        console.log(`Adding command to ${channel}: !${name} - ${text}`);

        commands[name] = text;
    }

    function resetCommands() {
        console.log(`Resetting commands on ${channel}`);
        commands = {};
    }
}

module.exports.default = Bot;