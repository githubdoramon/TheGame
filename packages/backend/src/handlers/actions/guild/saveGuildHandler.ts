import { GuildDiscordMetadata } from '@metafam/discord-bot';
import { Request, Response } from 'express';

import {
  Dao_Player,
  Guild_Set_Input,
  GuildDaoInput,
  GuildInfoInput,
  GuildType_Enum,
} from '../../../lib/autogen/hasura-sdk';
import { client } from '../../../lib/hasuraClient';

type GuildDao = GuildDaoInput & { guildId: string };
type ExistingGuildDao = GuildDaoInput & { id: string };
type ExistingGuildDaoWithPlayers = ExistingGuildDao & {
  readonly players: readonly Pick<Dao_Player, 'playerId' | 'visible'>[];
};

export const saveGuildHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { input, session_variables: sessionVariables } = req.body;
  const playerId = sessionVariables['x-hasura-user-id'];

  try {
    const { guildInformation } = input;
    await saveGuild(playerId, guildInformation as GuildInfoInput);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      error: (error as Error).message,
    });
  }
};

const saveGuild = async (playerId: string, guildInfo: GuildInfoInput) => {
  const { guild_metadata: metadata } =
    (await client.GetGuildMetadataById({
      id: guildInfo.uuid,
    })) ?? {};
  if (metadata == null || metadata.length === 0) {
    throw new Error('No pending guild with that ID exists.');
  }
  const [{ creatorId, discordMetadata }] = metadata;

  if (creatorId !== playerId) {
    throw new Error(
      'Only the guild’s discord server owner can edit this guild.',
    );
  }

  // we have to sync existing DAOs with the DAOs passed in here.
  // If this guild already exists, fetch its current DAOs.
  const currentGuildDaos: {
    [contractAddress: string]: ExistingGuildDaoWithPlayers;
  } = {};
  const { guild: currentGuild } = await client.GetGuild({ id: guildInfo.uuid });
  if (currentGuild?.length > 0) {
    currentGuild[0].daos.forEach((dao) => {
      currentGuildDaos[dao.contractAddress] = dao;
    });
  }

  const updatedData: Guild_Set_Input = {
    guildname: guildInfo.guildname,
    name: guildInfo.name,
    type: (guildInfo.type as unknown) as GuildType_Enum,
    description: guildInfo.description,
    discordInviteUrl: guildInfo.discordInviteUrl,
    joinButtonUrl: guildInfo.joinUrl,
    logo: guildInfo.logoUrl,
    websiteUrl: guildInfo.websiteUrl,
    twitterUrl: guildInfo.twitterUrl,
    githubUrl: guildInfo.githubUrl,
  };

  await client.UpdateGuild({
    guildId: guildInfo.uuid,
    object: updatedData,
  });

  let submittedDaos: GuildDao[] = [];
  if (guildInfo.daos) {
    submittedDaos = guildInfo.daos.map((guildDaoInput) => ({
      ...guildDaoInput,
      guildId: guildInfo.uuid,
    }));
  }

  // If there are current DAOs not in the list of incoming DAOs, we want to detach those current DAOs with this guild.
  // If there are no existing players associated with these detached DAOs, we can just delete them
  const daosToDetach: string[] = [];
  const daosToDelete: string[] = [];
  Object.keys(currentGuildDaos).forEach((contractAddress) => {
    const daoMatch = submittedDaos.find(
      (newDao) => newDao.contractAddress === contractAddress,
    );
    if (daoMatch == null) {
      const currentDao = currentGuildDaos[contractAddress];
      if (currentDao.players.length === 0) {
        daosToDelete.push(currentDao.id);
      } else {
        daosToDetach.push(currentDao.id);
      }
    }
  });
  if (daosToDetach.length > 0) {
    await client.DetachDaosFromGuild({ ids: daosToDetach });
  }
  if (daosToDelete.length > 0) {
    await client.DeleteDaos({ ids: daosToDelete });
  }

  // If there are incoming DAOs not in the list of current DAOs, add and associate them with this guild
  const newDaos: GuildDao[] = [];
  const updatedDaos: ExistingGuildDao[] = [];

  submittedDaos.forEach((dao) => {
    const exists = Object.keys(currentGuildDaos).includes(dao.contractAddress);
    if (exists) {
      updatedDaos.push({
        ...dao,
        id: currentGuildDaos[dao.contractAddress].id,
      });
    } else {
      newDaos.push(dao);
    }
  });

  await client.InsertDaos({ objects: newDaos });

  // For any incoming DAOs already associated with this guild, update their information
  await Promise.all(
    updatedDaos.map((dao) => client.UpdateDao({ daoId: dao.id, object: dao })),
  );

  // TODO Invalidate any DAO member caches as well?

  const updatedMetadata: GuildDiscordMetadata = {
    ...discordMetadata,
    membershipRoleIds: guildInfo.discordMembershipRoles,
    administratorRoleIds: guildInfo.discordAdminRoles,
  };

  await client.UpdateGuildDiscordMetadata({
    guildId: guildInfo.uuid,
    discordMetadata: updatedMetadata,
  });
};
