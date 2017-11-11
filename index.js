const net = require('net');
const moment = require('moment');
const _ = require('lodash');

function Bot(channel, eventLogger) {

    const NICK = 'tankikabot';
    const PING_PATTERN = /PING :([a-zA-Z\\.]+)/;
    const COMMAND_PATTERN = new RegExp(`PRIVMSG #${channel} :!(.*)\\s*$`);

    const commands = {};
    const timers = {};
    const aliases = {};

    const client = net.connect({
        port: 6667,
        host: 'irc.chat.twitch.tv'
    }, () => {
        send('PASS oauth:9lnozel9qqgasq4cs1tc405c6weixg');
        send(`NICK ${NICK}`);
        send(`JOIN #${channel}`);

        eventLogger.info(`Joined chat room`, {channel: channel});
    });

    client.on('data', (data) => {
        eventLogger.debug(`Data arrived`, {channel: channel, data: data.toString()});
    });

    client.on('data', (data) => {
        var matches = COMMAND_PATTERN.exec(data);
        if(matches) {
            var name = matches[1];
            if(name in commands) {
                eventLogger.debug('Matched command', {channel: channel, command: name});
                sendMessage(commands[name]);
            } else if(name in aliases) {
                const commandName = aliases[name];

                if(!commandName in commands) {
                    throw new Error(`${channel}: ${commandName} was not found, associated with alias ${name}`);
                }

                eventLogger.debug('Matched alias', {channel: channel, alias: name, command: commandName});
                sendMessage(commands[commandName]);
            } else {
                eventLogger.debug('Unknown command', {channel: channel, command: name});
            }
        }
    });

    client.on('data', (data) => {
        var matches = PING_PATTERN.exec(data);
        if(matches) {
            eventLogger.debug('PONG', {channel: channel});
            send(`PONG ${NICK}, ${matches[1]}`);
        }
    });

    client.on('end', () => {
        eventLogger.warn('Left chat room', {channel: channel, channel: channel});
    });

    this.setCommand = setCommand;
    this.removeCommand = removeCommand;
    this.runCommand = runCommand;
    this.setTimer = setTimer;
    this.removeTimer = removeTimer;
    this.setAlias = setAlias;
    this.removeAlias = removeAlias;
    
    function send(message) {
        client.write(`${message}\r\n`);
    }
    
    function sendMessage(message) {
        client.write(`PRIVMSG #${channel} :${message}\r\n`);
    }
    
    function setCommand(name, text) {
        commands[name] = text;
    }
    
    function removeCommand(name) {
        if(!name in commands) {
            return;
        }
    
        delete commands[name];
    }
    
    function runCommand(name) {
        if(!name in commands) {
            throw new Error(`Command ${name} is not added to channel ${channel} or not enabled!`);
        }
    
        sendMessage(commands[name]);
    }
    
    function setTimer(name, timeInMinutes, commandNames) {
        if(name in timers) {
            eventLogger.debug('Timer already exists, removing first', {channel: channel, timer: name});
            removeTimer(name);
        }
    
        const intervalObject = setInterval(() => {
            eventLogger.debug('Timer triggered', {channel: channel, timer: name});
    
            _.each(commandNames, commandName => runCommand(commandName))
        }, moment.duration(timeInMinutes, 'minutes').asMilliseconds()); 
        
        timers[name] = intervalObject;
    }
    
    function removeTimer(name) {
        if(!name in timers) {
            return;
        }
    
        clearInterval(timers[name]);
        delete timers[name];
    }
    
    function setAlias(name, commandName) {
        aliases[name] = commandName;
    }
    
    function removeAlias(name) {
        if(!name in aliases) {
            return;
        }

        delete aliases[name];
    }
}

module.exports.default = Bot;