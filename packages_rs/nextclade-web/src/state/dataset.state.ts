import { isNil } from 'lodash'
import { atom, DefaultValue, selector } from 'recoil'
import urljoin from 'url-join'

import type { Dataset } from 'src/types'
import { GENE_OPTION_NUC_SEQUENCE } from 'src/constants'
import { inputResetAtom } from 'src/state/inputs.state'
import { persistAtom } from 'src/state/persist/localStorage'
import { viewedGeneAtom } from 'src/state/seqViewSettings.state'
import { isDefaultValue } from 'src/state/utils/isDefaultValue'

export function getDefaultDatasetServer(): string {
  let datasetServerUrl = process.env.DATA_FULL_DOMAIN ?? '/'
  // Add HTTP Origin if datasetServerUrl is a relative path (start with '/')
  if (typeof window !== 'undefined' && datasetServerUrl.slice(0) === '/') {
    datasetServerUrl = urljoin(window.location.origin, datasetServerUrl)
  }
  return datasetServerUrl
}

export const datasetServerUrlAtom = atom<string>({
  key: 'datasetServerUrl',
  default: getDefaultDatasetServer(),
})

export interface Datasets {
  datasets: Dataset[]
  defaultDatasetName: string
  defaultDatasetNameFriendly: string
}

export const datasetsAtom = atom<Datasets>({
  key: 'datasets',
})

const datasetCurrentNameStorageAtom = atom<string | undefined>({
  key: 'datasetCurrentNameStorage',
  default: undefined,
  effects: [persistAtom],
})

export const datasetCurrentNameAtom = selector<string | undefined>({
  key: 'datasetCurrentName',
  get({ get }) {
    return get(datasetCurrentNameStorageAtom)
  },
  set({ get, set, reset }, newDatasetCurrentName: string | undefined | DefaultValue) {
    const datasetCurrentName = get(datasetCurrentNameStorageAtom)
    if (isDefaultValue(newDatasetCurrentName) || isNil(newDatasetCurrentName)) {
      reset(datasetCurrentNameStorageAtom)
    } else if (datasetCurrentName !== newDatasetCurrentName) {
      const { datasets } = get(datasetsAtom)
      const dataset = datasets.find((dataset) => dataset.attributes.name.value === newDatasetCurrentName)
      if (dataset) {
        set(datasetCurrentNameStorageAtom, dataset.attributes.name.value)
        set(viewedGeneAtom, dataset.params?.defaultGene ?? GENE_OPTION_NUC_SEQUENCE)
        reset(inputResetAtom)
      }
    }
  },
})

export const datasetCurrentAtom = selector<Dataset | undefined>({
  key: 'datasetCurrent',
  get({ get }) {
    const { datasets } = get(datasetsAtom)
    const datasetCurrentName = get(datasetCurrentNameAtom)
    return datasets.find((dataset) => dataset.attributes.name.value === datasetCurrentName)
  },
})

export const geneOrderPreferenceAtom = selector({
  key: 'geneOrderPreference',
  get({ get }) {
    return get(datasetCurrentAtom)?.params?.geneOrderPreference ?? []
  },
})
