import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import { isNil } from 'lodash'
import { ErrorFatal } from 'src/helpers/ErrorFatal'
import { sanitizeError } from 'src/helpers/sanitizeError'

export class HttpRequestError extends Error {
  public readonly url?: string
  public readonly status?: number | string
  public readonly statusText?: string

  constructor(error_: AxiosError) {
    super(error_.message)
    this.url = error_.config.url
    this.status = error_.response?.status ?? error_.status ?? error_.code
    this.statusText = error_.response?.statusText
  }
}

export function isValidHttpUrl(s: string) {
  let url
  try {
    url = new URL(s)
  } catch {
    return false
  }
  return url.protocol === 'http:' || url.protocol === 'https:'
}

export function validateUrl(url?: string): string {
  if (isNil(url)) {
    throw new ErrorFatal(`Attempted to fetch from an empty URL`)
  }
  if (!isValidHttpUrl(url)) {
    throw new ErrorFatal(`Attempted to fetch from an invalid URL: '${url}'`)
  }
  return url
}

export async function axiosFetch<TData = unknown>(
  url_: string | undefined,
  options?: AxiosRequestConfig,
): Promise<TData> {
  const url = validateUrl(url_)

  let res
  try {
    res = await axios.get(url, options)
  } catch (error) {
    throw axios.isAxiosError(error) ? new HttpRequestError(error) : sanitizeError(error)
  }

  if (!res?.data) {
    throw new Error(`Unable to fetch: request to URL "${url}" resulted in no data`)
  }

  return res.data as TData
}

export async function axiosFetchMaybe(url?: string): Promise<string | undefined> {
  if (!url) {
    return undefined
  }
  return axiosFetch(url)
}

export async function axiosFetchOrUndefined<TData = unknown>(
  url: string | undefined,
  options?: AxiosRequestConfig,
): Promise<TData | undefined> {
  try {
    return await axiosFetch<TData>(url, options)
  } catch {
    return undefined
  }
}

/**
 * This version skips any transforms (such as JSON parsing) and returns plain string
 */
export async function axiosFetchRaw(url: string | undefined, options?: AxiosRequestConfig): Promise<string> {
  return axiosFetch(url, { ...options, transformResponse: [] })
}

export async function axiosFetchRawMaybe(url?: string): Promise<string | undefined> {
  if (!url) {
    return undefined
  }
  return axiosFetchRaw(url)
}

export async function axiosHead(url: string | undefined, options?: AxiosRequestConfig): Promise<AxiosResponse> {
  if (isNil(url)) {
    throw new ErrorFatal(`Attempted to fetch from an invalid URL: '${url}'`)
  }

  try {
    return await axios.head(url, options)
  } catch (error) {
    throw axios.isAxiosError(error) ? new HttpRequestError(error) : sanitizeError(error)
  }
}

export async function axiosHeadOrUndefined(
  url: string | undefined,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse | undefined> {
  try {
    return await axiosHead(url, options)
  } catch {
    return undefined
  }
}
