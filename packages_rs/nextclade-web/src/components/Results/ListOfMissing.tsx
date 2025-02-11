import React from 'react'

import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import type { DeepReadonly } from 'ts-essentials'

import type { NucleotideMissing } from 'src/types'
import { formatRange } from 'src/helpers/formatRange'
import { truncateList } from 'src/components/Results/truncateList'
import { Li, Ul } from 'src/components/Common/List'

const LIST_OF_TOOLTIP_MAX_ITEMS = 10 as const

export interface ListOfMissingProps {
  missing: DeepReadonly<NucleotideMissing[]>
  totalMissing: number
}

export function ListOfMissing({ missing, totalMissing }: ListOfMissingProps) {
  const { t } = useTranslation()

  let missingItems = missing.map(({ begin, end }) => {
    const range = formatRange(begin, end)
    return <Li key={range}>{range}</Li>
  })

  missingItems = truncateList(missingItems, LIST_OF_TOOLTIP_MAX_ITEMS, t('...more'))

  return (
    <div>
      <div>{t('Missing ({{totalMissing}})', { totalMissing })}</div>
      <Ul>{missingItems}</Ul>
    </div>
  )
}
