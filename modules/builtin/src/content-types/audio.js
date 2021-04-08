const base = require('./_base')
const path = require('path')
const utils = require('./_utils')

function render(data) {
  const events = []

  if (data.typing) {
    events.push({
      type: 'typing',
      value: data.typing
    })
  }

  return [
    ...events,
    {
      type: 'audio',
      title: data.title,
      url: utils.formatURL(data.BOT_URL, data.image),
      collectFeedback: data.collectFeedback
    }
  ]
}

function renderElement(data, channel) {
  if (channel === 'vonage') {
    return data
  } else {
    return render(data)
  }
}

module.exports = {
  id: 'builtin_audio',
  group: 'Built-in Audio',
  title: 'Audio',

  jsonSchema: {
    description: 'module.builtin.types.audio.description',
    type: 'object',
    $subtype: 'audio',
    required: ['audio'],
    properties: {
      audio: {
        type: 'string',
        $subtype: 'audio',
        $filter: '.aac, .mp4, .mp3, .amr, .mpeg, .ogg|audio/*',
        title: 'module.builtin.types.audio.title'
      },
      title: {
        type: 'string',
        title: 'module.builtin.types.audio.audioLabel'
      },
      ...base.typingIndicators
    }
  },

  uiSchema: {
    title: {
      'ui:field': 'i18n_field'
    }
  },

  computePreviewText: formData => {
    if (!formData.audio) {
      return
    }

    const link = utils.formatURL(formData.BOT_URL, formData.audio)
    const title = formData.title ? ' | ' + formData.title : ''
    let fileName = ''

    if (utils.isUrl(link)) {
      fileName = path.basename(formData.audio)
      if (fileName.includes('-')) {
        fileName = fileName
          .split('-')
          .slice(1)
          .join('-')
      }
      return `Audio: (${fileName}) ${title}`
    } else {
      return `Expression: ${link}${title}`
    }
  },

  renderElement: renderElement
}
