import { Alignment, Button, Icon, Navbar, NavbarGroup, Tab, Tabs, Tooltip } from '@blueprintjs/core'
import { lang } from 'botpress/shared'
import _ from 'lodash'
import React, { FC, useEffect, useState } from 'react'
import { connect } from 'react-redux'
import {
  deleteFlow,
  duplicateFlow,
  fetchFlows,
  fetchTopics,
  getQnaCountByTopic,
  refreshConditions,
  renameFlow,
  switchFlow
} from '~/actions'
import { history } from '~/components/Routes'
import { SearchBar, SidePanel, SidePanelSection } from '~/components/Shared/Interface'
import { getAllFlows, getCurrentFlow, getFlowNamesList, RootReducer } from '~/reducers'

import Inspector from '../../FlowBuilder/inspector'
import Toolbar from '../../FlowBuilder/sidePanel/Toolbar'

import style from './style.scss'
import Library from './Library'
import { exportCompleteTopic } from './TopicEditor/export'
import CreateTopicModal from './TopicEditor/CreateTopicModal'
import EditTopicModal from './TopicEditor/EditTopicModal'
import ImportModal from './TopicEditor/ImportModal'
import TopicList, { CountByTopic } from './TopicList'
import EditTopicQnAModal from './TopicQnAEditor/EditTopicQnAModal'
import WorkflowEditor from './WorkflowEditor'
import { exportCompleteWorkflow } from './WorkflowEditor/export'

export type PanelPermissions = 'create' | 'rename' | 'delete'

export enum ElementType {
  Topic = 'topic',
  Workflow = 'workflow',
  Content = 'content',
  Action = 'action',
  Intent = 'intent',
  Flow = 'flow',
  Knowledge = 'knowledge',
  Unknown = 'unknown'
}

interface OwnProps {
  onCreateFlow: (flowName: string) => void
  onDeleteSelectedElements: () => void
  history: any
  permissions: PanelPermissions[]
  readOnly: boolean
  mutexInfo: any
}

type StateProps = ReturnType<typeof mapStateToProps>
type DispatchProps = typeof mapDispatchToProps

type Props = StateProps & DispatchProps & OwnProps

const SidePanelContent: FC<Props> = props => {
  const [createTopicOpen, setCreateTopicOpen] = useState(false)
  const [topicModalOpen, setTopicModalOpen] = useState(false)
  const [topicQnAModalOpen, setTopicQnAModalOpen] = useState(false)
  const [editWorkflowModalOpen, setEditWorkflowModalOpen] = useState(false)
  const [importWorkflowModalOpen, setImportWorkflowModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)

  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('')
  const [selectedTopic, setSelectedTopic] = useState<string>('')

  const [topicFilter, setTopicFilter] = useState('')
  const [libraryFilter, setLibraryFilter] = useState('')

  const [currentTab, setCurrentTab] = useState('topics')

  useEffect(() => {
    props.refreshConditions()
    props.fetchTopics()
    props.getQnaCountByTopic()
  }, [])

  const goToFlow = flow => history.push(`/oneflow/${flow.replace(/\.flow\.json/, '')}`)

  const editQnA = (topicName: string) => {
    setSelectedTopic(topicName)
    setTopicQnAModalOpen(true)
  }

  const editTopic = (topicName: string) => {
    setSelectedTopic(topicName)
    setTopicModalOpen(true)
  }

  const duplicateFlow = (flowName: string) => {}

  const editWorkflow = (workflowId: string, data) => {
    props.switchFlow(data.name)
    setSelectedTopic(data.name.split('/')[0])
    setSelectedWorkflow(workflowId)
    setEditWorkflowModalOpen(true)
  }

  const createWorkflow = (topicName: string) => {
    setSelectedTopic(topicName)
    setSelectedWorkflow('')
    setEditWorkflowModalOpen(true)
  }

  const downloadTextFile = (text, fileName) => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([text], { type: `application/json` }))
    link.download = fileName
    link.click()
  }

  const exportTopic = async topicName => {
    const topic = await exportCompleteTopic(topicName, props.flows)
    downloadTextFile(JSON.stringify(topic), `${topicName}.json`)
  }

  const exportWorkflow = async name => {
    const workflow = await exportCompleteWorkflow(name)
    downloadTextFile(JSON.stringify(workflow), `${name}.json`)
  }

  const onImportCompleted = () => {
    props.fetchFlows()
    props.fetchTopics()
  }

  const toggleQnaModal = () => {
    // TODO: only update when dirty
    if (topicQnAModalOpen) {
      props.getQnaCountByTopic()
    }

    setTopicQnAModalOpen(!topicQnAModalOpen)
  }

  const importWorkflow = () => setImportWorkflowModalOpen(!importWorkflowModalOpen)
  const canDelete = props.permissions.includes('delete')

  const onTabChanged = tabId => {
    setCurrentTab(tabId)
  }

  return (
    <div className={style.sidePanel}>
      {props.showFlowNodeProps ? (
        <Inspector onDeleteSelectedElements={props?.onDeleteSelectedElements} />
      ) : (
        <React.Fragment>
          <Navbar className={style.topicsNavbar}>
            <NavbarGroup>
              <Tabs onChange={onTabChanged}>
                <Tab id="topics" title={lang.tr('topics')} />
                <Tab id="library" title={lang.tr('library')} />
              </Tabs>
            </NavbarGroup>
            {props.permissions.includes('create') && (
              <NavbarGroup align={Alignment.RIGHT}>
                <Tooltip content={lang.tr('studio.flow.sidePanel.importTopic')}>
                  <Button icon="import" onClick={() => setImportModalOpen(true)} />
                </Tooltip>
                <Tooltip content={lang.tr('studio.flow.sidePanel.addTopic')}>
                  <Button icon="plus" onClick={() => setCreateTopicOpen(true)} />
                </Tooltip>
              </NavbarGroup>
            )}
          </Navbar>

          {currentTab === 'topics' && (
            <TopicList
              readOnly={props.readOnly}
              canDelete={canDelete}
              flows={props.flowsName}
              qnaCountByTopic={props.qnaCountByTopic}
              goToFlow={goToFlow}
              deleteFlow={props.deleteFlow}
              duplicateFlow={duplicateFlow}
              currentFlow={props.currentFlow}
              editWorkflow={editWorkflow}
              createWorkflow={createWorkflow}
              exportWorkflow={exportWorkflow}
              importWorkflow={importWorkflow}
              filter={topicFilter}
              editTopic={editTopic}
              editQnA={editQnA}
              topics={props.topics}
              exportTopic={exportTopic}
              fetchTopics={props.fetchTopics}
            />
          )}

          {currentTab === 'library' && <Library filter={libraryFilter} />}
        </React.Fragment>
      )}

      <EditTopicModal
        selectedTopic={selectedTopic}
        isOpen={topicModalOpen}
        toggle={() => setTopicModalOpen(!topicModalOpen)}
      />

      <EditTopicQnAModal selectedTopic={selectedTopic} isOpen={topicQnAModalOpen} toggle={toggleQnaModal} />

      <CreateTopicModal
        isOpen={createTopicOpen}
        toggle={() => setCreateTopicOpen(!createTopicOpen)}
        onCreateFlow={props.onCreateFlow}
      />

      <WorkflowEditor
        isOpen={editWorkflowModalOpen}
        toggle={() => setEditWorkflowModalOpen(!editWorkflowModalOpen)}
        selectedWorkflow={selectedWorkflow}
        selectedTopic={selectedTopic}
        readOnly={props.readOnly}
        canRename={props.permissions.includes('rename')}
      />

      <ImportModal
        isOpen={importModalOpen}
        toggle={() => setImportModalOpen(!importModalOpen)}
        onImportCompleted={onImportCompleted}
        selectedTopic={selectedTopic}
        flows={props.flows}
        topics={props.topics}
      />
    </div>
  )
}

const mapStateToProps = (state: RootReducer) => ({
  currentFlow: getCurrentFlow(state),
  flows: getAllFlows(state),
  flowsName: getFlowNamesList(state),
  showFlowNodeProps: state.flows.showFlowNodeProps,
  topics: state.ndu.topics,
  qnaCountByTopic: state.ndu.qnaCountByTopic
})

const mapDispatchToProps = {
  switchFlow,
  deleteFlow,
  duplicateFlow,
  renameFlow,
  refreshConditions,
  fetchTopics,
  fetchFlows,
  getQnaCountByTopic
}

export default connect<StateProps, DispatchProps, OwnProps>(mapStateToProps, mapDispatchToProps)(SidePanelContent)
