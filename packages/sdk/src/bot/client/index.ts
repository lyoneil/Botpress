import { Client } from '@botpress/client'
import { BaseBot } from '../types'
import * as types from './types'

export * from './types'

type BeforeHooks<TBot extends BaseBot> = {
  [K in keyof types.ClientOperations<TBot>]: (
    input: types.ClientInputs<TBot>[K]
  ) => Promise<types.ClientInputs<TBot>[K]>
}

type AfterHooks<TBot extends BaseBot> = {
  [K in keyof types.ClientOperations<TBot>]: (
    output: types.ClientOutputs<TBot>[K]
  ) => Promise<types.ClientOutputs<TBot>[K]>
}

type ClientHooks<TBot extends BaseBot> = {
  before: {
    [K in keyof types.ClientOperations<TBot>]?: BeforeHooks<TBot>[K][]
  }
  after: {
    [K in keyof types.ClientOperations<TBot>]?: AfterHooks<TBot>[K][]
  }
}

/**
 * Just like the regular botpress client, but typed with the bot's properties.
 */
export class BotSpecificClient<TBot extends BaseBot> implements types.ClientOperations<TBot> {
  private _hooks: ClientHooks<TBot> = { before: {}, after: {} }

  public constructor(private readonly _client: Client) {}

  public before = <O extends keyof types.ClientOperations<TBot>>(operation: O, hook: BeforeHooks<TBot>[O]) => {
    if (!this._hooks.before[operation]) {
      this._hooks.before[operation] = []
    }
    this._hooks.before[operation]?.push(hook)
  }

  public after = <O extends keyof types.ClientOperations<TBot>>(operation: O, hook: AfterHooks<TBot>[O]) => {
    if (!this._hooks.after[operation]) {
      this._hooks.after[operation] = []
    }
    this._hooks.after[operation]?.push(hook)
  }

  public getConversation: types.ClientOperations<TBot>['getConversation'] = ((x) =>
    this._runBefore('getConversation', x)
      .then((x) => this._client.getConversation(x))
      .then((x) =>
        this._runAfter('getConversation', x as types.ClientOutputs<TBot>['getConversation'])
      )) as types.ClientOperations<TBot>['getConversation']
  public listConversations: types.ClientOperations<TBot>['listConversations'] = ((x) =>
    this._runBefore('listConversations', x)
      .then((x) => this._client.listConversations(x))
      .then((x) =>
        this._runAfter('listConversations', x as types.ClientOutputs<TBot>['listConversations'])
      )) as types.ClientOperations<TBot>['listConversations']
  public updateConversation: types.ClientOperations<TBot>['updateConversation'] = ((x) =>
    this._runBefore('updateConversation', x)
      .then((x) => this._client.updateConversation(x))
      .then((x) =>
        this._runAfter('updateConversation', x as types.ClientOutputs<TBot>['updateConversation'])
      )) as types.ClientOperations<TBot>['updateConversation']
  public deleteConversation: types.ClientOperations<TBot>['deleteConversation'] = ((x) =>
    this._runBefore('deleteConversation', x)
      .then((x) => this._client.deleteConversation(x))
      .then((x) =>
        this._runAfter('deleteConversation', x as types.ClientOutputs<TBot>['deleteConversation'])
      )) as types.ClientOperations<TBot>['deleteConversation']
  public listParticipants: types.ClientOperations<TBot>['listParticipants'] = ((x) =>
    this._runBefore('listParticipants', x)
      .then((x) => this._client.listParticipants(x))
      .then((x) =>
        this._runAfter('listParticipants', x as types.ClientOutputs<TBot>['listParticipants'])
      )) as types.ClientOperations<TBot>['listParticipants']
  public addParticipant: types.ClientOperations<TBot>['addParticipant'] = ((x) =>
    this._runBefore('addParticipant', x)
      .then((x) => this._client.addParticipant(x))
      .then((x) =>
        this._runAfter('addParticipant', x as types.ClientOutputs<TBot>['addParticipant'])
      )) as types.ClientOperations<TBot>['addParticipant']
  public getParticipant: types.ClientOperations<TBot>['getParticipant'] = ((x) =>
    this._runBefore('getParticipant', x)
      .then((x) => this._client.getParticipant(x))
      .then((x) =>
        this._runAfter('getParticipant', x as types.ClientOutputs<TBot>['getParticipant'])
      )) as types.ClientOperations<TBot>['getParticipant']
  public removeParticipant: types.ClientOperations<TBot>['removeParticipant'] = ((x) =>
    this._runBefore('removeParticipant', x)
      .then((x) => this._client.removeParticipant(x))
      .then((x) =>
        this._runAfter('removeParticipant', x as types.ClientOutputs<TBot>['removeParticipant'])
      )) as types.ClientOperations<TBot>['removeParticipant']
  public getEvent: types.ClientOperations<TBot>['getEvent'] = ((x) =>
    this._runBefore('getEvent', x)
      .then((x) => this._client.getEvent(x))
      .then((x) =>
        this._runAfter('getEvent', x as types.ClientOutputs<TBot>['getEvent'])
      )) as types.ClientOperations<TBot>['getEvent']
  public listEvents: types.ClientOperations<TBot>['listEvents'] = ((x) =>
    this._runBefore('listEvents', x)
      .then((x) => this._client.listEvents(x))
      .then((x) =>
        this._runAfter('listEvents', x as types.ClientOutputs<TBot>['listEvents'])
      )) as types.ClientOperations<TBot>['listEvents']
  public createMessage: types.ClientOperations<TBot>['createMessage'] = ((x) =>
    this._runBefore('createMessage', x)
      .then((x) => this._client.createMessage(x))
      .then((x) =>
        this._runAfter('createMessage', x as types.ClientOutputs<TBot>['createMessage'])
      )) as types.ClientOperations<TBot>['createMessage']
  public getOrCreateMessage: types.ClientOperations<TBot>['getOrCreateMessage'] = ((x) =>
    this._runBefore('getOrCreateMessage', x)
      .then((x) => this._client.getOrCreateMessage(x))
      .then((x) =>
        this._runAfter('getOrCreateMessage', x as types.ClientOutputs<TBot>['getOrCreateMessage'])
      )) as types.ClientOperations<TBot>['getOrCreateMessage']
  public getMessage: types.ClientOperations<TBot>['getMessage'] = ((x) =>
    this._runBefore('getMessage', x)
      .then((x) => this._client.getMessage(x))
      .then((x) =>
        this._runAfter('getMessage', x as types.ClientOutputs<TBot>['getMessage'])
      )) as types.ClientOperations<TBot>['getMessage']
  public updateMessage: types.ClientOperations<TBot>['updateMessage'] = ((x) =>
    this._runBefore('updateMessage', x)
      .then((x) => this._client.updateMessage(x))
      .then((x) =>
        this._runAfter('updateMessage', x as types.ClientOutputs<TBot>['updateMessage'])
      )) as types.ClientOperations<TBot>['updateMessage']
  public listMessages: types.ClientOperations<TBot>['listMessages'] = ((x) =>
    this._runBefore('listMessages', x)
      .then((x) => this._client.listMessages(x))
      .then((x) =>
        this._runAfter('listMessages', x as types.ClientOutputs<TBot>['listMessages'])
      )) as types.ClientOperations<TBot>['listMessages']
  public deleteMessage: types.ClientOperations<TBot>['deleteMessage'] = ((x) =>
    this._runBefore('deleteMessage', x)
      .then((x) => this._client.deleteMessage(x))
      .then((x) =>
        this._runAfter('deleteMessage', x as types.ClientOutputs<TBot>['deleteMessage'])
      )) as types.ClientOperations<TBot>['deleteMessage']
  public getUser: types.ClientOperations<TBot>['getUser'] = ((x) =>
    this._runBefore('getUser', x)
      .then((x) => this._client.getUser(x))
      .then((x) =>
        this._runAfter('getUser', x as types.ClientOutputs<TBot>['getUser'])
      )) as types.ClientOperations<TBot>['getUser']
  public listUsers: types.ClientOperations<TBot>['listUsers'] = ((x) =>
    this._runBefore('listUsers', x)
      .then((x) => this._client.listUsers(x))
      .then((x) =>
        this._runAfter('listUsers', x as types.ClientOutputs<TBot>['listUsers'])
      )) as types.ClientOperations<TBot>['listUsers']
  public updateUser: types.ClientOperations<TBot>['updateUser'] = ((x) =>
    this._runBefore('updateUser', x)
      .then((x) => this._client.updateUser(x))
      .then((x) =>
        this._runAfter('updateUser', x as types.ClientOutputs<TBot>['updateUser'])
      )) as types.ClientOperations<TBot>['updateUser']
  public deleteUser: types.ClientOperations<TBot>['deleteUser'] = ((x) =>
    this._runBefore('deleteUser', x)
      .then((x) => this._client.deleteUser(x))
      .then((x) =>
        this._runAfter('deleteUser', x as types.ClientOutputs<TBot>['deleteUser'])
      )) as types.ClientOperations<TBot>['deleteUser']
  public getState: types.ClientOperations<TBot>['getState'] = ((x) =>
    this._runBefore('getState', x)
      .then((x) => this._client.getState(x))
      .then((x) =>
        this._runAfter('getState', { ...x, state: { ...x.state, payload: x.state.payload as any } })
      )) as types.ClientOperations<TBot>['getState']
  public setState: types.ClientOperations<TBot>['setState'] = ((x) =>
    this._runBefore('setState', x)
      .then((x) => this._client.setState(x))
      .then((x) =>
        this._runAfter('setState', x as types.ClientOutputs<TBot>['setState'])
      )) as types.ClientOperations<TBot>['setState']
  public getOrSetState: types.ClientOperations<TBot>['getOrSetState'] = ((x) =>
    this._runBefore('getOrSetState', x)
      .then((x) => this._client.getOrSetState(x))
      .then((x) =>
        this._runAfter('getOrSetState', { ...x, state: { ...x.state, payload: x.state.payload as any } })
      )) as types.ClientOperations<TBot>['getOrSetState']
  public patchState: types.ClientOperations<TBot>['patchState'] = ((x) =>
    this._runBefore('patchState', x)
      .then((x) => this._client.patchState(x))
      .then((x) =>
        this._runAfter('patchState', x as types.ClientOutputs<TBot>['patchState'])
      )) as types.ClientOperations<TBot>['patchState']
  public callAction: types.ClientOperations<TBot>['callAction'] = ((x) =>
    this._runBefore('callAction', x)
      .then((x) => this._client.callAction(x))
      .then((x) =>
        this._runAfter('callAction', x as types.ClientOutputs<TBot>['callAction'])
      )) as types.ClientOperations<TBot>['callAction']
  public uploadFile: types.ClientOperations<TBot>['uploadFile'] = ((x) =>
    this._runBefore('uploadFile', x)
      .then((x) => this._client.uploadFile(x))
      .then((x) =>
        this._runAfter('uploadFile', x as types.ClientOutputs<TBot>['uploadFile'])
      )) as types.ClientOperations<TBot>['uploadFile']
  public upsertFile: types.ClientOperations<TBot>['upsertFile'] = ((x) =>
    this._runBefore('upsertFile', x)
      .then((x) => this._client.upsertFile(x))
      .then((x) =>
        this._runAfter('upsertFile', x as types.ClientOutputs<TBot>['upsertFile'])
      )) as types.ClientOperations<TBot>['upsertFile']
  public deleteFile: types.ClientOperations<TBot>['deleteFile'] = ((x) =>
    this._runBefore('deleteFile', x)
      .then((x) => this._client.deleteFile(x))
      .then((x) =>
        this._runAfter('deleteFile', x as types.ClientOutputs<TBot>['deleteFile'])
      )) as types.ClientOperations<TBot>['deleteFile']
  public listFiles: types.ClientOperations<TBot>['listFiles'] = ((x) =>
    this._runBefore('listFiles', x)
      .then((x) => this._client.listFiles(x))
      .then((x) =>
        this._runAfter('listFiles', x as types.ClientOutputs<TBot>['listFiles'])
      )) as types.ClientOperations<TBot>['listFiles']
  public getFile: types.ClientOperations<TBot>['getFile'] = ((x) =>
    this._runBefore('getFile', x)
      .then((x) => this._client.getFile(x))
      .then((x) =>
        this._runAfter('getFile', x as types.ClientOutputs<TBot>['getFile'])
      )) as types.ClientOperations<TBot>['getFile']
  public updateFileMetadata: types.ClientOperations<TBot>['updateFileMetadata'] = ((x) =>
    this._runBefore('updateFileMetadata', x)
      .then((x) => this._client.updateFileMetadata(x))
      .then((x) =>
        this._runAfter('updateFileMetadata', x as types.ClientOutputs<TBot>['updateFileMetadata'])
      )) as types.ClientOperations<TBot>['updateFileMetadata']
  public searchFiles: types.ClientOperations<TBot>['searchFiles'] = ((x) =>
    this._runBefore('searchFiles', x)
      .then((x) => this._client.searchFiles(x))
      .then((x) =>
        this._runAfter('searchFiles', x as types.ClientOutputs<TBot>['searchFiles'])
      )) as types.ClientOperations<TBot>['searchFiles']

  private async _runBefore<K extends keyof ClientHooks<TBot>['before']>(
    key: K,
    x: types.ClientInputs<TBot>[K]
  ): Promise<types.ClientInputs<TBot>[K]> {
    const hooks = this._hooks.before?.[key] ?? []
    let y: types.ClientInputs<TBot>[K] = x
    for (const hook of hooks) {
      y = await hook(y)
    }
    return y
  }

  private async _runAfter<K extends keyof ClientHooks<TBot>['after']>(
    key: K,
    x: types.ClientOutputs<TBot>[K]
  ): Promise<types.ClientOutputs<TBot>[K]> {
    const hooks = this._hooks.after?.[key] ?? []
    let y: types.ClientOutputs<TBot>[K] = x
    for (const hook of hooks) {
      y = await hook(y)
    }
    return y
  }
}
