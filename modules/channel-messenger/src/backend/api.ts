import axios from 'axios'
import * as sdk from 'botpress/sdk'
import _ from 'lodash'

export default async (bp: typeof sdk) => {
  const messengerRouter = bp.http.createRouterForBot('channel-messenger', { checkAuthentication: false })
  const http = axios.create({ baseURL: 'https://graph.facebook.com/v2.6/me' })
  const moduleConfigCache: { [key: string]: Object } = {}

  // Messenger will use this endpoint to send webhooks events
  messengerRouter.post('/webhook', async (req, res) => {
    const body = req.body
    const botId = req.params.botId
    const config = await getModuleConfig(bp, botId)
    const verifyToken = getTokenFromConfig(config)

    if (body.object === 'page') {
      for (const entry of body.entry) {
        // will only ever contain one message, so we get index 0
        const webhookEvent = entry.messaging[0]
        console.log(webhookEvent)

        const senderPSID = webhookEvent.sender.id
        console.log('PSID: ' + senderPSID)

        if (webhookEvent.message) {
          await handleMessage(senderPSID, webhookEvent.message, verifyToken)
        } else if (webhookEvent.postback) {
          // handlePostback(senderPSID, webhookEvent.postback)
        }
      }

      // Returns a '200 OK' response to all requests
      res.status(200).send('EVENT_RECEIVED')
    } else {
      // Returns a '404 Not Found' if event is not from a page subscription
      res.sendStatus(404)
    }
  })

  // Messenger will use this endpoint to verify the webhook authenticity
  messengerRouter.get('/webhook', async (req, res) => {
    const botId = req.params.botId
    const config = await getModuleConfig(bp, botId)
    const verifyToken = getTokenFromConfig(config)

    // Parse the query params
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
      // Checks the mode and token sent is correct
      if (mode === 'subscribe' && token === verifyToken) {
        console.log('WEBHOOK_VERIFIED')
        res.status(200).send(challenge)
      } else {
        res.sendStatus(403)
      }
    }
  })

  const handleMessage = async (psid, message, token) => {
    let response

    if (message.text) {
      response = {
        text: `You sent the message: "${message.text}". Now send me an image!`
      }
    }

    await sendResponse(psid, response, token)
  }

  const sendResponse = async (psid, response, token) => {
    const body = {
      recipient: {
        id: psid
      },
      message: response
    }
    console.log('TOKEN', token)

    await http.post(`/messages`, body, { params: { access_token: token } })
  }

  const getModuleConfig = async (bp, botId): Promise<any> => {
    if (moduleConfigCache[botId]) {
      console.log('CACHED')
      return moduleConfigCache[botId]
    }
    const config = await bp.config.getModuleConfigForBot('channel-messenger', botId)
    moduleConfigCache[botId] = config

    return config
  }

  const getTokenFromConfig = config => {
    if (!config.verifyToken) {
      throw new Error(`Please ensure the token is set in 'data/bots/<your_bot>/config/channel-messenger.json'.`)
    }
    return config.verifyToken
  }
}
