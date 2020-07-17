const fs = require('fs')
const axios = require('axios').default
const _ = require('lodash')

const repoRootDir = `${__dirname}/..`
const nluTestingDir = `${repoRootDir}/modules/nlu-testing/`

const host = '127.0.0.1'
const port = '3000'
const base = `http://${host}:${port}`

const login = async () => {
  const { data: login } = await axios.post(`${base}/api/v1/auth/login/basic/default`, {
    email: 'admin',
    password: '123456'
  })

  try {
    return login.payload.token
  } catch {
    return
  }
}

const signup = async () => {
  const { data: login } = await axios.post(`${base}/api/v1/auth/register/basic/default`, {
    email: 'admin',
    password: '123456'
  })

  try {
    return login.payload.token
  } catch {
    return
  }
}

const createBot = async (botId, axiosConfig) => {
  const newBot = {
    id: botId,
    name: 'testy',
    template: {
      id: 'bp-nlu-regression-testing',
      moduleId: 'nlu-testing'
    },
    category: undefined
  }

  try {
    await axios.post(
      `${base}/api/v1/admin/bots`,
      newBot,
      _.merge(axiosConfig, { headers: { 'X-BP-Workspace': 'default' } })
    )
  } catch (err) {
    const { status } = err.response
    if (status === 409) {
      console.log('bot already exists')
      return
    }
    throw err
  }
}

const waitForTraining = async (botId, axiosConfig) => {
  return new Promise(function(resolve) {
    let i = 0
    console.log(`training...`)
    const intervalId = setInterval(async () => {
      const { data: trainingStatus } = await axios.get(`${base}/api/v1/bots/${botId}/mod/nlu/train`, axiosConfig)

      if (!trainingStatus.isTraining) {
        clearInterval(intervalId)
        resolve()
      } else {
        console.log(`training... ${2 * ++i}s`)
      }
    }, 2000)
  })
}

const runAllTests = async (botId, axiosConfig) => {
  const baseNluTesting = `${base}/api/v1/bots/${botId}/mod/nlu-testing`
  const { data: allTests } = await axios.get(`${baseNluTesting}/tests`, axiosConfig)
  const nTests = allTests.length
  let nPassing = 0

  let i = 0
  for (const test of allTests) {
    const retry = async () => {
      const { data } = await axios.post(`${baseNluTesting}/tests/${test.id}/run`, '', axiosConfig)
      return data
    }

    let testResult
    try {
      testResult = await retry()
    } catch (err) {
      console.error(err, 'retrying')
      testResult = await retry()
    }

    nPassing += testResult.success ? 1 : 0
    console.log(`(${i++} /${nTests}) #${test.id}`, 'success: ', testResult.success)
  }

  return _.round((nPassing / nTests) * 100, 1)
}

const compareScore = async score => {
  const latestResultsFile = `${nluTestingDir}/src/bot-templates/bp-nlu-regression-testing/latest-results.csv`
  const latestResultsContent = fs.readFileSync(latestResultsFile, { encoding: 'utf8' })
  const previousScoreOccurence = latestResultsContent.match(/summary: ((100|\d{1,2})[.]\d{1})?/gm)
  if (!previousScoreOccurence || !previousScoreOccurence[0]) {
    return false
  }

  const previousScoreString = previousScoreOccurence[0].split(':')[1]
  const previousScore = parseFloat(previousScoreString)
  console.log('previous score was: ', previousScore)

  return score >= previousScore
}

const main = async () => {
  try {
    let token = await login()
    if (!token) {
      token = await signup()
    }
    if (!token) {
      console.error('Unable To Login And Sign Up...')
      process.exit(1)
    }

    const botId = 'testy'
    const axiosConfig = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }

    await createBot(botId, axiosConfig)
    await waitForTraining(botId, axiosConfig)
    console.log('Training Done!')

    const score = await runAllTests(botId, axiosConfig)
    console.log('Score: ', score)

    const testPasses = await compareScore(score)
    if (!testPasses) {
      console.error('There Seems To Be A Regression On NLU BPDS...')
      process.exit(1)
    }

    console.log('No Regression Noted!')
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}
main()
