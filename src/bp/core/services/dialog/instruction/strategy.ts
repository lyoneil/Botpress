import { IO, Logger } from 'botpress/sdk'
import { extractEventCommonArgs, parseActionInstruction } from 'common/action'
import { ActionServer } from 'common/typings'
import ActionServersService from 'core/services/action/action-servers-service'
import ActionService from 'core/services/action/action-service'
import { CMSService } from 'core/services/cms'
import { EventEngine } from 'core/services/middleware/event-engine'
import { inject, injectable, tagged } from 'inversify'
import _ from 'lodash'
import { NodeVM } from 'vm2'

import { renderTemplate } from '../../../misc/templating'
import { TYPES } from '../../../types'
import { VmRunner } from '../../action/vm'

import { Instruction, ProcessingResult } from '.'

const debug = DEBUG('dialog')

export interface InstructionStrategy {
  processInstruction(botId: string, instruction: Instruction, event): Promise<ProcessingResult>
}

@injectable()
export class ActionStrategy implements InstructionStrategy {
  constructor(
    @inject(TYPES.Logger)
    @tagged('name', 'Actions')
    private logger: Logger,
    @inject(TYPES.ActionService) private actionService: ActionService,
    @inject(TYPES.EventEngine) private eventEngine: EventEngine,
    @inject(TYPES.CMSService) private cms: CMSService,
    @inject(TYPES.ActionServersService) private actionServersService: ActionServersService
  ) {}

  public static isSayInstruction(instructionFn: string): boolean {
    return instructionFn.indexOf('say ') === 0
  }

  async processInstruction(botId, instruction, event): Promise<ProcessingResult> {
    if (ActionStrategy.isSayInstruction(instruction.fn)) {
      return this.invokeOutputProcessor(botId, instruction, event)
    } else {
      return this.invokeAction(botId, instruction, event)
    }
  }

  public async invokeSendMessage(args: any, contentType: string, event: IO.IncomingEvent) {
    const eventDestination = _.pick(event, ['channel', 'target', 'botId', 'threadId'])
    const commonArgs = extractEventCommonArgs(event, args)
    const renderedElements = await this.cms.renderElement(contentType, commonArgs, eventDestination)

    await this.eventEngine.replyToEvent(eventDestination, renderedElements, event.id)
  }

  private async invokeOutputProcessor(botId, instruction, event: IO.IncomingEvent): Promise<ProcessingResult> {
    const chunks = instruction.fn.split(' ')
    const params = _.slice(chunks, 2).join(' ')

    if (chunks.length < 2) {
      throw new Error('Invalid text instruction. Expected an instruction along "say #text Something"')
    }

    const outputType: string = chunks[1]
    let args: object = {}

    if (outputType.startsWith('@')) {
      args = instruction.args
    } else {
      if (params.length > 0) {
        try {
          args = JSON.parse(params)
        } catch (err) {
          throw new Error(`Say "${outputType}" has invalid arguments (not a valid JSON string): ${params}`)
        }
      }
    }

    debug.forBot(botId, `[${event.target}] render element "${outputType}"`)

    const message: IO.DialogTurnHistory = {
      eventId: event.id,
      incomingPreview: event.preview,
      replyConfidence: 1.0,
      replySource: 'dialogManager',
      replyDate: new Date(),
      replyPreview: outputType
    }

    if (!event.state.session.lastMessages) {
      event.state.session.lastMessages = [message]
    } else {
      event.state.session.lastMessages.push(message)
    }

    await this.invokeSendMessage(args, outputType, event)

    return ProcessingResult.none()
  }

  private async invokeAction(botId, instruction, event: IO.IncomingEvent): Promise<ProcessingResult> {
    const { actionName, argsStr, actionServerId } = parseActionInstruction(instruction.fn)

    let args: { [key: string]: any } = {}
    try {
      if (argsStr && argsStr.length) {
        args = JSON.parse(argsStr)
      }
    } catch (err) {
      throw new Error(`Action "${actionName}" has invalid arguments (not a valid JSON string): ${argsStr}`)
    }

    const actionArgs = extractEventCommonArgs(event)

    args = _.mapValues(args, value => renderTemplate(value, actionArgs))

    let actionServer: ActionServer | undefined
    if (actionServerId) {
      actionServer = await this.actionServersService.getServer(actionServerId)
      if (!actionServer) {
        this.logger.warn(`Could not find Action Server with ID: ${actionServerId}`)
        return ProcessingResult.none()
      }
    }

    debug.forBot(botId, `[${event.target}] execute action "${actionName}"`)

    const service = await this.actionService.forBot(botId)

    try {
      if (!actionServerId) {
        const hasAction = await service.hasAction(actionName)
        if (!hasAction) {
          throw new Error(`Action "${actionName}" not found, `)
        }
      }

      await service.runAction({ actionName, incomingEvent: event, actionArgs: args, actionServer })
    } catch (err) {
      const { onErrorFlowTo } = event.state.temp
      const errorFlow = typeof onErrorFlowTo === 'string' && onErrorFlowTo.length ? onErrorFlowTo : 'error.flow.json'

      return ProcessingResult.transition(errorFlow)
    }

    return ProcessingResult.none()
  }
}

@injectable()
export class TransitionStrategy implements InstructionStrategy {
  // Characters considered unsafe which will cause the transition to run in the sandbox
  private unsafeRegex = new RegExp(/[\(\)\`]/)

  async processInstruction(botId, instruction, event): Promise<ProcessingResult> {
    const conditionSuccessful = await this.runCode(instruction, extractEventCommonArgs(event))

    if (conditionSuccessful) {
      debug.forBot(
        botId,
        `[${event.target}] eval transition "${instruction.fn === 'true' ? 'always' : instruction.fn}" to [${
          instruction.node
        }]`
      )
      return ProcessingResult.transition(instruction.node)
    } else {
      return ProcessingResult.none()
    }
  }

  private async runCode(instruction: Instruction, sandbox): Promise<any> {
    if (instruction.fn === 'true') {
      return true
    } else if (instruction.fn?.startsWith('lastNode')) {
      // TODO: Fix this so that it's cleaner and more generic
      const stack = sandbox.event.state.__stacktrace
      if (!stack.length) {
        return false
      }

      const lastEntry = stack.length === 1 ? stack[0] : stack[stack.length - 2] // -2 because we want the previous node (not the current one)

      return instruction.fn === `lastNode=${lastEntry.node}`
    }

    if (instruction.fn?.includes('thisNode')) {
      // TODO: Fix this so that it's cleaner and more generic
      const { currentFlow, currentNode } = sandbox.event.state.context
      instruction.fn = instruction.fn.replace(
        /thisNode/g,
        `(event.state.temp['${currentFlow.replace('.flow.json', '')}/${currentNode}'] || {})`
      )
    }

    const variables = instruction.fn?.match(/\$[a-zA-Z][a-zA-Z0-9_-]*/g) ?? []
    for (const match of variables) {
      const name = match.replace('$', '')
      instruction.fn = instruction.fn!.replace(match, `event.state.workflow.variables.${name}`)
    }

    const code = `
    try {
      return ${instruction.fn};
    } catch (err) {
      if (err instanceof TypeError) {
        console.log(err)
        return false
      }
      throw err
    }`

    if (process.DISABLE_TRANSITION_SANDBOX || !this.unsafeRegex.test(instruction.fn!)) {
      const fn = new Function(...Object.keys(sandbox), code)
      return fn(...Object.values(sandbox))
    }

    const vm = new NodeVM({
      wrapper: 'none',
      sandbox: sandbox,
      timeout: 5000
    })
    const runner = new VmRunner()
    return await runner.runInVm(vm, code)
  }
}
