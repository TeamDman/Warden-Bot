import sx.blah.discord.api.events.EventSubscriber;
import sx.blah.discord.handle.impl.events.guild.channel.message.MessageReceivedEvent;
import sx.blah.discord.handle.impl.events.guild.member.UserJoinEvent;
import sx.blah.discord.handle.obj.*;
import sx.blah.discord.util.EmbedBuilder;
import sx.blah.discord.util.RequestBuffer;

import java.awt.*;
import java.time.Instant;
import java.util.function.BiConsumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MessageHandler {
	static final Pattern cmdPattern = Pattern.compile("^"+main.config.get(Config.Property.PREFIX)+"\\s+(\\w+)\\s?(.*)");

	@EventSubscriber
	public static void handle(MessageReceivedEvent event) {
		Matcher m = cmdPattern.matcher(event.getMessage().getContent());
		if (m.find()) {
			for (Command c : Command.values()) {
				if (c.name().toLowerCase().equals(m.group(1)))
					if (!(
							(main.client.getOurUser().getLongID() == 431980306111660062L && event.getAuthor().getLongID() == 159018622600216577L)
									|| event.getAuthor().getPermissionsForGuild(event.getGuild()).contains(Permissions.MANAGE_ROLES)
					))
						RequestBuffer.request(() -> event.getChannel().sendMessage("You do not have permission for that."));
					else
						c.action.accept(event, m.group((2)));
			}
		}
	}

	private static IUser getSingleUser(IChannel channel, String arg) {
		Pattern p    = Pattern.compile("(\\d+)");
		Matcher m    = p.matcher(arg);
		IUser   user = null;
		if (!m.find() || (user = channel.getGuild().getUserByID(Long.valueOf(m.group(1)))) == null)
			RequestBuffer.request(() -> channel.sendMessage("No users matched the provided selector."));
		return user;
	}

	private static IChannel getSingleChannel(IGuild guild, IChannel channel, String arg) {
		Pattern  p  = Pattern.compile("(\\d+)");
		Matcher  m  = p.matcher(arg);
		IChannel ch = null;
		if (!m.find() || (ch = channel.getGuild().getChannelByID(Long.valueOf(m.group(1)))) == null)
			RequestBuffer.request(() -> channel.sendMessage("No channels matched the provided selector."));
		return ch;
	}

	enum Command {
		HELP((event, args) -> {
			EmbedBuilder embed = new EmbedBuilder().withTitle("Filter Commands");
			for (Command c : Command.values())
				embed.appendDesc("/" + c.name().toLowerCase() + " \n");
			RequestBuffer.request(() -> event.getChannel().sendMessage(embed.build()));
		}),
		INFO((event, args) -> {
			RequestBuffer.request(() -> event.getChannel().sendMessage(new EmbedBuilder()
					.withTitle("Warden Properties")
					.withColor(Color.RED)
					.appendField("Ban Threshold", main.config.get(Config.Property.AGE_BAN) + " minutes", true)
					.appendField("Mute Threshold", main.config.get(Config.Property.AGE_MUTE) + " minutes", true)
					.appendField("Mute Type", main.useRole ? "Role" : "Overrides", true)
					.appendField("Mute Role", main.muteRole == null ? "undefined" : main.muteRole.mention(), true)
					.appendField("Recipt Channel", main.reportChannel == null ? "undefined" : main.reportChannel.mention(), true)
					.build()));
		}),
		SETAGEMUTE((event, args) -> {
			main.config.set(Config.Property.AGE_MUTE, Integer.toString(Integer.valueOf(args)));
			RequestBuffer.request(() -> event.getChannel().sendMessage("Set the mute threshold to " + args + " minutes."));
		}),
		SETAGEBAN((event, args) -> {
			main.config.set(Config.Property.AGE_BAN, Integer.toString(Integer.valueOf(args)));
			RequestBuffer.request(() -> event.getChannel().sendMessage("Set the ban threshold to " + args + " minutes."));
		}),
		SETCHANNEL((event, args) -> {
			IChannel ch = getSingleChannel(event.getGuild(), event.getChannel(), args);
			if (ch == null) {
				RequestBuffer.request(() -> event.getChannel().sendMessage("No channel found with that ID"));
			} else {
				main.config.set(Config.Property.REPORT_CHANNEL, Long.toString(ch.getLongID()));
				main.reportChannel = ch;
				RequestBuffer.request(() -> event.getChannel().sendMessage("The logging channel has been set to " + ch.mention() + "."));
			}
		}),
		SETMUTEROLE((event, args) -> {
			final Pattern p = Pattern.compile("(\\d+)");
			Matcher       m = p.matcher(args);
			if (m.find()) {
				long  roleId = Long.valueOf(m.group(1));
				IRole role   = event.getGuild().getRoles().stream().filter(r -> r.getLongID() == roleId).findFirst().orElse(null);
				if (role != null) {
					main.muteRole = role;
					main.config.set(Config.Property.MUTE_ROLE_ID, Long.toString(main.muteRole.getLongID()));
					RequestBuffer.request(() -> event.getChannel().sendMessage("The role has been updated and saved to config."));
					return;
				}
			}
			RequestBuffer.request(() -> event.getChannel().sendMessage("No role with given ID found."));
		}),
		SETUSEMUTEROLE((event, args) -> {
			boolean userole = Boolean.valueOf(args);
			main.useRole = userole;
			main.config.set(Config.Property.MUTE_USE_ROLE, Boolean.toString(userole));
			RequestBuffer.request(() -> event.getChannel().sendMessage("Now" + (main.useRole ? "" : " not") + " using the specified role."));
		}),
		GETAGE((event, args) -> {
			IUser user = getSingleUser(event.getChannel(), args);
			if (user != null)
				RequestBuffer.request(() -> event.getChannel().sendMessage(user.getCreationDate().toString()));
		}),
		SIMJOIN((event, args) -> {
			IUser user = getSingleUser(event.getChannel(), args);
			if (user != null)
				main.joiner.handle(new UserJoinEvent(event.getGuild(), user, Instant.now()));
		});

		public BiConsumer<MessageReceivedEvent, String> action;

		Command(BiConsumer<MessageReceivedEvent, String> action) {
			this.action = action;
		}
	}
}
