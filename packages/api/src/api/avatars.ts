/*
 * Copyright (c) 2018-2022 Powercord Developers
 * Licensed under the Open Software License version 3.0
 * SPDX-License-Identifier: OSL-3.0
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { User as DiscordUser } from '@powercord/types/discord'
import type { DatabaseUser, User } from '@powercord/types/users'
import { URL } from 'url'
import { createHash } from 'crypto'
import { fetch } from 'undici'
import config from '@powercord/shared/config'
import { remoteFile } from '../utils/cache.js'
import { fetchUser } from '../utils/discord.js'
import { UserFlags } from '@powercord/shared/flags'

type AvatarRequest = { TokenizeUser: User, Params: { id: string } }

async function getDiscordAvatar (user: User, update: (user: DiscordUser) => void): Promise<Buffer> {
  if (!user.avatar) {
    return fetch(`https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator) % 6}.png`)
      .then((res) => res.arrayBuffer())
      .then((array) => Buffer.from(array))
  }

  const file = await remoteFile(new URL(`https://cdn.discordapp.com/avatars/${user._id}/${user.avatar}.png?size=256`))
  if (!file.success) {
    const discordUser = await fetchUser(user._id)
    // eslint-disable-next-line require-atomic-updates
    user.avatar = discordUser.avatar
    update(discordUser)

    return getDiscordAvatar(user, update)
  }

  return file.data
}

// This route is very restricted to prevent abuse.
// Only avatar of people shown on /contributors & authenticated user can be fetched.
async function avatar (this: FastifyInstance, request: FastifyRequest<AvatarRequest>, reply: FastifyReply) {
  let user = request.user
  if (request.params.id !== request.user?._id) {
    // type safety: because we ensure GHOST bit is clear, we'll only get User objects.
    user = await this.mongo.db!.collection<User>('users').findOne({
      _id: request.params.id,
      flags: {
        $bitsAnySet: UserFlags.DEVELOPER | UserFlags.ADMIN | UserFlags.STAFF | UserFlags.SUPPORT | UserFlags.MODERATOR | UserFlags.CONTRIBUTOR,
        $bitsAllClear: UserFlags.GHOST,
      },
    })
  }

  if (!user) {
    reply.code(422).send()
    return
  }

  const effectiveAvatarId = user.avatar ?? user.discriminator
  const etag = `W/"${createHash('sha256').update(config.secret).update(user._id).update(effectiveAvatarId).digest('base64url')}"`

  reply.header('cache-control', 'public, max-age=86400')
  if (request.headers['if-none-match'] === etag) {
    reply.code(304).send()
    return
  }

  reply.type('image/png')
  reply.header('etag', etag)
  return getDiscordAvatar(user, (newUser) => this.mongo.db!.collection<DatabaseUser>('users').updateOne(
    { _id: newUser.id },
    {
      $currentDate: { updatedAt: true },
      $set: {
        username: newUser.username,
        discriminator: newUser.discriminator,
        avatar: newUser.avatar,
      },
    }
  ))
}

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: '/:id(\\d+).png',
    config: { auth: { optional: true } },
    handler: avatar,
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
    },
  })
}
