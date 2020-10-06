import type { StrictOmit } from 'ts-essentials'
import { omit } from 'lodash'
import jsonexport from 'jsonexport'

import type { AnalysisResult } from 'src/algorithms/types'
import type { SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'
import { formatAAMutation, formatMutation } from 'src/helpers/formatMutation'
import { formatRange } from 'src/helpers/formatRange'
import { formatInsertion } from 'src/helpers/formatInsertion'
import { formatNonAcgtn } from 'src/helpers/formatNonAcgtn'
import { formatPrimer } from 'src/helpers/formatPrimer'
import { formatSnpCluster } from 'src/helpers/formatSnpCluster'

export type AnalysisResultWithErrors = AnalysisResult & { errors: string[] }
export type Exportable = StrictOmit<AnalysisResult, 'alignedQuery' | 'nucleotideComposition'>

export function prepareResultJson(result: AnalysisResultWithErrors): Exportable {
  return omit(result, ['alignedQuery', 'nucleotideComposition'])
}

export function prepareResultsJson(results: SequenceAnalysisState[]) {
  return results.map(({ seqName, status, errors, result, qc }) => {
    if (!result || !qc || !result.clade) {
      return { seqName, errors }
    }

    return prepareResultJson({ ...result, clade: result.clade, qc, errors: [] })
  })
}

export function serializeResultsToJson(results: SequenceAnalysisState[]) {
  const data = prepareResultsJson(results)
  return JSON.stringify(data, null, 2)
}

export function prepareResultCsv(datum: Exportable) {
  return {
    ...datum,
    qc: {
      ...datum.qc,
      snpClusters: {
        ...(datum.qc?.snpClusters ?? {}),
        clusteredSNPs: datum.qc?.snpClusters?.clusteredSNPs.map(formatSnpCluster).join(','),
      },
    },
    substitutions: datum.substitutions.map((mut) => formatMutation(mut)).join(','),
    aminoacidChanges: datum.aminoacidChanges.map((mut) => formatAAMutation(mut)).join(','),
    deletions: datum.deletions.map(({ start, length }) => formatRange(start, start + length)).join(','),
    insertions: datum.insertions.map((ins) => formatInsertion(ins)).join(','),
    missing: datum.missing.map(({ begin, end }) => formatRange(begin, end)).join(','),
    nonACGTNs: datum.nonACGTNs.map((nacgtn) => formatNonAcgtn(nacgtn)).join(','),
    pcrPrimerChanges: datum.pcrPrimerChanges.map(formatPrimer).join(','),
  }
}

export function prepareResultCsvCladesOnly(datum: Exportable) {
  const { seqName, clade } = datum
  return { seqName, clade }
}

export async function toCsvString(data: Array<unknown> | Record<string, unknown>, delimiter: string) {
  const eol = '\r\n'
  const csv = await jsonexport(data, { rowDelimiter: delimiter, endOfLine: eol })
  return `${csv}${eol}`
}

export async function serializeResultsToCsv(results: SequenceAnalysisState[], delimiter: string) {
  const data = results.map(({ seqName, status, errors, result, qc }) => {
    if (!result || !qc || !result.clade) {
      return { seqName, errors: errors.map((e) => `"${e}"`).join(',') }
    }

    const datum = prepareResultJson({ ...result, clade: result.clade, qc, errors: [] })
    return prepareResultCsv(datum)
  })

  return toCsvString(data, delimiter)
}
