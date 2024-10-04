import { wrapActionAndInjectSlackClient } from 'src/actions/action-wrapper'

export const addReaction = wrapActionAndInjectSlackClient('addReaction', {
  async action({ client, logger, slackClient }, { messageId, name }) {
    if (messageId) {
      const { message } = await client.getMessage({ id: messageId })
      const { conversation } = await client.getConversation({ id: message.conversationId })

      const addReactionArgs = {
        name,
        channel: conversation.tags.id,
        timestamp: message.tags.ts,
      }

      logger.forBot().debug('Sending reaction to Slack:', addReactionArgs)
      await slackClient.reactions.add(addReactionArgs)
    }

    return {}
  },
  errorMessage: 'Failed to add reaction',
})
