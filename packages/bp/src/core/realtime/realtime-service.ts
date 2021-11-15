import { createAdapter, RedisAdapter } from '@socket.io/redis-adapter'
import { Logger } from 'botpress/sdk'
import cookie from 'cookie'
import { TYPES } from 'core/app/types'
import { BotpressConfig, ConfigProvider } from 'core/config'
import { MonitoringService } from 'core/health'
import { PersistedConsoleLogger } from 'core/logger'
import { AuthService } from 'core/security'
import { EventEmitter2 } from 'eventemitter2'
import { Server } from 'http'
import { inject, injectable, tagged } from 'inversify'
import _ from 'lodash'
import Socket from 'socket.io'
import { ExtendedError } from 'socket.io/dist/namespace'
import { RealTimePayload } from './payload-sdk-impl'
import socketioJwt from './socket.io-jwt'

const debug = DEBUG('realtime')

type Transports = ('websocket' | 'polling')[]
const ALLOWED_TRANSPORTS: Transports = ['websocket', 'polling']

export const getSocketTransports = (config: BotpressConfig): Transports => {
  // Just to be sure there is at least one valid transport configured
  const transports = _.filter(config.httpServer.socketTransports, (t: any) =>
    ALLOWED_TRANSPORTS.includes(t)
  ) as Transports

  return transports?.length ? transports : ALLOWED_TRANSPORTS
}

@injectable()
export class RealtimeService {
  private readonly ee: EventEmitter2
  private useRedis: boolean
  private guest?: Socket.Namespace

  constructor(
    @inject(TYPES.Logger)
    @tagged('name', 'Realtime')
    private logger: Logger,
    @inject(TYPES.MonitoringService) private monitoringService: MonitoringService,
    @inject(TYPES.ConfigProvider) private configProvider: ConfigProvider,
    @inject(TYPES.AuthService) private authService: AuthService
  ) {
    this.ee = new EventEmitter2({
      wildcard: true,
      maxListeners: 100
    })

    this.useRedis = process.CLUSTER_ENABLED && Boolean(process.env.REDIS_URL) && process.IS_PRO_ENABLED

    PersistedConsoleLogger.LogStreamEmitter.onAny((type, level, message, args) => {
      this.sendToSocket(RealTimePayload.forAdmins(type as string, { level, message, args }))
    })
  }

  private isEventTargeted(eventName: string | string[]): boolean {
    if (_.isArray(eventName)) {
      eventName = eventName[0]
    }

    return (eventName as string).startsWith('guest.')
  }

  private makeVisitorRoomId(visitorId: string): string {
    return `visitor:${visitorId}`
  }

  private unmakeVisitorId(roomId: string): string {
    return roomId.split(':')[1]
  }

  sendToSocket(payload: RealTimePayload) {
    debug('Send %o', payload)
    this.ee.emit(payload.eventName, payload.payload, 'server')
  }

  async getVisitorIdFromSocketId(socketId: string): Promise<undefined | string> {
    let rooms: Set<string> | undefined
    try {
      if (this.useRedis) {
        const adapter = (this.guest?.adapter as unknown) as RedisAdapter
        rooms = adapter.socketRooms(socketId)

        // If the rooms weren't found locally, try to ask all other nodes
        if (!rooms) {
          rooms = await this.findRemoteSocketRooms(adapter, socketId)
        }
      } else {
        rooms = this.guest?.adapter.sids.get(socketId)
      }
    } catch (err) {
      return
    }

    if (!rooms?.size) {
      return
    }

    // rooms here contains one being socketId and all rooms in which user is connected
    // in the "guest" case it's a single room being the webchat and corresponds to the visitor id
    // resulting to something like ["/guest:lijasdioajwero", "visitor:kas9d2109das0"]
    rooms = new Set(rooms)
    rooms.delete(socketId)
    const [roomId] = rooms

    return roomId ? this.unmakeVisitorId(roomId) : undefined
  }

  private async findRemoteSocketRooms(adapter: RedisAdapter, socketId: string): Promise<Set<string>> {
    const rooms = new Set<string>()
    const allRooms = await adapter.allRooms()

    let found = false
    // Values look like so [socketId, roomId, socketId, roomId, ...]
    for (const room of allRooms.values()) {
      if (found) {
        rooms.add(room)
        break
      }

      if (room === socketId) {
        rooms.add(room)
        found = true
      }
    }

    return rooms
  }

  async installOnHttpServer(server: Server) {
    const transports = getSocketTransports(await this.configProvider.getBotpressConfig())

    const io = new Socket.Server(server, {
      path: `${process.ROOT_PATH}/socket.io`,
      cors: { origin: '*' },
      serveClient: false,
      transports,
      allowEIO3: true // TODO: Remove this once clients are all migrated to SocketIO Engine v4
    })

    if (this.useRedis) {
      const redisFactory = this.monitoringService.getRedisFactory()

      if (redisFactory) {
        io.adapter(createAdapter(redisFactory('commands'), redisFactory('socket')))
      }
    }

    const admin = io.of('/admin')
    this.setupAdminSocket(admin)

    const guest = io.of('/guest')
    this.setupGuestSocket(guest)

    this.ee.onAny((event, payload, from) => {
      if (from === 'client') {
        return // This is coming from the client, we don't send this event back to them
      }

      const connection = this.isEventTargeted(event) ? guest : admin

      if (payload && (payload.__socketId || payload.__room)) {
        // Send only to this socketId or room
        return connection.to(payload.__socketId || payload.__room).emit('event', {
          name: event,
          data: payload
        })
      }

      // broadcast event to the front-end clients
      connection.emit('event', { name: event, data: payload })
    })
  }

  checkCookieToken = async (socket: Socket.Socket, next: (err?: ExtendedError | undefined) => void) => {
    try {
      const handshake = socket.handshake
      const csrfToken = handshake.auth.token as string
      let jwtToken = ''

      if (handshake.headers.cookie) {
        jwtToken = cookie.parse(handshake.headers.cookie).jwtToken
      }

      if (jwtToken && csrfToken) {
        await this.authService.checkToken(jwtToken, csrfToken)
        next()
      }

      next(new Error('Mandatory parameters are missing'))
    } catch (err) {
      next(err as Error)
    }
  }

  setupAdminSocket(admin: Socket.Namespace): void {
    if (process.USE_JWT_COOKIES) {
      admin.use(this.checkCookieToken)
    } else {
      admin.use(socketioJwt.authorize({ secret: process.APP_SECRET, handshake: true }))
    }

    admin.on('connection', (socket: Socket.Socket) => {
      const visitorId = socket.handshake.query.visitorId as string

      socket.on('event', event => {
        if (!event?.name) {
          return
        }

        try {
          this.ee.emit(event.name, event.data, 'client', {
            visitorId,
            socketId: socket.id,
            guest: false,
            admin: true
          })
        } catch (err) {
          this.logger.attachError(err).error('Error processing incoming admin event')
        }
      })
    })
  }

  setupGuestSocket(guest: Socket.Namespace): void {
    this.guest = guest

    guest.on('connection', async (socket: Socket.Socket) => {
      const visitorId = socket.handshake.query.visitorId as string

      if (visitorId?.length > 0) {
        const roomId = this.makeVisitorRoomId(visitorId)

        if (this.useRedis) {
          const adapter = (guest.adapter as unknown) as RedisAdapter

          try {
            await adapter.remoteJoin(socket.id, roomId)
          } catch (err) {
            return this.logger
              .attachError(err)
              .error(`socket "${socket.id}" for visitor "${visitorId}" can't join the socket.io redis room`)
          }
        } else {
          await socket.join(roomId)
        }
      }

      socket.on('event', event => {
        if (!event?.name) {
          return
        }

        try {
          this.ee.emit(event.name, event.data, 'client', {
            socketId: socket.id,
            visitorId,
            guest: true,
            admin: false
          })
        } catch (err) {
          this.logger.attachError(err).error('Error processing incoming guest event')
        }
      })
    })
  }
}
