import * as sdk from '@botpress/sdk'
import { type CreateIntegrationBody } from '../api/integration-body'
import { INTEGRATION_RULESET } from './rulesets/integration.ruleset'
import { BaseLinter } from './base-linter'

// The CreateIntegrationBody type does not contain the descriptions for the secrets
export type AggregateIntegrationBody = Omit<CreateIntegrationBody, 'secrets'> &
  Pick<sdk.IntegrationDefinitionProps, 'secrets'>

export class IntegrationLinter extends BaseLinter<AggregateIntegrationBody> {
  public constructor(definition: AggregateIntegrationBody) {
    super(definition, INTEGRATION_RULESET)
  }
}
