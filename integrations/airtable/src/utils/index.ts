import { TableFields } from 'src/misc/types'
import { AirtableApi } from '../client'
import { Config } from '../misc/types'

export function getClient(config: Config) {
  return new AirtableApi(config.accessToken, config.baseId, config.endpointUrl)
}

export function fieldsStringToArray(fieldsString: string) {
  let fields: TableFields
  try {
    fields = fieldsString.split(',').map((fieldString) => {
      const [type, name] = fieldString.trim().split('_')
      if (type === '' || type === undefined) throw new Error('Type is Required')
      if (name === '' || name === undefined) throw new Error('Name is Required')

      return {
        type,
        name,
      }
    })
  } catch (error) {
    fields = []
  }
  return fields
}
