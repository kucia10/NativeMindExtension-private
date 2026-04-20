import { z } from 'zod'

export interface OpenAICompatibleChatSettings {
  user?: string
  includeUsage?: boolean
  simulateStreaming?: boolean
}

export type OpenAICompatibleChatPrompt = OpenAICompatibleMessage[]

export type OpenAICompatibleMessage =
  | OpenAICompatibleSystemMessage
  | OpenAICompatibleUserMessage
  | OpenAICompatibleAssistantMessage
  | OpenAICompatibleToolMessage

export interface OpenAICompatibleSystemMessage {
  role: 'system'
  content: string
}

export type OpenAICompatibleUserMessage =
  | {
      role: 'user'
      content: string
    }
  | {
      role: 'user'
      content: OpenAICompatibleContentPart[]
    }

export interface OpenAICompatibleAssistantMessage {
  role: 'assistant'
  content: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
}

export interface OpenAICompatibleToolMessage {
  role: 'tool'
  tool_call_id: string
  content: string
}

export type OpenAICompatibleContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
