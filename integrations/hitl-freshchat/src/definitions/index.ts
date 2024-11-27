import { IntegrationDefinitionProps } from '@botpress/sdk'
import { FreshchatConfigurationSchema } from './schemas'

export { channels } from './channels'

export const events = {} satisfies IntegrationDefinitionProps['events']

export const configuration = {
  schema: FreshchatConfigurationSchema,
} satisfies IntegrationDefinitionProps['configuration']

export const states = {
} satisfies IntegrationDefinitionProps['states']

export const user = {
  tags: {
    id: { description: 'Freshchat User Id', title: 'Freshchat User Id' },
  }
} satisfies IntegrationDefinitionProps['user']
