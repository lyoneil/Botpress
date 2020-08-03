import 'bluebird-global'
import { EventDirection, IO } from 'botpress/sdk'
import { createSpyObject, MockObject } from 'core/misc/utils'
import 'jest-extended'
import 'reflect-metadata'

import { MiddlewareChain } from './middleware'

const base = { description: 'test', order: 1, direction: <EventDirection>'incoming' }
describe('Middleware', () => {
  let middleware: MiddlewareChain
  let event: MockObject<IO.Event>

  beforeEach(() => {
    middleware = new MiddlewareChain({ timeoutInMs: 5 })
    event = createSpyObject<IO.Event>()
  })

  it('should call middleware in order', async () => {
    const mock1 = jest.fn()
    const mock2 = jest.fn()

    const fn1 = (event, next) => {
      mock1(event)
      next()
    }

    const fn2 = (event, next) => {
      mock2(event)
      next()
    }

    middleware.use({ handler: fn1, name: 'fn1', ...base })
    middleware.use({ handler: fn2, name: 'fn2', ...base })

    await middleware.run(event.T)

    expect(mock1).toHaveBeenCalledBefore(mock2)
  })

  it('if middleware swallows the event, second is not called', async () => {
    const mock1 = jest.fn()
    const mock2 = jest.fn()

    const fn1 = (event, next) => {
      mock1(event)
      next(undefined, true) // We swallow the event
    }

    middleware.use({ handler: fn1, name: 'fn1', ...base })
    middleware.use({ handler: mock2, name: 'mock2', ...base })

    await middleware.run(event.T)

    expect(mock1).toHaveBeenCalled()
    expect(mock2).not.toHaveBeenCalled()
  })

  it('if middleware mark event as skipped, it should mark it on the event collector', async () => {
    const mock1 = jest.fn()
    const mock2 = jest.fn()

    const fn1 = (event, next) => {
      mock1(event)
      next(undefined, false, true) // Mark the first mw as skipped
    }

    middleware.use({ handler: fn1, name: 'fn1', ...base })
    middleware.use({ handler: mock2, name: 'mock2', ...base })

    await middleware.run(event.T)

    expect(mock1).toHaveBeenCalled()
    expect(mock2).toHaveBeenCalled()
    expect(event.addStep).toHaveBeenNthCalledWith(1, 'mw:fn1:skipped')
    expect(event.addStep).toHaveBeenNthCalledWith(2, 'mw:mock2:timedOut')
  })

  it('should pass event to middleware', async () => {
    const mock = jest.fn()

    middleware.use({
      handler: (event, cb) => {
        mock(event)
        cb(undefined, true)
      },
      name: 'event',
      ...base
    })

    await middleware.run(event.T)
    expect(mock).toHaveBeenCalled()
  })

  it('if mw throws, the chain throws the error', async () => {
    const err = new Error('lol')

    middleware.use({
      handler: event => {
        throw err
      },
      name: 'throw',
      ...base
    })

    // tslint:disable-next-line: no-floating-promises
    expect(middleware.run({} as IO.Event)).rejects.toEqual(err)
  })
})
