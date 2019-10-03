import path from 'path'

import { bpConfig } from '../../../jest-puppeteer.config'
import { clickOn, expectMatchElement, fillField, uploadFile } from '../expectPuppeteer'
import { autoAnswerDialog, expectAdminApiCallSuccess, gotoAndExpect, getTime } from '../utils'

describe('Admin - Bot Management', () => {
  const tempBotId = 'lol-bot'
  const importBotId = 'import-bot'
  const workspaceId = 'default'

  const clickButtonForBot = async (buttonId: string, botId: string) => {
    const botRow = await expectMatchElement('.bp_table-row', { text: botId })
    await clickOn('#btn-menu', undefined, botRow)
    await clickOn(buttonId, undefined)
  }

  beforeAll(async () => {
    await gotoAndExpect(`${bpConfig.host}/admin/workspace/${workspaceId}/bots`)
  })

  it('Import bot from archive', async () => {
    await clickOn('#btn-create-bot')
    await page.waitFor(100)
    await clickOn('#btn-import-bot')
    await fillField('#input-botId', importBotId)
    await uploadFile('input[type="file"]', path.join(__dirname, '../assets/bot-import-test.tgz'))
    await clickOn('#btn-upload')
    await expectAdminApiCallSuccess(`bots/${importBotId}/import`, 'POST')
  })

  it('Delete imported bot', async () => {
    autoAnswerDialog()

    await clickButtonForBot('#btn-delete', importBotId)
    await expectAdminApiCallSuccess(`bots/${importBotId}/delete`, 'POST')
    await page.waitFor(200)
  })

  it('Create temporary bot', async () => {
    await clickOn('#btn-create-bot')
    await page.waitFor(100)
    await clickOn('#btn-new-bot')

    await fillField('#input-bot-name', tempBotId)
    await fillField('#select-bot-templates', 'Welcome Bot') // Using fill instead of select because options are created dynamically
    await page.keyboard.press('Enter')

    await clickOn('#btn-modal-create-bot')
    await expectAdminApiCallSuccess('bots', 'POST')
  })

  it('Export bot', async () => {
    await clickButtonForBot('#btn-export', tempBotId)

    const response = await page.waitForResponse(`${bpConfig.host}/api/v1/admin/bots/${tempBotId}/export`)
    expect(response.status()).toBe(200)

    const responseSize = Number(response.headers()['content-length'])
    expect(responseSize).toBeGreaterThan(100)
  })

  it('Configure bot', async () => {
    const botRow = await expectMatchElement('.bp_table-row', { text: tempBotId })
    console.log(`${getTime()} Configure bot: Clicking on .configBtn`)
    await clickOn('.configBtn', undefined, botRow)

    console.log(`${getTime()} Configure bot: filling input-name`)
    await fillField('#input-name', `${tempBotId} - testing my fabulous bot`)
    console.log(`${getTime()} Configure bot: clicking on select-status`)
    await clickOn('#select-status')
    console.log(`${getTime()} Configure bot: pressing arrowdown`)
    await page.keyboard.press('ArrowDown')
    console.log(`${getTime()} Configure bot: pressing enter`)
    await page.keyboard.press('Enter')
    console.log(`${getTime()} Configure bot: Waiting for API call and click on btn-save`)
    await Promise.all([expectAdminApiCallSuccess(`bots/${tempBotId}`, 'POST'), clickOn('#btn-save')])
    console.log(`${getTime()} Configure bot: gotoandexpect ${bpConfig.host}/admin/workspace/${workspaceId}/bots`)
    await gotoAndExpect(`${bpConfig.host}/admin/workspace/${workspaceId}/bots`)
  })

  it('Create revision', async () => {
    await clickButtonForBot('#btn-createRevision', tempBotId)
    await expectAdminApiCallSuccess(`bots/${tempBotId}/revisions`, 'POST')
  })

  it('Rollback revision', async () => {
    await clickButtonForBot('#btn-rollbackRevision', tempBotId)
    await expectAdminApiCallSuccess(`bots/${tempBotId}/revisions`, 'GET')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    autoAnswerDialog()
    await clickOn('#btn-rollback')
    await expectAdminApiCallSuccess(`bots/${tempBotId}/rollback`, 'POST')
  })

  it('Delete temporary bot', async () => {
    autoAnswerDialog()

    await clickButtonForBot('#btn-delete', tempBotId)
    await expectAdminApiCallSuccess(`bots/${tempBotId}/delete`, 'POST')
    await page.waitFor(200)
  })
})
