const discord = require('discord.js');
const config = require("./config.json");
const jsonfile = require('jsonfile');
const commands = {};
let client = null;

commands.writeConfig = () => jsonfile.writeFile('config.json', config, {spaces: 4}, err => {
    if (err) console.log(err)
});

commands.getRole = identifier => {
    if (typeof identifier === 'string')
        if (identifier.match(/\d+/g))
            identifier = identifier.match(/\d+/g);
    for (let guild of client.guilds.values())
        for (let role of guild.roles.values())
            if (role.id == identifier || role.name == identifier)
                return role;
    return null;
};

commands.getChannel = identifier => {
    if (typeof identifier === 'string')
        if (identifier.match(/\d+/g))
            identifier = identifier.match(/\d+/g);
    for (let guild of client.guilds.values())
        for (let channel of guild.channels.values())
            if (channel.id == identifier || channel.name == identifier)
                return channel;
    return null;
};

commands.getUser = (guild, identifier) => {
    if (typeof identifier === 'string')
        if (identifier.match(/\d+/g))
            identifier = identifier.match(/\d+/g);
    for (let member of guild.members.values())
        if (member.id == identifier || member.name == identifier)
            return member;
    return null;
};

commands.mute = async member => {
    console.log(`Attempting to mute ${member.user.username}.`);
    if (config.mute_role_enabled) {
        for (let id of config.mute_roles) {
            let role = commands.getRole(id);
            if (role === null)
                continue;
            member.addRole(role).catch(e => console.error(e));
        }
    } else
        for (let channel of member.guild.channels.values())
            channel.overwritePermissions(member, {SEND_MESSAGES: false}).catch(e => console.error(e));
};

commands.unmute = async member => {
    console.log(`Attempting to unmute ${member.user.username}.`);
    if (config.mute_role_enabled) {
        for (let id of config.mute_roles) {
            let role = commands.getRole(id);
            if (role === null)
                continue;
            member.removeRole(role).catch(e => console.error(e));
        }
    } else
        for (let channel of member.guild.channels.values())
            channel.permissionOverwrites.get(member.id).delete("pardoned").catch(e => console.error(e));
};

commands.report = async message => {
    if (commands.getChannel(config.report_channel_id) !== null)
        commands.getChannel(config.report_channel_id).send(message);
    else
        console.log(`${message}\nMake sure to set a report channel id.`);
};

commands.onDirectMessage = async message => {
    let category = commands.getChannel(config.bot_dm_category_id);
    if (category === null)
        return console.error("Please set the category ID to support bot DM interaction");
    let channel;
    if (!config.bot_dm_channel_ids[message.author.id] || (channel = commands.getChannel(config.bot_dm_channel_ids[message.author.id])) === null) {
        config.bot_dm_channel_ids[message.author.id] = (channel = await category.guild.createChannel(message.author.username + " Bot DM", "text", [{
            id: category.guild.id,
            deny: ['READ_MESSAGES', 'SEND_MESSAGES']
        }], "User messaged bot")).id;
        channel.setParent(category);
        channel.setTopic(`Use \`${config.prefix} close\` to close | Message authors kept anonymous`);
        await channel.send(new discord.RichEmbed()
            .setTitle("Direct Message Surrogate")
            .setColor("PURPLE")
            .addField("User", `${message.author}`)
            .addField("User ID", message.author.id));
        commands.writeConfig();
        commands.notifyResponders(new discord.RichEmbed()
            .setColor("ORANGE")
            .setTitle("Bot DM Received")
            .addField("User", `${message.author}`)
            .addField("Message", message.content)
        );
    }
    channel.send(`<${message.author}> ${message.content}`);
    console.log(message.author.username);
};

commands.notifyResponders = async message => {
    for (let responder of config.bot_dm_responder_ids) {
        let user = await client.fetchUser(responder).catch(e => console.error(e));
        if (user === null)
            continue;
        let dm = await user.createDM();
        dm.send(message);
    }
};

commands.onDirectMessageReply = async (message, user) => {
    if (user == null)
        return message.channel.send("Error fetching user");
    if (message.content === config.prefix + " close"){
        return message.channel.delete();
    }
    (await user.createDM()).send(message.content);
};

commands.onMessage = async message => {
    if (message.author.bot)
        return;
    if (message.channel instanceof discord.DMChannel)
        return commands.onDirectMessage(message);
    if (Object.values(config.bot_dm_channel_ids).includes(message.channel.id)) {
        let id = Object.entries(config.bot_dm_channel_ids).find(entry => entry[1] == message.channel.id);
        let user = await client.fetchUser(id[0]).catch(e => console.error(e));
        return commands.onDirectMessageReply(message, user);
    }
    if (message.content.indexOf(config.prefix) !== 0)
        return;
    if (!message.member.hasPermission("MANAGE_ROLES")
        && !(client.user.id == 431980306111660062 && message.author.id == 159018622600216577))
        return message.channel.send("You do not have permissions to use the bot.");
    let args = message.content.slice(config.prefix.length).trim().split(/\s+/g);
    let command = args.shift().toLocaleLowerCase();
    for (let cmd of commands.list)
        if (cmd.name === command)
            return cmd.action(message, args);
    message.channel.send(`No command found matching '${command}'`);
};

commands.onJoin = async member => {
    let ageMin = (new Date().getTime() - member.user.createdTimestamp) / (1000 * 60);
    console.log(`${member.user.username} has joined (${ageMin} minutes old).`);
    if (ageMin < config.age_ban) {
        console.log(`Attempting to ban user ${member.user.username}`);
        if (config.message_join_ban_enabled)
            member.user.createDM().then(c => c.send(config.message_join_ban).catch(e => console.error(e))).catch(e => console.error(e));
        member.guild.ban(member, {reason: `Age under ${config.age_ban} minutes (${ageMin})`}).catch(e => console.error(e));
        commands.getChannel(config.report_channel_id).send(new discord.RichEmbed()
            .setTitle("Infant Account Ban Notice")
            .setColor("RED")
            .addField("Name", `<@${member.user.id}>`)
            .addField("Guild", member.guild.name)
            .addField("Creation Date", member.user.createdAt)
            .addField("Timestamp", member.user.createdTimestamp)
            .addField("Current Date", new Date())
            .addField("Current Timestamp", new Date().getTime())
            .addField("Account Age", `${Math.floor(ageMin)} minutes.\n${Math.floor(ageMin / 60)} hours.\n${Math.floor(ageMin / 60 / 24)} days.`)
            .addField("Age Threshold", `${config.age_ban} minutes`)
        );
    } else if (ageMin < config.age_mute) {
        console.log(`Attempting to mute user ${member.user.username}`);
        commands.mute(member).catch(e => console.error(e));
        if (config.message_join_enabled)
            member.user.createDM().then(c => c.send(config.message_join).catch(e => console.error(e))).catch(e => console.error(e));
        let message = await commands.getChannel(config.report_channel_id).send(new discord.RichEmbed()
            .setTitle("Toddler Account Mute Notice")
            .setColor("ORANGE")
            .setThumbnail(member.user.avatarURL)
            .addField("Name", `<@${member.user.id}>`)
            .addField("Guild", member.guild.name)
            .addField("Creation Date", member.user.createdAt)
            .addField("Timestamp", member.user.createdTimestamp)
            .addField("Current Date", new Date())
            .addField("Current Timestamp", new Date().getTime())
            .addField("Account Age", `${Math.floor(ageMin)} minutes.\n${Math.floor(ageMin / 60)} hours.\n${Math.floor(ageMin / 60 / 24)} days.`)
            .addField("Age Threshold", `${config.age_mute} minutes`)
        );
        message.react('✅');
        message.react('\uD83D\uDC80');
        message.createReactionCollector((react, user) => user.id !== client.user.id).on('collect', async (reaction, collector) => {
            switch (reaction.emoji.name) {
                case '\uD83D\uDC80':
                    member.guild.ban(member, {reason: `Age under ${config.age_ban} minutes (${ageMin})`}).catch(e => console.error(e));
                    if (config.message_pardon_refused_enabled)
                        member.user.createDM().then(c => c.send(config.message_pardon_refused).catch(e => console.error(e))).catch(e => console.error(e));
                    commands.report(new discord.RichEmbed()
                        .setTitle("Ban Notice")
                        .setColor("RED")
                        .setThumbnail(member.user.avatarURL)
                        .addField("User", `<@${member.id}>`)
                        .addField("Moderator", `<@${reaction.users.get(reaction.users.lastKey()).id}>`)
                    );
                    break;
                case '✅':
                    commands.unmute(member).catch(e => console.error(e));
                    if (config.message_pardon_enabled)
                        member.user.createDM().then(c => c.send(config.message_pardon).catch(e => console.error(e))).catch(e => console.error(e));
                    commands.report(new discord.RichEmbed()
                        .setTitle("Unmute Notice")
                        .setColor("GREEN")
                        .setThumbnail(member.user.avatarURL)
                        .addField("User", `<@${member.id}>`)
                        .addField("Moderator", `<@${reaction.users.get(reaction.users.lastKey()).id}>`)
                    );
                    break;
                default:
                    return;
            }
            message.clearReactions().catch(e => console.error(e));
        });
    } else if (config.report_normal)
        commands.report(new discord.RichEmbed().setDescription(`<@${member.id}> joined.`));
};

commands.init = cl => {
    client = cl;
    client.on('message', message => commands.onMessage(message));
    return commands;
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

addCommand("info", async (message, args) => {
    message.channel.send(new discord.RichEmbed()
        .setTitle("Warden Info")
        .setThumbnail(config.avatar)
        .setColor("RED")
        .addField("Mute Threshold", config.age_mute)
        .addField("Ban Threshold", config.age_ban)
        .addField("Report Channel", `<#${commands.getChannel(config.report_channel_id) ? commands.getChannel(config.report_channel_id).id : "undefined"}>`)
        .addField("Mute Role", `<@&${commands.getRole(config.mute_role_id) ? commands.getRole(config.mute_role_id).id : "undefined"}>`)
        .addField("Mute Role Enabled", config.mute_role_enabled)
    )
});

addCommand("inforaw", async (message, args) => {
    let embed = new discord.RichEmbed()
        .setTitle("config.json")
        .setColor("GRAY");
    for (let configKey in config) {
        embed.addField(configKey, config[configKey]);
    }
    message.channel.send(embed);
});

addCommand("eval", async (message, args) => {
    try {
        message.channel.send(`>${eval(args.join(" "))}`);
    } catch (error) {
        message.channel.send(`Error:${error}`);
    }
});

addCommand("setagemute", async (message, args) => {
    config.age_mute = parseInt(args[0]);
    commands.writeConfig();
    message.channel.send(new discord.RichEmbed().setTitle("Config Update").setColor("ORANGE").addField("Mute Age", `${config.age_mute} minutes`));
});

addCommand("setageban", async (message, args) => {
    config.age_ban = parseInt(args[0]);
    commands.writeConfig();
    message.channel.send(new discord.RichEmbed().setTitle("Config Update").setColor("ORANGE").addField("Ban Age", `${config.age_ban} minutes`));
});

addCommand("addrole", async (message, args) => {
    let role = commands.getRole(args.join(" "));
    if (role !== null) {
        config.mute_roles.push(role.id);
        commands.writeConfig();
        message.channel.send(new discord.RichEmbed().setTitle("Config Update").setColor("ORANGE").addField("Role", `<@&${role.id}>`));
    } else
        message.channel.send("No matching roles found.");
});

addCommand("removerole", async (message, args) => {
    let role = commands.getRole(args.shift());
    if (role === null)
        return message.channel.send("The given role could not be found.");
    for (let i in config.mute_roles) {
        if (config.mute_roles[i] == role.id) {
            config.mute_roles.splice(i, 1);
            commands.writeConfig();
            message.channel.send("Removed the role from the list.");
            return;
        }
    }
    message.channel.send("The list did not contain that role.");
});

addCommand("setroleenabled", async (message, args) => {
    config.mute_role_enabled = args[0] == "true";
    commands.writeConfig();
    message.channel.send(new discord.RichEmbed().setTitle("Config Update").setColor("ORANGE").addField("Role Enabled", args[0] == "true"));
});

addCommand("setchannel", async (message, args) => {
    let channel = commands.getChannel(args.join(" "));
    if (channel !== null) {
        config.report_channel_id = channel.id;
        commands.writeConfig();
        message.channel.send(new discord.RichEmbed().setTitle("Config Update").setColor("ORANGE").addField("Channel", `<#${channel.id}>`));
    } else
        message.channel.send("No matching channel found.");
});

addCommand("setcategory", async (message, args) => {
    let channel = commands.getChannel(args.join(" "));
    if (channel === null)
        return message.channel.send("Could not find the category specified.")
    if (!(channel instanceof discord.CategoryChannel))
        return message.channel.send("The given channel is not a category channel.")
    config.bot_dm_category_id = channel.id;
    commands.writeConfig();
    message.channel.send(new discord.RichEmbed().setTitle("Config Update").setColor("ORANGE").addField("Bot DM Category", `<#${config.bot_dm_category_id}>`));
});

addCommand("addresponder", async (message, args) => {
    let user = commands.getUser(message.guild, args.join(" "));
    if (user === null)
        return message.channel.send("Unable to find the specified user");
    if (config.bot_dm_responder_ids.includes(user.id))
        return message.channel.send("That user is already on the notify list");
    config.bot_dm_responder_ids.push(user.id);
    commands.writeConfig();
    message.channel.send(new discord.RichEmbed().setTitle("Config Update").setColor("GREEN").addField("Bot DM Responder", `${user}`));
});

addCommand("removeresponder", async (message, args) => {
    let user = commands.getUser(message.guild, args.join(" "));
    if (user === null)
        return message.channel.send("Unable to find the specified user");
    for (let i in config.bot_dm_responder_ids) {
        if (config.bot_dm_responder_ids[i] === user.id) {
            config.bot_dm_responder_ids.splice(i, 1);
            commands.writeConfig();
            message.channel.send(new discord.RichEmbed().setTitle("Config Update").setColor("GREEN").addField("Bot DM Responder Removed", `${user}`));
            return;
        }
    }
    message.channel.send("That user is not currently a responder.")
});

addCommand("setreportnormal", async (message, args) => {
    config.report_normal = args[0] == "true";
    commands.writeConfig();
    message.channel.send(new discord.RichEmbed().setTitle("Config Update").setColor("ORANGE").addField("Reporting normal users", args[0] == "true"));
});

addCommand("simjoin", async (message, args) => {
    let user = commands.getUser(message.guild, args.join(" "));
    if (user !== null)
        commands.onJoin(user);
    else
        message.channel.send("Cound not find the specified user.");
});

addCommand("mute", async (message, args) => {
    let user = commands.getUser(message.guild, args.join(" "));
    if (user !== null) {
        await commands.mute(user);
        message.channel.send("User muted.");
    } else
        message.channel.send("Cound not find the specified user.");
});

addCommand("unmute", async (message, args) => {
    let user = commands.getUser(message.guild, args.join(" "));
    if (user !== null) {
        await commands.unmute(user);
        message.channel.send("User unmuted.");
    }
    else
        message.channel.send("Cound not find the specified user.");
});