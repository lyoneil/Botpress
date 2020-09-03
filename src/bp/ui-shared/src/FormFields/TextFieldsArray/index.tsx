import { Icon, Position, Tooltip } from '@blueprintjs/core'
import cx from 'classnames'
import _isEqual from 'lodash/isEqual'
import _uniqueId from 'lodash/uniqueId'
import React, { FC, useEffect, useRef, useState } from 'react'

import { lang } from '../../translations'
import { controlKey } from '../../utils/keyboardShortcuts'
import AddButton from '../../Contents/Components/Fields/AddButton'
import ShortcutLabel from '../../ShortcutLabel'
import Textarea from '../../Textarea'

import style from './style.scss'
import { TextFieldsArrayProps } from './typings'

const TextFieldsArray: FC<TextFieldsArrayProps> = ({
  addBtnLabel,
  label,
  onChange,
  items,
  refValue,
  getPlaceholder,
  validation,
  moreInfo
}) => {
  const getInitialItems = () => {
    let localItems = [...(items || [])]
    const diff = (refValue || []).length - items.length

    if (diff > 0) {
      localItems = localItems.concat(Array(diff).fill(''))
    }

    return localItems
  }

  const initialItems = getInitialItems()
  const [localItems, setLocalItems] = useState(initialItems)
  const focusedElement = useRef(initialItems.length)

  useEffect(() => {
    setLocalItems(getInitialItems())
  }, [items.length])

  const updateLocalItem = (index: number, value: string): void => {
    localItems[index] = value
    setLocalItems([...localItems])
  }

  const addItem = (value = ''): void => {
    focusedElement.current = localItems.length
    setLocalItems([...localItems, ''])
  }

  const onKeyDown = (e, index: number): void => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      addItem()
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault()
      e.target.select()
    }

    const shouldDelete = !localItems[index].length && localItems.length > 1

    if (e.key === 'Backspace' && shouldDelete) {
      e.preventDefault()

      deleteItem(index)
    }
  }

  const deleteItem = (index: number): void => {
    const newItems = localItems.filter((item, i) => i !== index)
    setLocalItems(newItems)
    focusedElement.current = index - 1
    onChange([...newItems])
  }

  const validateItem = (item: string) => {
    if (!validation?.regex?.test || !item) {
      return null
    }

    return validation.regex.test(item) ? (
      <Icon icon="tick-circle" className={cx(style.icon, style.success)}></Icon>
    ) : (
      <Icon icon="error" className={cx(style.icon, style.error)}></Icon>
    )
  }

  return (
    <div className={style.items}>
      <h2>{label}</h2>
      {moreInfo}
      {localItems?.map((item, index) => {
        const missingTranslation = refValue?.[index] && !item

        return (
          <div key={index} className={style.textareaWrapper}>
            <Textarea
              isFocused={focusedElement.current === index}
              className={cx(style.customTextarea, { ['has-error']: missingTranslation })}
              placeholder={getPlaceholder?.(index)}
              onChange={value => updateLocalItem(index, value)}
              onBlur={() => {
                if (!_isEqual(localItems, refValue)) {
                  onChange([...localItems])
                }
              }}
              onKeyDown={e => onKeyDown(e, index)}
              refValue={refValue?.[index]}
              value={item}
            />
            {validateItem(item)}
          </div>
        )
      })}
      <Tooltip
        content={lang('quickAddAlternative', {
          shortcut: <ShortcutLabel light keys={[controlKey, 'enter']} />
        })}
        position={Position.BOTTOM}
      >
        <AddButton text={addBtnLabel} onClick={() => addItem()} />
      </Tooltip>
    </div>
  )
}

export default TextFieldsArray
