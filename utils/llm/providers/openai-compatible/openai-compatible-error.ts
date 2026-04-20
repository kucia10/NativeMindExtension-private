import { APICallError } from '@ai-sdk/provider'
import { createJsonErrorResponseHandler, ResponseHandler } from '@ai-sdk/provider-utils'
import { z } from 'zod'

export type OpenAICompatibleErrorData = {
  message: string
  type?: string
  param?: string
  code?: string
}

export const openaiCompatibleErrorDataSchema = z.object({
  message: z.string(),
  type: z.string().optional(),
  param: z.string().optional(),
  code: z.string().optional(),
})

export type ProviderErrorStructure<T extends z.ZodType> = {
  errorSchema: T
  errorToMessage: (errorData: z.infer<T>) => string
}

export const defaultOpenAICompatibleErrorStructure: ProviderErrorStructure<z.ZodType<OpenAICompatibleErrorData>> = {
  errorSchema: openaiCompatibleErrorDataSchema,
  errorToMessage: (errorData) => errorData.message,
}

export const defaultOpenAICompatibleErrorResponseHandler: ResponseHandler<APICallError> = createJsonErrorResponseHandler(defaultOpenAICompatibleErrorStructure)
