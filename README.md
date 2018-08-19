# Warden Bot
Handles new users as they join the server.
If they are under a certain threshold, they are muted.
If they are under another threshold, they are banned instead.
Moderators are notified when each action occurrs.

Adds support to responding to direct messages to the bots.


## Setup

### Installation

From the command line:

Clone the repo

`git clone https://github.com/TeamDman/Warden-Bot`

Change cmd working directory

`cd Warden-Bot`

Install dependencies

`npm install`

### Running

From the command line,

`node app.js`

For testing purposes, `config.json` contains a value `simjoins_only`.
When enabled, new users are ignored, and only the `/warden simjoin @user` command will trigger the join event.
Make sure this isn't `true` when live.

## Commands

All commands require the MANAGE_ROLES permission.

#### /warden help

Displays a primitive list of commands. 
This document is more helpful.

#### /warden info
Displays relevant values from `config.json`

#### /warden eval
Directly evaluates javascript. Careful.

#### /warden setraw index value
Attempts to directly set a value to the config.
This may not be safe, use specific setter commands if available.

#### /warden setagemute minutes
Sets the age that new accounts must be younger than in order to be automatically muted.

#### /warden setageban minutes
Sets the age that new accounts must be younger than in order to be automatically banned.

#### /warden setrole @role
Sets the role that the bot will use to mute people

#### /warden setroleenabled boolean
If true, the bot will use the provided role. Otherwise, channels will have overrides added per user.

#### /warden setchannel #channel
Sets the channel the bot will report into.

#### /warden simjoin @user
Directly calls the join method as though the user just joined the guild.

#### /warden mute @user
Directly calls the mute method on the given user.

#### /warden unmute @user
Directly calls the unmute method on the given user.

#### /warden setdmcategory id
Sets the category id for where bot DMs are to be posted

#### /warden addresponder @user
Adds a user to the list of users to be DM'd when the bot is DM'd

#### /warden removeresponder @user
The reverse of the above.


### Notes
If the mute type is changed between the muting and unmuting of a user, then the user may not be properly unmuted.


