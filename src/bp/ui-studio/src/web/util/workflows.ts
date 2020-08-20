import { FlowView } from 'common/typings'

interface FlowDef {
  topic?: string
  workflow: string
  folders?: string[]
}

export const parseFlowName = (flowName: string, includeFolders?: boolean): FlowDef => {
  const chunks = flowName.replace(/\.flow\.json$/i, '').split('/')

  if (chunks.length === 1) {
    return { workflow: chunks[0] }
  } else if (chunks.length === 2) {
    return { topic: chunks[0], workflow: chunks[1] }
  } else {
    return {
      topic: chunks[0],
      workflow: includeFolders ? chunks.slice(1).join('/') : chunks[chunks.length - 1],
      folders: chunks.slice(1, chunks.length - 1)
    }
  }
}

export const buildFlowName = ({ topic, folders, workflow }: FlowDef, withExt?: boolean) => {
  topic = topic !== undefined ? topic + '/' : ''

  const folder = folders !== undefined ? folders.join('/') + '/' : ''
  const ext = withExt !== undefined ? '.flow.json' : ''

  return `${topic}${folder}${workflow}${ext}`
}

const nextFlowName = (flows: FlowView[], topic: string, originalName: string): string => {
  let name = undefined
  let fullName = undefined
  let index = 0
  do {
    name = `${originalName}${index ? `-${index}` : ''}`
    fullName = buildFlowName({ topic, workflow: name }, true)
    index++
  } while (flows.find(f => f.name === fullName))

  return fullName
}
