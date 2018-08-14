const discord = require('discord.js');
const config = require("./config.json");
const jsonfile = require('jsonfile');
const commands = {};
let client = null;

commands.writeConfig = () => jsonfile.writeFile('config.json', config, {spaces: 4}, err => {
    if (err) console.log(err)
});

commands.onMessage = async message => {
    if (message.author.bot)
        return;
    if (message.author.id !== "159018622600216577")
        return;
    if (message.content.indexOf(config.prefix) !== 0)
        return;
    let args = message.content.slice(config.prefix.length).trim().split(/\s+/g);
    let command = args.shift().toLocaleLowerCase();
    for (let cmd of commands.list)
        if (cmd.name === command)
            return cmd.action(message, args);
    message.channel.send(`No command found matching '${command}'`);
};

commands.init = client => {
    this.client = client;

    client.on('message', message => commands.onMessage(message));
};
module.exports = commands;

commands.list = [];

function addCommand(name, action) {
    commands.list.push({name: name, action: action});
}

addCommand("help", async (message, args) => {
    message.channel.send(new discord.RichEmbed()
        .setTitle("Commands")
        .setDescription(commands.list.map(cmd => cmd.name).join('\n')));
});

addCommand("setagemute", async (message, args) => {
    config.age_mute = parseInt(args[0]);
    commands.writeConfig();
});

addCommand("setageban", async (message, args) => {
    config.age_ban = parseInt(args[0]);
    commands.writeConfig();
});