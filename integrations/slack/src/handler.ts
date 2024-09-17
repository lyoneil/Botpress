import type { SlackEvent } from '@slack/types'
import { executeMessageReceived } from './events/message-received'
import { executeReactionAdded } from './events/reaction-added'
import {
  isInteractiveRequest,
  onOAuth,
  parseInteractiveBody,
  respondInteractive,
  getUserAndConversation,
  getConfig,
  validateRequestSignature,
  getOAuthAccessToken,
} from './misc/utils'
import * as bp from '.botpress'
import { executeTeamJoin } from './events/team-join'

export const handler: bp.IntegrationProps['handler'] = async ({ req, ctx, client, logger }) => {
  logger.forBot().debug('Handler received request from Slack with payload:', req.body)
  if (req.path.startsWith('/oauth')) {
    return onOAuth(req, client, ctx).catch((err) => {
      logger.forBot().error('Error while processing OAuth', err.response?.data || err.message)
      throw err
    })
  }

  const isOAuthConfigured = !!(await getOAuthAccessToken(client, ctx))

  if (isOAuthConfigured) {
    const isSignatureValid = validateRequestSignature({ req, logger })

    if (!isSignatureValid) {
      logger.forBot().error('Handler received a request with an invalid signature')
      return
    }
  } else {
    logger.forBot().debug('OAuth is not configured, skipping signature validation')
  }

  if (!req.body) {
    logger.forBot().warn('Handler received an empty body, so the message was ignored')
    return
  }

  const { botUserId } = await getConfig(client, ctx)

  if (isInteractiveRequest(req)) {
    const body = parseInteractiveBody(req)

    const actionValue = await respondInteractive(body)

    if (body.type !== 'block_actions') {
      const errMessage = `Interaction type ${body.type} received from Slack is not supported yet`
      logger.forBot().error(errMessage)
      return
    }

    if (typeof actionValue !== 'string' || !actionValue?.length) {
      logger.forBot().debug('No action value was returned, so the message was ignored')
      return
    }

    const { userId, conversationId } = await getUserAndConversation(
      { slackUserId: body.user.id, slackChannelId: body.channel.id },
      client
    )

    await client.getOrCreateMessage({
      tags: {
        ts: body.message.ts,
        userId: body.user.id,
        channelId: body.channel.id,
      },
      type: 'text',
      payload: { text: actionValue },
      userId,
      conversationId,
    })

    return
  }

  const data = JSON.parse(req.body)

  if (data.type === 'url_verification') {
    logger.forBot().debug('Handler received request of type url_verification')
    return {
      body: JSON.stringify({ challenge: data.challenge }),
    }
  }

  const event: SlackEvent = data.event
  logger.forBot().debug(`Handler received request of type ${data.event.type}`)

  if ('user' in event && event.user === botUserId) {
    return
  }

  switch (event.type) {
    case 'message':
      return executeMessageReceived({ slackEvent: event, client, ctx, logger })

    case 'reaction_added':
      return executeReactionAdded({ slackEvent: event, client })

    case 'team_join':
      return executeTeamJoin({ slackEvent: event, client })

    default:
      return
  }
}
