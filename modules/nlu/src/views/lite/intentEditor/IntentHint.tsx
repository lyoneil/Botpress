import { Icon } from '@blueprintjs/core'
import { AxiosInstance } from 'axios'
import sdk from 'botpress/sdk'
import React, { FC, useEffect, useState } from 'react'

import { IntentValidation, NluMlRecommendations } from '../../../backend/typings'

import style from './style.scss'

interface Props {
  intent: sdk.NLU.IntentDefinition
  contentLang: string
  axios: AxiosInstance
  validation: IntentValidation
}

const fetchRecommendations = async (axios: AxiosInstance): Promise<NluMlRecommendations> => {
  return axios.get('/mod/nlu/ml-recommendations').then(({ data }) => data)
}

// At some point, recommendations will be computed in the backend and this component will simply fetch and display intents recommentations
const IntentHint: FC<Props> = props => {
  const utterances = props.intent.utterances[props.contentLang] || []
  const slotsLength = (props.intent.slots || []).length
  const [recommendations, setRecommendations] = useState<NluMlRecommendations | undefined>()

  useEffect(() => {
    fetchRecommendations(props.axios).then(setRecommendations)
  }, [props.intent.utterances, props.intent.slots])

  if (!recommendations) {
    return null
  }

  /*
    The ideal number of utterances should not be computed for the whole intent but rather by slots.
    Meaning, we should recommend a number of utterances for each slot, what we are doing right now is only
    valid if the're no slots. Also, we should do a density based clustering per slots and for the whole intent
    to see if the utterances all belong to the same class or if the are considerable different ways of saying
    the samething. Then, we could also not only recommend number of utterances per intent & slots but by cluster also.
  */
  const idealNumberOfUtt = Math.max(Math.pow(slotsLength * 2, 2), recommendations.goodUtterancesForML)
  let hint: JSX.Element

  if (!utterances.length) {
    hint = <span>This intent will be ignored, start adding utterances to make it trainable.</span>
  }

  if (utterances.length && utterances.length < recommendations.minUtterancesForML) {
    hint = (
      <span>
        This intent will use <strong>exact match only</strong>. To enable machine learning, add at least{' '}
        <strong>{recommendations.minUtterancesForML - utterances.length} more utterances</strong>
      </span>
    )
  }

  if (utterances.length >= recommendations.minUtterancesForML && utterances.length < idealNumberOfUtt) {
    hint = (
      <span>
        Add <strong>{idealNumberOfUtt - utterances.length} more utterances</strong> to make NLU more resilient.
      </span>
    )
  }

  const { validation } = props
  const errorMsgs: string[] = []
  if (validation) {
    for (const utt of Object.keys(validation)) {
      const { slots } = validation[utt]
      const invalidSlots = slots.filter(s => !s.isValidEntity)
      const utterancesErrorMsg = invalidSlots.map(s => `"${s.source}" is not a valid slot of type "${s.name}"`)
      errorMsgs.push(...utterancesErrorMsg)
    }
  }

  return hint ? (
    <p className={style.hint}>
      <div>
        {!utterances.length && <Icon icon="warning-sign" />}
        {!!utterances.length && <Icon icon="symbol-diamond" />}
        {hint}
      </div>
      {errorMsgs.map(e => (
        <div>
          <Icon icon="warning-sign" />
          <span>{e}</span>
        </div>
      ))}
    </p>
  ) : null
}

export default IntentHint
