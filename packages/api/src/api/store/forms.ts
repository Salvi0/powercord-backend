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

import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { EligibilityStatus } from '@powercord/types/store'
import type { User } from '../../types.js'

async function getEligibility (this: FastifyInstance, request: FastifyRequest<{ TokenizeUser: User }>): Promise<EligibilityStatus> {
  // todo: ability to disable forms in backoffice

  if (request.user) {
    const banStatus = await this.mongo.db!.collection('banned').findOne({ _id: request.user!._id })
    return {
      publish: banStatus?.publish ? 2 : 0,
      verification: banStatus?.verification ? 2 : 0,
      hosting: banStatus?.hosting ? 2 : 0,
      reporting: banStatus?.reporting ? 2 : 0,
    }
  }

  return {
    publish: 0,
    verification: 0,
    hosting: 0,
    reporting: 1,
  }
}

export default async function (fastify: FastifyInstance): Promise<void> {
  const optionalAuth = fastify.auth([ fastify.verifyTokenizeToken, (_, __, next) => next() ])

  fastify.get<{ TokenizeUser: User }>('/eligibility', { preHandler: optionalAuth }, getEligibility)
}
