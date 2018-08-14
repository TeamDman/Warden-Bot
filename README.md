# Warden-Bot
A discord bot to manage new users

## Setup
Running `java -jar warden-bot-version-all.jar` will load the bot.
After the first time run, be sure to place the token in `bot.properties`.

## Commands

#### /warden help
Displays the list of commands. This document is much more informative.

#### /warden info 
Displays the current configuration of the bot.

#### /warden setagemute minutes
Sets the threshold at which new accounts will be muted when they join.

#### /warden setageban minutes
Sets the threshold at which new accounts will be banned.

#### /warden setchannel #channel
Sets the channel where the bot will report join events.

#### /warden setmuterole @role
Sets the role to be used for muting users.

#### /warden setusemuterole <true|false>
Sets whether to use a role to mute people, or channel permission overrides.

#### /warden getage @user
Displays the message author's age.

#### /warden simjoin @user
Simulates a user joining the guild where this message is sent.

