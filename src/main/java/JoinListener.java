import sx.blah.discord.api.events.IListener;
import sx.blah.discord.handle.impl.events.guild.channel.message.reaction.ReactionEvent;
import sx.blah.discord.handle.impl.events.guild.member.UserJoinEvent;
import sx.blah.discord.handle.impl.obj.ReactionEmoji;
import sx.blah.discord.handle.obj.*;
import sx.blah.discord.util.EmbedBuilder;
import sx.blah.discord.util.RequestBuffer;
import sx.blah.discord.util.RequestBuilder;

import java.awt.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

public class JoinListener implements IListener<UserJoinEvent> {
	@Override
	public void handle(UserJoinEvent event) {
		if (main.reportChannel == null) {
			System.out.println("You have not set a report channel yet.");
			return;
		}
		Instant age = event.getUser().getCreationDate();
		long ageMinutes = Instant.now().minus(age.toEpochMilli(), ChronoUnit.MILLIS).getEpochSecond()/60;
		if (ageMinutes < Integer.valueOf(main.config.get(Config.Property.AGE_BAN))) {
			RequestBuffer.request(() -> event.getGuild().banUser(event.getUser()));
			RequestBuffer.request(() -> displayInfo(event.getGuild(), main.reportChannel, event.getUser(), age, Color.RED, "Infant Account Ban Notice"));
		} else if (ageMinutes < Integer.valueOf(main.config.get(Config.Property.AGE_MUTE))) {
			mute(event.getUser(), event.getGuild());
			RequestBuffer.request(() -> {
				IMessage message = displayInfo(event.getGuild(), main.reportChannel, event.getUser(), age, Color.ORANGE, "Toddler Account Mute Notice");
				RequestBuffer.request(() -> message.addReaction(Reaction.BAN.emoji));
				RequestBuffer.request(() -> message.addReaction(Reaction.PARDON.emoji));
				new ReactionListener(new ReactionListener.Builder(message).setAuthor(null).setOnAdd(e -> handle(e, event.getGuild(), event.getUser())));
			});
		}
	}

	private static IMessage displayInfo(IGuild guild, IChannel channel, IUser user, Instant age, Color color, String title) {
		return channel.sendMessage(new EmbedBuilder()
				.withTitle(title)
				.withColor(color)
				.withAuthorIcon(user.getAvatarURL())
				.withAuthorName(user.getName())
				.appendField("Guild", guild.getName(), true)
				.appendField("User", user.mention(), true)
				.appendField("ID", user.getStringID(), true)
				.appendField("Join Instant", age.toString(), true)
				.appendField("Account Age", (Instant.now().minus(age.toEpochMilli(), ChronoUnit.MILLIS).getEpochSecond() / (60)) + " minutes", true)
				.build());
	}

	private static void mute(IUser user, IGuild guild) {
		if (main.useRole && main.muteRole != null) {
			AtomicReference<java.util.List<IRole>> roles = new AtomicReference<>(null);
			new RequestBuilder(main.client).doAction(() -> {
				roles.set(guild.getRolesForUser(user));
				roles.get().add(main.muteRole);
				return true;
			}).andThen(() -> {
				guild.editUserRoles(user, roles.get().toArray(new IRole[0]));
				return true;
			}).execute();
		} else {
			guild.getChannels().forEach(c ->
					RequestBuffer.request(() -> c.overrideUserPermissions(
							user,
							EnumSet.noneOf(Permissions.class),
							EnumSet.of(Permissions.SEND_MESSAGES, Permissions.SEND_TTS_MESSAGES, Permissions.ADD_REACTIONS))));
		}
	}

	private TransientEvent.ReturnType handle(ReactionEvent event, IGuild guild, IUser detainee) {
		if (event.getUser().equals(main.client.getOurUser()))
			return TransientEvent.ReturnType.DONOTHING;
		switch (Reaction.fromEmoji(event.getReaction().getEmoji())) {
			case BAN:
				RequestBuffer.request(() -> guild.banUser(detainee));
				RequestBuffer.request(() -> main.reportChannel.sendMessage(new EmbedBuilder()
						.withTitle("Ban Recipt")
						.withColor(Color.RED)
						.withDesc(detainee.mention() + " has been banned.")
						.build()));
				RequestBuffer.request(() -> event.getMessage().removeAllReactions());
				break;
			case PARDON:
				unmute(detainee, guild);
				RequestBuffer.request(() -> main.reportChannel.sendMessage(new EmbedBuilder()
						.withTitle("Pardon Recipt")
						.withColor(Color.GREEN)
						.withDesc(detainee.mention() + " has been pardoned.")
						.build()));
				RequestBuffer.request(() -> event.getMessage().removeAllReactions());
				break;
		}
		return TransientEvent.ReturnType.DONOTHING;
	}

	private static void unmute(IUser user, IGuild guild) {
		if (main.useRole && main.muteRole != null) {
			AtomicReference<List<IRole>> roles = new AtomicReference<>(null);
			new RequestBuilder(main.client).doAction(() -> {
				roles.set(guild.getRolesForUser(user));
				roles.get().remove(main.muteRole);
				return true;
			}).andThen(() -> {
				guild.editUserRoles(user, roles.get().toArray(new IRole[0]));
				return true;
			}).execute();
		} else {
			guild.getChannels().forEach(c -> RequestBuffer.request(() -> c.removePermissionsOverride(user)));
		}
	}

	private enum Reaction {
		BAN(ReactionEmoji.of("\uD83D\uDC80")),
		PARDON(ReactionEmoji.of("✅")),
		UNKNOWN(null);
		final ReactionEmoji emoji;

		Reaction(ReactionEmoji emoji) {
			this.emoji = emoji;
		}

		static Reaction fromEmoji(ReactionEmoji emoji) {
			for (Reaction control : values())
				if (emoji.equals(control.emoji))
					return control;
			return UNKNOWN;

		}
	}
}
