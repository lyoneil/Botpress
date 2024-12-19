import { BaseLogger } from '../base-logger'

type BotLogOptions = {
  userId?: string
  conversationId?: string
  workflowId?: string
}

export class BotLogger extends BaseLogger<BotLogOptions> {
  public constructor(options?: BotLogOptions) {
    super({
      ...options,
    })
  }

  public override with(options: BotLogOptions) {
    return new BotLogger({ ...this.defaultOptions, ...options })
  }

  public withUserId(userId: string) {
    return this.with({
      userId,
    })
  }

  public withConversationID(conversationId: string) {
    return this.with({
      conversationId,
    })
  }

  public withWorkflowID(workflowId: string) {
    return this.with({
      workflowId,
    })
  }
}
