import React, { useMemo } from 'react'

import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import type { DeepReadonly } from 'ts-essentials'

import { formatRange } from 'src/helpers/formatRange'
import type { NucleotideDeletion } from 'src/types'
import { truncateList } from 'src/components/Results/truncateList'
import { Li, Ul } from 'src/components/Common/List'

const LIST_OF_GAPS_MAX_ITEMS = 10 as const

export interface ListOfGapsProps {
  readonly deletions: DeepReadonly<NucleotideDeletion[]>
}

export function ListOfGaps({ deletions }: ListOfGapsProps) {
  const { t } = useTranslation()

  const gapItems = useMemo(() => {
    const gapItems = deletions.map(({ start, length }) => {
      const range = formatRange(start, start + length)
      return <Li key={range}>{range}</Li>
    })

    return truncateList(gapItems, LIST_OF_GAPS_MAX_ITEMS, t('...more'))
  }, [deletions, t])

  return <Ul>{gapItems}</Ul>
}
