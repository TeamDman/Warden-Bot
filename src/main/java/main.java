import sx.blah.discord.api.IDiscordClient;
import sx.blah.discord.api.events.EventSubscriber;
import sx.blah.discord.handle.impl.events.guild.GuildCreateEvent;
import sx.blah.discord.handle.obj.IChannel;
import sx.blah.discord.handle.obj.IRole;

public class main {
	static final IDiscordClient client;
	static final Config         config;
	static       IRole          muteRole      = null;
	static       IChannel       reportChannel = null;
	static       boolean        useRole       = false;
	static final JoinListener joiner = new JoinListener();;

	static {
		config = Config.getConfig();
		client = ClientFactory.getClient();
	}

	public static void main(String[] args) {
		client.getDispatcher().registerListener(MessageHandler.class);
		client.getDispatcher().registerListener(main.class);
		client.getDispatcher().registerListener(joiner);
		useRole = Boolean.valueOf(config.get(Config.Property.MUTE_USE_ROLE));
	}

	@EventSubscriber
	public static void handleJoin(GuildCreateEvent event) {
		for (IChannel ch : event.getGuild().getChannels())
			if (ch.getLongID() == Long.valueOf(config.get(Config.Property.REPORT_CHANNEL)))
				reportChannel = ch;
		for (IRole role : event.getGuild().getRoles())
			if (role.getLongID() == Long.valueOf(config.get(Config.Property.MUTE_ROLE_ID)))
				muteRole = role;
	}
}
