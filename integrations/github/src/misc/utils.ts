import { RuntimeError } from '@botpress/client'
import { GitHubClient } from './github-client'

import * as types from './types'

type GitHubPullRequest = {
  number: number
  node_id: string
  html_url: string
  repository: {
    id: number
    name: string
    node_id: string
    owner: {
      id: number
      login: string
      html_url: string
    }
    html_url: string
  }
}
export const getOrCreateBotpressConversationFromGithubPR = async ({
  githubPullRequest,
  client,
}: {
  githubPullRequest: GitHubPullRequest
  client: types.Client
}) => {
  const { conversations } = await client.listConversations({
    tags: {
      // @ts-ignore: there seems to be a bug with ToTags<keyof AllChannels<TIntegration>['conversation']['tags']> :
      // it only contains _shared_ tags, as opposed to containing _all_ tags
      pullRequestNodeId: githubPullRequest.node_id,
      channel: 'pullRequest',
    },
  })

  if (conversations.length && conversations[0]) {
    return conversations[0]
  }

  const { conversation } = await client.createConversation({
    channel: 'pullRequest',
    tags: {
      channel: 'pullRequest',
      pullRequestNodeId: githubPullRequest.node_id,
      pullRequestNumber: githubPullRequest.number.toString(),
      pullRequestUrl: githubPullRequest.html_url,
      repoId: githubPullRequest.repository.id.toString(),
      repoName: githubPullRequest.repository.name,
      repoNodeId: githubPullRequest.repository.node_id,
      repoOwnerId: githubPullRequest.repository.owner.id.toString(),
      repoOwnerName: githubPullRequest.repository.owner.login,
      repoOwnerUrl: githubPullRequest.repository.owner.html_url,
      repoUrl: githubPullRequest.repository.html_url,
    },
  })

  return conversation
}

export const getOrCreateBotpressConversationFromGithubIssue = async ({
  githubIssue,
  client,
}: {
  githubIssue: GitHubPullRequest
  client: types.Client
}) => {
  const { conversations } = await client.listConversations({
    tags: {
      // @ts-ignore: there seems to be a bug with ToTags<keyof AllChannels<TIntegration>['conversation']['tags']> :
      // it only contains _shared_ tags, as opposed to containing _all_ tags
      issueNodeId: githubIssue.node_id,
    },
  })

  if (conversations.length && conversations[0]) {
    return conversations[0]
  }

  const { conversation } = await client.createConversation({
    channel: 'issue',
    tags: {
      issueNodeId: githubIssue.node_id,
      issueNumber: githubIssue.number.toString(),
      issueUrl: githubIssue.html_url,
      repoId: githubIssue.repository.id.toString(),
      repoName: githubIssue.repository.name,
      repoNodeId: githubIssue.repository.node_id,
      repoOwnerId: githubIssue.repository.owner.id.toString(),
      repoOwnerName: githubIssue.repository.owner.login,
      repoOwnerUrl: githubIssue.repository.owner.html_url,
      repoUrl: githubIssue.repository.html_url,
    },
  })

  return conversation
}

type GitHubDiscussion = GitHubPullRequest & {
  id: number
  category: {
    id: number
    name: string
    node_id: string
  }
}

export const getOrCreateBotpressConversationFromGithubDiscussion = async ({
  githubDiscussion,
  client,
}: {
  githubDiscussion: GitHubDiscussion
  client: types.Client
}) => {
  const { conversations } = await client.listConversations({
    tags: {
      // @ts-ignore: there seems to be a bug with ToTags<keyof AllChannels<TIntegration>['conversation']['tags']> :
      // it only contains _shared_ tags, as opposed to containing _all_ tags
      discussionNodeId: githubDiscussion.node_id,
    },
  })

  if (conversations.length && conversations[0]) {
    return conversations[0]
  }

  const { conversation } = await client.createConversation({
    channel: 'discussion',
    tags: {
      discussionNodeId: githubDiscussion.node_id,
      discussionNumber: githubDiscussion.number.toString(),
      discussionUrl: githubDiscussion.html_url,
      discussionId: githubDiscussion.id.toString(),
      discussionCategoryId: githubDiscussion.category.id.toString(),
      discussionCategoryName: githubDiscussion.category.name,
      discussionCategoryNodeId: githubDiscussion.category.node_id,
      repoId: githubDiscussion.repository.id.toString(),
      repoName: githubDiscussion.repository.name,
      repoNodeId: githubDiscussion.repository.node_id,
      repoOwnerId: githubDiscussion.repository.owner.id.toString(),
      repoOwnerName: githubDiscussion.repository.owner.login,
      repoOwnerUrl: githubDiscussion.repository.owner.html_url,
      repoUrl: githubDiscussion.repository.html_url,
    },
  })

  return conversation
}

type GitHubDiscussionReply = GitHubDiscussion & {
  comment: {
    parent_id: number
  }
}

export const getOrCreateBotpressConversationFromGithubDiscussionReply = async ({
  githubDiscussion,
  client,
}: {
  githubDiscussion: GitHubDiscussionReply
  client: types.Client
}) => {
  const { conversations } = await client.listConversations({
    tags: {
      // @ts-ignore: there seems to be a bug with ToTags<keyof AllChannels<TIntegration>['conversation']['tags']> :
      // it only contains _shared_ tags, as opposed to containing _all_ tags
      discussionNodeId: githubDiscussion.node_id,
    },
  })

  if (conversations.length && conversations[0]) {
    return conversations[0]
  }

  const { conversation } = await client.createConversation({
    channel: 'discussionComment',
    tags: {
      discussionNodeId: githubDiscussion.node_id,
      discussionNumber: githubDiscussion.number.toString(),
      discussionUrl: githubDiscussion.html_url,
      discussionId: githubDiscussion.id.toString(),
      discussionCategoryId: githubDiscussion.category.id.toString(),
      discussionCategoryName: githubDiscussion.category.name,
      discussionCategoryNodeId: githubDiscussion.category.node_id,
      parentCommentId: githubDiscussion.comment.parent_id.toString(),
      repoId: githubDiscussion.repository.id.toString(),
      repoName: githubDiscussion.repository.name,
      repoNodeId: githubDiscussion.repository.node_id,
      repoOwnerId: githubDiscussion.repository.owner.id.toString(),
      repoOwnerName: githubDiscussion.repository.owner.login,
      repoOwnerUrl: githubDiscussion.repository.owner.html_url,
      repoUrl: githubDiscussion.repository.html_url,
    },
  })

  return conversation
}

export const configureOrganizationHandle = async ({
  ctx,
  client,
  gh,
}: {
  ctx: types.Context
  client: types.Client
  gh: GitHubClient
}) => {
  const { organizationHandle } = await gh.getAuthenticatedEntity()

  await client.setState({
    type: 'integration',
    name: 'configuration',
    id: ctx.integrationId,
    payload: {
      organizationHandle,
    },
  })
}

const _saveInstallationId = async ({
  ctx,
  client,
  installationId,
}: {
  ctx: types.Context
  client: types.Client
  installationId: number
}) => {
  await client.setState({
    type: 'integration',
    name: 'configuration',
    id: ctx.integrationId,
    payload: {
      githubInstallationId: installationId,
    },
  })
}

export const handleOauth = async (req: types.Request, client: types.Client, ctx: types.Context) => {
  const parsedQueryString = new URLSearchParams(req.query)
  const installationIdStr = parsedQueryString.get('installation_id')

  if (!installationIdStr) {
    throw new RuntimeError('Missing installation_id in query string')
  }

  const installationId = Number(installationIdStr)

  await _saveInstallationId({ ctx, client, installationId })
  await client.configureIntegration({ identifier: installationIdStr })
}
