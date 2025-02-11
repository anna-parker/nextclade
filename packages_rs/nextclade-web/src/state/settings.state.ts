import { mapValues, sum } from 'lodash'
import { atom, selector } from 'recoil'
import {
  COLUMN_WIDTHS,
  DYNAMIC_CLADE_COLUMN_WIDTH,
  DYNAMIC_PHENOTYPE_COLUMN_WIDTH,
} from 'src/components/Results/ResultsTableStyle'
import { getNumThreads, guessNumThreads } from 'src/helpers/getNumThreads'
import { persistAtom } from 'src/state/persist/localStorage'
import { cladeNodeAttrKeysAtom, phenotypeAttrKeysAtom } from 'src/state/results.state'

export const isInitializedAtom = atom<boolean>({
  key: 'isInitialized',
  default: false,
})

export const numThreadsAtom = atom<number>({
  key: 'numThreads',
  default: guessNumThreads()?.numThreads ?? getNumThreads(),
  effects: [persistAtom],
})

export const isSettingsDialogOpenAtom = atom<boolean>({
  key: 'isSettingsDialogOpen',
  default: false,
})

export const isNewRunPopupShownAtom = atom<boolean>({
  key: 'isNewRunPopupShown',
  default: false,
})

export const isResultsFilterPanelCollapsedAtom = atom<boolean>({
  key: 'isResultsfilterPanelCollapsed',
  default: true,
})

export const shouldRunAutomaticallyAtom = atom<boolean>({
  key: 'shouldRunAutomatically',
  default: false,
  effects: [persistAtom],
})

export const changelogIsShownAtom = atom<boolean>({
  key: 'changelogIsShown',
  default: false,
})

export const changelogShouldShowOnUpdatesAtom = atom<boolean>({
  key: 'changelogShouldShowOnUpdates',
  default: true,
  effects: [persistAtom],
})

export const changelogLastVersionSeenAtom = atom<string>({
  key: 'changelogLastVersionSeen',
  default: '',
  effects: [persistAtom],
})

export const showNewRunPopupAtom = atom({
  key: 'showNewRunPopup',
  default: false,
})

export const resultsTableColumnWidthsAtom = atom<Record<keyof typeof COLUMN_WIDTHS, number>>({
  key: 'columnWidths',
  default: COLUMN_WIDTHS,
})

export const resultsTableColumnWidthsPxAtom = selector<Record<keyof typeof COLUMN_WIDTHS, string>>({
  key: 'columnWidthsPx',
  get: ({ get }) => mapValues(get(resultsTableColumnWidthsAtom), (width) => `${width}px`),
})

export const resultsTableDynamicCladeColumnWidthAtom = atom<number>({
  key: 'dynamicCladeColumnWidth',
  default: DYNAMIC_CLADE_COLUMN_WIDTH,
})

export const resultsTableDynamicCladeColumnWidthPxAtom = selector<string>({
  key: 'dynamicCladeColumnWidthPx',
  get: ({ get }) => `${get(resultsTableDynamicCladeColumnWidthAtom)}px`,
})

export const resultsTableDynamicPhenotypeColumnWidthAtom = atom<number>({
  key: 'dynamicPhenotypeColumnWidth',
  default: DYNAMIC_PHENOTYPE_COLUMN_WIDTH,
})

export const resultsTableDynamicPhenotypeColumnWidthPxAtom = selector<string>({
  key: 'dynamicPhenotypeColumnWidthPx',
  get: ({ get }) => `${get(resultsTableDynamicPhenotypeColumnWidthAtom)}px`,
})

export const resultsTableTotalWidthAtom = selector<number>({
  key: 'resultsTableTotalWidth',
  get({ get }) {
    const dynamicCladeColumnsWidthTotal =
      get(cladeNodeAttrKeysAtom).length * get(resultsTableDynamicCladeColumnWidthAtom)

    const dynamicPhenotypeColumnsWidthTotal =
      get(phenotypeAttrKeysAtom).length * get(resultsTableDynamicPhenotypeColumnWidthAtom)

    return sum(Object.values(COLUMN_WIDTHS)) + dynamicCladeColumnsWidthTotal + dynamicPhenotypeColumnsWidthTotal
  },
})

export const geneMapNameColumnWidthPxAtom = selector<string>({
  key: 'geneMapNameColumnWidth',
  get({ get }) {
    const totalWidth = get(resultsTableTotalWidthAtom)
    const sequenceViewColumnWidth = get(resultsTableColumnWidthsAtom).sequenceView
    const geneMapNameColumnWidth = totalWidth - sequenceViewColumnWidth
    return `${geneMapNameColumnWidth}px`
  },
})
