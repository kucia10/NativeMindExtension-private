import { getUserConfig } from '@/utils/user-config'
import logger from '@/utils/logger'

const log = logger.child('openai-compatible')

async function getOpenAICompatibleConfig() {
  const userConfig = await getUserConfig()
  const baseUrl = userConfig.llm.backends.openaiCompatible.baseUrl.get()
  const apiKey = userConfig.llm.backends.openaiCompatible.apiKey.get()
  return { baseUrl, apiKey }
}

function buildModelsUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, '')
  if (/\/v\d+$/.test(normalized)) {
    return `${normalized}/models`
  }
  return `${normalized}/v1/models`
}

export interface OpenAICompatibleModelInfo {
  id: string
  owned_by?: string
}

export async function fetchModelList(): Promise<{ models: OpenAICompatibleModelInfo[] }> {
  try {
    const { baseUrl, apiKey } = await getOpenAICompatibleConfig()

    if (!baseUrl) {
      log.error('Base URL is not configured')
      return { models: [] }
    }

    const url = buildModelsUrl(baseUrl)
    log.info('Fetching model list from:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
    })

    if (!response.ok) {
      log.error('Failed to fetch model list, status:', response.status, 'url:', url)
      return { models: [] }
    }

    const data = await response.json()
    log.info('Model list response:', data)

    let rawModels: any[] = []
    if (Array.isArray(data)) {
      rawModels = data
    }
    else if (Array.isArray(data.data)) {
      rawModels = data.data
    }
    else if (Array.isArray(data.models)) {
      rawModels = data.models
    }

    const models: OpenAICompatibleModelInfo[] = rawModels.map((m: any) => ({
      id: (m.id ?? m.name ?? String(m)) as string,
      owned_by: m.owned_by as string | undefined,
    }))

    log.info('Parsed models:', models.length)
    return { models }
  }
  catch (error) {
    log.error('Error fetching model list:', error)
    return { models: [] }
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const { baseUrl, apiKey } = await getOpenAICompatibleConfig()

    if (!baseUrl) {
      log.error('Base URL is not configured')
      return false
    }

    const url = buildModelsUrl(baseUrl)
    log.info('Testing connection to:', url)

    const modelsResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
    })

    if (modelsResponse.ok || modelsResponse.status === 401 || modelsResponse.status === 403) {
      return true
    }

    log.error('Connection test failed with status:', modelsResponse.status)
    return false
  }
  catch (error) {
    log.error('Error testing OpenAI-compatible connection:', error)
    return false
  }
}
