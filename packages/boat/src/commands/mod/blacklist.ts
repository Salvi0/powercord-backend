/*
 * Copyright (c) 2018-2021 aetheryx & Cynthia K. Rey
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { GuildTextableChannel, Message } from 'eris'
import { BLACKLIST_CACHE } from '../../modules/mod/automod.js'
import { isStaff } from '../../util.js'
import config from '../../config.js'

const USAGE_STR = `Usage: ${config.discord.prefix}blacklist <show | add | remove> (word)`

export async function executor (msg: Message<GuildTextableChannel>, args: string[]): Promise<void> {
  if (!msg.member) return // ???
  if (!isStaff(msg.member)) {
    msg.channel.createMessage('no')
    return
  }

  if (args.length === 0) {
    msg.channel.createMessage(USAGE_STR)
    return
  }

  switch (args.shift()) {
    case 'show': {
      const list = await msg._client.mongo.collection('boat-blacklist').find().toArray()
      msg.channel.createMessage(list.length > 0 ? `\`${list.map((e) => e.word).join('`, `')}\`` : 'The blacklist has no entries.')
      break
    }

    case 'add':
      if (args.length === 0) {
        msg.channel.createMessage(USAGE_STR)
        return
      }

      await msg._client.mongo.collection('boat-blacklist').insertOne({ word: args.join(' ').toLowerCase() })
      msg.channel.createMessage(`Added \`${args.join(' ').toLowerCase()}\` to the blacklist.`)
      while (BLACKLIST_CACHE.length) BLACKLIST_CACHE.pop()
      break

    case 'remove':
    case 'delete':
      if (args.length === 0) {
        msg.channel.createMessage(USAGE_STR)
        return
      }

      msg._client.mongo.collection('boat-blacklist').findOneAndDelete({ word: args.join(' ').toLowerCase() })
        .then(({ value }) => {
          if (value) {
            while (BLACKLIST_CACHE.length) BLACKLIST_CACHE.pop()
            msg.channel.createMessage(`Removed \`${args.join(' ').toLowerCase()}\` fom the blacklist.`)
          } else {
            msg.channel.createMessage(`\`${args.join(' ').toLowerCase()}\` was not found in the blacklist.`)
          }
        })
      break

    default:
      msg.channel.createMessage(USAGE_STR)
      break
  }
}
