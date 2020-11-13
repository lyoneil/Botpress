import { Colors } from '@blueprintjs/core'
import { Spinner } from '@blueprintjs/core'
import { Initial } from 'react-initial'

import _, { Dictionary } from 'lodash'
import React, { FC } from 'react'

import { AgentType } from '../../../../types'

interface Props {
  agents: Dictionary<AgentType>
  loading: boolean
}

const AgentList: FC<Props> = props => {
  function agentName(agent: AgentType) {
    return [agent.attributes.firstname, agent.attributes.lastname].filter(Boolean).join(' ')
  }

  function dotStyle(online) {
    return {
      top: -3,
      right: -3,
      position: 'absolute' as 'absolute',
      width: 8,
      height: 8,
      backgroundColor: online ? Colors.GREEN1 : Colors.RED1,
      borderRadius: '50%'
    }
  }

  return (
    <div>
      {props.loading && <Spinner></Spinner>}

      {!props.loading && !_.isEmpty(props.agents) && (
        <ul style={{ padding: 0, margin: 0, listStyleType: 'none' }}>
          {_.values(props.agents).map(agent => (
            <li key={agent.agentId} style={{ display: 'inline', marginRight: '8px' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <Initial
                  style={{ borderRadius: '50%' }}
                  name={agentName(agent)}
                  charCount={2}
                  height={30}
                  width={30}
                  fontSize={12}
                  fontWeight={500}
                ></Initial>
                <span style={dotStyle(agent.online)}></span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default AgentList
