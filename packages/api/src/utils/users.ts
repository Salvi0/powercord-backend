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

import type { User, RestUser } from '@powercord/types/users'

function paywallify (customBadges: User['badges']['custom'], tier: number): User['badges']['custom'] {
  tier = 69 // todo: we don't keep track of patreon tier yet
  return {
    color: tier < 1 ? null : customBadges?.color || null,
    icon: tier < 2 ? null : customBadges?.icon || null,
    name: tier < 2 ? null : customBadges?.name || null,
  }
}

export function formatUser (user: User, bypassVisibility?: boolean): RestUser {
  return {
    id: user._id,
    username: user.username,
    discriminator: user.discriminator,
    avatar: user.avatar,
    badges: {
      developer: Boolean(user.badges.developer),
      staff: Boolean(user.badges.staff),
      support: Boolean(user.badges.support),
      contributor: Boolean(user.badges.contributor),
      translator: user.badges.translator || false, // Array of langs or false
      hunter: Boolean(user.badges.hunter),
      early: Boolean(user.badges.early),
      custom: paywallify(user.badges.custom, user.patronTier || 0),
    },
    patronTier: bypassVisibility ? user.patronTier : void 0,
    accounts: bypassVisibility
      ? { spotify: user.accounts.spotify ? user.accounts.spotify.name : void 0 }
      : void 0,
  }
}
