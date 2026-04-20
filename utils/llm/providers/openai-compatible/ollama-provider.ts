import { createOpenAICompatible as aiCreateOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModelV1 } from 'ai'

export interface OpenAICompatibleSettings {
  baseURL: string
  apiKey?: string
}

export function createOpenAICompatible(options: OpenAICompatibleSettings) {
  const headers: Record<string, string> = {}
  if (options.apiKey) {
    headers.Authorization = `Bearer ${options.apiKey}`
  }

  return aiCreateOpenAICompatible({
    baseURL: options.baseURL,
    name: 'openai-compatible',
    headers,
  })
}

export function createOpenAICompatibleModel(
  options: OpenAICompatibleSettings,
  modelId: string,
): LanguageModelV1 {
  return createOpenAICompatible(options)(modelId)
}
