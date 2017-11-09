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
            console.log(`${channel}: Connected`);
            send('PASS oauth:9lnozel9qqgasq4cs1tc405c6weixg');
            send(`NICK ${NICK}`);
            send(`JOIN #${channel}`);
        });

    client.on('data', (data) => {
        console.log(`${channel}: Data arrived: ${data.toString()}`);
    });

    client.on('data', (data) => {
        var matches = COMMAND_PATTERN.exec(data);
        if(matches) {
            var name = matches[1];
            if(name in commands) {
                console.log(`${channel}: Matched command: ${name}`);
                sendMessage(commands[name]);
            } else {
                const message = `${channel}: Unknown command: ${name}`;
                console.log(message);
                sendMessage(message);
            }
        }
    });

    client.on('data', (data) => {
        var matches = PING_PATTERN.exec(data);
        if(matches) {
            console.log(`${channel}: PONG`);
            send(`PONG ${NICK}, ${matches[1]}`);
        }
    });

    client.on('end', () => {
        console.log(`${channel}: Disconnected`);
    });

    this.addCommand = addCommand;
    this.resetCommands = resetCommands;
    this.runCommand = runCommand;

    function send(message) {
        client.write(`${message}\r\n`);
    };

    function sendMessage(message) {
        client.write(`PRIVMSG #${channel} :${message}\r\n`);
    };

    function addCommand(name, text) {
        console.log(`${channel}: Adding command: !${name} - ${text}`);

        commands[name] = text;
    }

    function resetCommands() {
        console.log(`${channel}: Resetting commands`);
        commands = {};
    }

    function runCommand(name) {
        console.log(`${channel}: Running command: ${name}`);

        if(!name in commands) {
            throw new Error(`Command ${name} is not added to channel ${channel} or not enabled!`);
        }

        sendMessage(commands[name]);
    }
}

module.exports.default = Bot;