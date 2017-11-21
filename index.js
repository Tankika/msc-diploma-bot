const net = require('net');
const EventEmitter = require('events');
const moment = require('moment');
const _ = require('lodash');

class Bot extends EventEmitter {
    constructor(channel, userId, eventLogger) {
        super();

        this._channel = channel;
        this._userId = userId;
        this._eventLogger = eventLogger;
        
        this._commands = {};
        this._timers = {};
        this._aliases = {};
        
        this.NICK = 'tankikabot';
        
        this.NEW_RAFFLER_EVENT = Symbol('new raffler');
        this.VOTE_EVENT = Symbol('vote');

        const COMMAND_PATTERN = new RegExp(`PRIVMSG #${this._channel} :!(.*)\\s*$`);
        const PING_PATTERN = /PING :([a-zA-Z\\.]+)/;
        const RAFFLE_PATTERN = new RegExp(`:([a-zA-Z0-9_]{3,25})!\\1@\\1.tmi.twitch.tv PRIVMSG #${this._channel} :!raffle\\s*`);
        const POLL_PATTERN = new RegExp(`:([a-zA-Z0-9_]{3,25})!\\1@\\1.tmi.twitch.tv PRIVMSG #${this._channel} :!vote (.+)\\s*`);
    
        this._client = net.connect({
            port: 6667,
            host: 'irc.chat.twitch.tv'
        }, () => {
            this._send('PASS oauth:9lnozel9qqgasq4cs1tc405c6weixg');
            this._send(`NICK ${this.NICK}`);
            //this._send('CAP REQ :twitch.tv/tags');
            this._send(`JOIN #${this._channel}`);
    
            this._eventLogger.info(`Joined chat room`, {channel: this._channel, userId: this._userId});
        });
    
        this._client.on('data', data => {
            this._eventLogger.debug(`Data arrived`, {channel: this._channel, userId: this._userId, data: data.toString()});
        });
    
        this._client.on('data', data => {
            const matches = COMMAND_PATTERN.exec(data);

            if(matches) {
                var name = matches[1];
                if(name in this._commands) {
                    this._eventLogger.debug('Matched command', {channel: this._channel, userId: this._userId, command: name});
                    this.sendMessage(this._commands[name]);
                } else if(name in this._aliases) {
                    const commandName = this._aliases[name];
    
                    if(!commandName in this._commands) {
                        throw new Error(`${this._channel}: ${commandName} was not found, associated with alias ${name}`);
                    }
    
                    this._eventLogger.debug('Matched alias', {channel: this._channel, userId: this._userId, alias: name, command: commandName});
                    this.sendMessage(this._commands[commandName]);
                } else {
                    this._eventLogger.debug('Unknown command', {channel: this._channel, userId: this._userId, command: name});
                }
            }
        });
    
        this._client.on('data', data => {
            const matches = PING_PATTERN.exec(data);

            if(matches) {
                this._eventLogger.debug('PONG', {channel: this._channel, userId: this._userId});
                this._send(`PONG ${this.NICK}, ${matches[1]}`);
            }
        });
    
        this._client.on('end', () => {
            this._eventLogger.warn('Left chat room', {channel: this._channel, userId: this._userId, channel: this._channel, userId: this._userId});
        });

        this._raffleHandler = data => {
            const matches = RAFFLE_PATTERN.exec(data);

            if(matches) {
                this.emit(this.NEW_RAFFLER_EVENT, matches[1]);
            }
        }

        this._pollHandler = data => {
            const matches = POLL_PATTERN.exec(data);

            if(matches) {
                this.emit(this.VOTE_EVENT, matches[1], matches[2]);
            }
        }
    }
    
    _send(message) {
        this._client.write(`${message}\r\n`);
    }

    sendMessage(message) {
        this._client.write(`PRIVMSG #${this._channel} :${message}\r\n`);
    }

    setCommand(name, text) {
        this._commands[name] = text;
    }
    
    removeCommand(name) {
        if(!name in this._commands) {
            return;
        }
    
        delete this._commands[name];
    }
    
    runCommand(name) {
        if(!name in this._commands) {
            throw new Error(`Command ${name} is not added to channel ${this._channel} or not enabled!`);
        }
    
        this.sendMessage(this._commands[name]);
    }
    
    setTimer(name, timeInMinutes, commandNames) {
        if(name in this._timers) {
            this._eventLogger.debug('Timer already exists, removing first', {channel: this._channel, userId: this._userId, timer: name});
            removeTimer(name);
        }
    
        const intervalObject = setInterval(() => {
            this._eventLogger.debug('Timer triggered', {channel: this._channel, userId: this._userId, timer: name});
    
            _.each(commandNames, commandName => runCommand(commandName))
        }, moment.duration(timeInMinutes, 'minutes').asMilliseconds()); 
        
        this._timers[name] = intervalObject;
    }
    
    removeTimer(name) {
        if(!name in this._timers) {
            return;
        }
    
        clearInterval(this._timers[name]);
        delete this._timers[name];
    }
    
    setAlias(name, commandName) {
        this._aliases[name] = commandName;
    }
    
    removeAlias(name) {
        if(!name in this._aliases) {
            return;
        }

        delete this._aliases[name];
    }
    
    resetAliases() {
        this._aliases = {};
    }

    openRaffle(announceStart) {
        if(announceStart) {
            this.sendMessage('Raffle has started, enter with: !raffle');
        }
        this._client.on('data', this._raffleHandler);
    }

    closeRaffle() {
        this.sendMessage('Raffle has closed');
        this._client.removeListener('data', this._raffleHandler);
    }

    openPoll(options) {
        if(options.length) {
            this.sendMessage('Poll has started, vote with: !vote <option>');
            this.sendMessage(`Options are: ${options.join(', ')}`);
        }
        this._client.on('data', this._pollHandler);
    }

    closePoll() {
        this.sendMessage('Poll has closed');
        this._client.removeListener('data', this._pollHandler);
    }
}

module.exports.default = Bot;