const net = require('net');
const moment = require('moment');
const _ = require('lodash');

const NICK = 'tankikabot',
    PING_PATTERN = /PING :([a-zA-Z\\.]+)/;

function Bot(channel) {
    
    const COMMAND_PATTERN = new RegExp(`PRIVMSG #${channel} :!(.*)\\s*$`);

    let commands = {};
    let timers = {};
    const client = net.connect({
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
                const message = `Unknown command: ${name}`;
                console.log(`${channel}: ${message}`);
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

    this.setCommand = setCommand;
    this.removeCommand = removeCommand;
    this.resetCommands = resetCommands;
    this.setCommand = setCommand;
    this.setTimer = setTimer;
    this.removeTimer = removeTimer;

    function send(message) {
        client.write(`${message}\r\n`);
    }

    function sendMessage(message) {
        client.write(`PRIVMSG #${channel} :${message}\r\n`);
    }

    function setCommand(name, text) {
        console.log(`${channel}: Adding command: !${name} - ${text}`);

        commands[name] = text;
    }

    function removeCommand(name) {
        console.log(`${channel}: Removing command: !${name}`);
        
        delete commands[name];
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
    
    function setTimer(name, timeInMinutes, commandNames) {
        console.log(`${channel}: Adding timer: ${name}`);

        if(name in timers) {
            console.log(`${channel}: Timer(${name}) already exists, removing first`);
            removeTimer(name);
        }

        const intervalObject = setInterval(() => {
            console.log(`${channel}: Timer triggered: ${name}`);

            _.each(commandNames, commandName => runCommand(commandName))
        }, moment.duration(timeInMinutes, 'minutes').asMilliseconds()); 
        
        timers[name] = intervalObject;

        console.log(`${channel}: Added timer: ${name}`);
    }

    function removeTimer(name) {
        console.log(`${channel}: Removing timer: ${name}`);

        clearInterval(timers[name]);
        delete timers[name];
    }
}

module.exports.default = Bot;