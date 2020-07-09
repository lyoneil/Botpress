import * as sdk from 'botpress/sdk'
import LRUCache from 'lru-cache'
import { Twilio, validateRequest } from 'twilio'

import { Config } from '../config'

import { Clients, MessageOption, TwilioRequestBody } from './typings'

const MIDDLEWARE_NAME = 'twilio.sendMessage'

export class TwilioClient {
  private logger: sdk.Logger
  private twilio: Twilio
  private webhookUrl: string
  private kvs: sdk.KvsService

  constructor(
    private bp: typeof sdk,
    private botId: string,
    private config: Config,
    private router: sdk.http.RouterExtension,
    private route: string
  ) {
    this.logger = bp.logger.forBot(botId)
  }

  async initialize() {
    if (!this.config.accountSID || !this.config.authToken) {
      return this.logger.error(`[${this.botId}] The accountSID and authToken must be configured to use this channel.`)
    }

    const url = (await this.router.getPublicPath()) + this.route
    this.webhookUrl = url.replace('BOT_ID', this.botId)

    this.twilio = new Twilio(this.config.accountSID, this.config.authToken)
    this.kvs = this.bp.kvs.forBot(this.botId)

    this.logger.info(`Twilio webhook listening at ${this.webhookUrl}`)
  }

  auth(req): boolean {
    const signature = req.headers['x-twilio-signature']
    return validateRequest(this.config.authToken, signature, this.webhookUrl, req.body)
  }

  async handleWebhookRequest(body: TwilioRequestBody) {
    const to = body.To
    const from = body.From
    const text = body.Body

    const index = Number(text)
    if (index && (await this.handleIndexReponse(index - 1, from, to))) {
      return
    }

    await this.kvs.delete(from)

    await this.bp.events.sendEvent(
      this.bp.IO.Event({
        botId: this.botId,
        channel: 'twilio',
        direction: 'incoming',
        type: 'text',
        payload: {
          type: 'text',
          text: text
        },
        threadId: to,
        target: from
      })
    )
  }

  async handleIndexReponse(index: number, from: string, to: string): Promise<boolean> {
    if (!(await this.kvs.exists(from))) {
      return
    }

    const options = await this.kvs.get(from)
    const option = options[index]
    if (!option) {
      return
    }

    if (option.type === 'url') {
      return true
    }

    await this.kvs.delete(from)

    await this.bp.events.sendEvent(
      this.bp.IO.Event({
        botId: this.botId,
        channel: 'twilio',
        direction: 'incoming',
        type: option.type,
        payload: {
          type: option.type,
          text: option.type === 'say_something' ? option.value : option.label,
          payload: option.value
        },
        threadId: to,
        target: from
      })
    )

    return true
  }

  async handleOutgoingEvent(event: sdk.IO.Event, next: sdk.IO.MiddlewareNextCallback) {
    if (event.type === 'text') {
      await this.sendText(event)
    } else if (event.type === 'file') {
      await this.sendImage(event)
    } else if (event.type === 'carousel') {
      await this.sendCarousel(event)
    } else if (event.payload.quick_replies) {
      await this.sendChoices(event)
    } else if (event.payload.options) {
      await this.sendDropdown(event)
    }

    next(undefined, false)
  }

  async sendText(event: sdk.IO.Event) {
    await this.sendMessage(event, {
      body: event.payload.text
    })
  }

  async sendImage(event: sdk.IO.Event) {
    await this.sendMessage(event, {
      body: event.payload.title,
      mediaUrl: [event.payload.url]
    })
  }

  async sendCarousel(event: sdk.IO.Event) {
    for (const { subtitle, title, picture, buttons } of event.payload.elements) {
      let body = `${title}\n\n`
      if (subtitle) {
        body += `${subtitle}`
      }

      const options: MessageOption[] = []
      for (const button of buttons) {
        if (button.type === 'open_url') {
          options.push({
            label: `${button.title} : ${button.url}`,
            value: undefined,
            type: 'url'
          })
        } else if (button.type === 'postback') {
          options.push({
            label: button.title,
            value: button.payload,
            type: 'postback'
          })
        } else if (button.type === 'say_something') {
          options.push({
            label: button.title,
            value: button.text,
            type: 'say_something'
          })
        }
      }

      const args = { mediaUrl: picture ? [picture] : undefined }
      await this.sendOptions(event, body, args, options)
    }
  }

  async sendChoices(event: sdk.IO.Event) {
    const options: MessageOption[] = event.payload.quick_replies.map(x => ({
      label: x.title,
      value: x.payload,
      type: 'quick_reply'
    }))
    await this.sendOptions(event, event.payload.text, {}, options)
  }

  async sendDropdown(event: sdk.IO.Event) {
    const options: MessageOption[] = event.payload.options.map(x => ({
      label: x.label,
      value: x.value,
      type: 'quick_reply'
    }))
    await this.sendOptions(event, event.payload.message, {}, options)
  }

  async sendOptions(event: sdk.IO.Event, text: string, args: any, options: MessageOption[]) {
    let body = `${text}\n`
    for (let i = 0; i < options.length; i++) {
      const option = options[i]
      body += `\n${i + 1}. ${option.label}`
    }

    await this.kvs.set(event.target, options)

    await this.sendMessage(event, { ...args, body })
  }

  async sendMessage(event: sdk.IO.Event, args: any) {
    await this.twilio.messages.create({
      ...args,
      provideFeedback: false,
      from: event.threadId,
      to: event.target
    })
  }
}

export async function setupMiddleware(bp: typeof sdk, clients: Clients) {
  bp.events.registerMiddleware({
    description:
      'Sends out messages that targets platform = Twilio.' +
      ' This middleware should be placed at the end as it swallows events once sent.',
    direction: 'outgoing',
    handler: outgoingHandler,
    name: MIDDLEWARE_NAME,
    order: 100
  })

  async function outgoingHandler(event: sdk.IO.Event, next: sdk.IO.MiddlewareNextCallback) {
    if (event.channel !== 'twilio') {
      return next()
    }

    const client: TwilioClient = clients[event.botId]
    if (!client) {
      return next()
    }

    return client.handleOutgoingEvent(event, next)
  }
}

export async function setupRouter(bp: typeof sdk, clients: Clients, route: string): Promise<sdk.http.RouterExtension> {
  const router = bp.http.createRouterForBot('channel-twilio', {
    checkAuthentication: false
  })

  router.post(route, async (req, res) => {
    const { botId } = req.params
    const client = clients[botId]

    if (!client) {
      res.status(404).send('Bot not a twilio bot')
    }

    if (client.auth(req)) {
      await client.handleWebhookRequest(req.body)
      res.sendStatus(200)
    } else {
      res.status(401).send('Auth token invalid')
    }
  })

  return router
}

export async function removeMiddleware(bp: typeof sdk) {
  bp.events.removeMiddleware(MIDDLEWARE_NAME)
}
