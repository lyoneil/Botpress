const fs = require('fs')
const axios = require('axios').default
const _ = require('lodash')
const chalk = require('chalk')
const getos = require('getos')
const os = require('os')

const repoRootDir = `${__dirname}/..`
const nluTestingDir = `${repoRootDir}/modules/nlu-testing/`

const BASE = 'http://localhost:3000'

const USER_CREDENTIALS = {
  email: 'admin',
  password: '123456'
}

const login = async () => {
  try {
    const { data } = await axios.post(`${BASE}/api/v1/auth/login/basic/default`, USER_CREDENTIALS)
    return data.payload.token
  } catch {
    return
  }
}

const signup = async () => {
  try {
    const { data } = await axios.post(`${BASE}/api/v1/auth/register/basic/default`, USER_CREDENTIALS)
    return data.payload.token
  } catch {
    return
  }
}

const loginOrSignup = async () => {
  let token = await login()
  if (!token) {
    token = await signup()
  }
  return token
}

const createBot = async (axiosConfig, botInfo) => {
  try {
    await axios.post(`${BASE}/api/v1/admin/bots`, botInfo, axiosConfig)
  } catch (err) {
    const { status } = err.response
    if (status === 409) {
      console.log(`[${botInfo.id}] bot already exists`)
      return
    }
    throw err
  }
}

const waitForTraining = async (axiosConfig, botInfo) => {
  return new Promise(resolve => {
    let i = 0
    console.log(`[${botInfo.id}] training...`)
    const intervalId = setInterval(async () => {
      const { data: trainingSession } = await axios.get(
        `${BASE}/api/v1/bots/${botInfo.id}/mod/nlu/training/en`,
        axiosConfig
      )

      const { status } = trainingSession
      if (status === 'done') {
        clearInterval(intervalId)
        resolve()
      } else if (status === 'training') {
        console.log(`[${botInfo.id}] training... ${2 * ++i}s`)
      } else {
        throw new Error(`An error occured while training. Training status is: ${status}`)
      }
    }, 2000)
  })
}

const runAllTests = async (axiosConfig, botInfo) => {
  const baseNluTesting = `${BASE}/api/v1/bots/${botInfo.id}/mod/nlu-testing`
  const { data: tests } = await axios.get(`${baseNluTesting}/tests`, axiosConfig)

  let passedTests = 0
  let i = 0
  for (const test of tests) {
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

    passedTests += testResult.success ? 1 : 0
    console.log(`[${botInfo.id}] (${++i} /${tests.length}) #${test.id}`, 'success: ', testResult.success)
  }

  return _.round((passedTests / tests.length) * 100, 1)
}

const getPreviousScore = async botInfo => {
  const latestResultsFile = `${nluTestingDir}/src/bot-templates/${botInfo.template.id}/latest-results.csv`
  const latestResultsContent = fs.readFileSync(latestResultsFile, { encoding: 'utf8' })
  const previousScoreOccurence = latestResultsContent.match(/summary: ((100|\d{1,2})[.]\d{1})?/gm)
  if (!previousScoreOccurence || !previousScoreOccurence[0]) {
    return
  }

  const previousScoreString = previousScoreOccurence[0].split(':')[1]
  const previousScore = parseFloat(previousScoreString)

  return previousScore
}

const makeAxiosConfig = token => {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-BP-Workspace': 'default'
    }
  }
}

const getOs = () => {
  return new Promise((resolve, error) => {
    getos((err, os) => {
      if (err) {
        error(err)
      } else {
        resolve(os)
      }
    })
  }).catch(_err => ({
    os: os.platform(),
    dist: 'default',
    codename: 'N/A',
    release: 'N/A'
  }))
}

const isLinuxUbuntu = distribution => {
  const { os, dist } = distribution
  return os.toLowerCase() === 'linux' && dist.toLowerCase().includes('ubuntu')
}

const handleRegression = async botInfo => {
  const distribution = await getOs()

  console.error(chalk.bold(chalk.red(`[${botInfo.id}] There Seems To Be A Regression On Dataset...`)))

  if (!isLinuxUbuntu(distribution)) {
    const { os, dist } = distribution
    console.error(
      chalk.red(
        `However, because you're using OS ${os} ${dist} this may be normal as some tests are platform dependant.`
      )
    )
    return
  }
}

const runRegressionForBot = async (axiosConfig, botInfo) => {
  await createBot(axiosConfig, botInfo)
  await waitForTraining(axiosConfig, botInfo)
  console.log(chalk.green(chalk.bold(`[${botInfo.id}] Training Done!`)))

  const score = await runAllTests(axiosConfig, botInfo)
  console.log(chalk.yellow(`[${botInfo.id}] Score:`), score)

  const previousScore = await getPreviousScore(botInfo)
  if (_.isNull(previousScore) || _.isUndefined(previousScore)) {
    console.error(chalk.red(chalk.bold(`[${botInfo.id}] Could not find previous score...`)))
    process.exit(1)
  }

  console.log(chalk.yellow(`[${botInfo.id}] Previous Score Was:`), previousScore)

  const testPasses = score >= previousScore
  if (!testPasses) {
    await handleRegression(botInfo)
    return false
  }

  console.log(chalk.green(chalk.bold(`[${botInfo.id}] No Regression Noted!`)))
  return true
}

const main = async () => {
  const token = await loginOrSignup()
  if (!token) {
    console.error(chalk.red(chalk.bold('Unable To Login Or Sign Up...')))
    process.exit(1)
  }

  const axiosConfig = makeAxiosConfig(token)

  const testyInfo = {
    id: 'testy',
    name: 'testy',
    template: {
      id: 'bp-nlu-regression-testing',
      moduleId: 'nlu-testing'
    }
  }

  const slotyInfo = {
    id: 'sloty',
    name: 'sloty',
    template: {
      id: 'bp-nlu-slot-extraction',
      moduleId: 'nlu-testing'
    }
  }

  try {
    let testPasses = true
    testPasses = await runRegressionForBot(axiosConfig, testyInfo)
    testPasses = await runRegressionForBot(axiosConfig, slotyInfo)

    if (!testPasses) {
      process.exit(1)
    }
    process.exit(0)
  } catch (err) {
    console.error(chalk.red(chalk.bold('An Error Occured During Test:')))
    console.error(err)
    process.exit(1)
  }
}
main()
