# OpenAI Compatible Endpoint Integration Plan (NativeMindExtension)

## Summary

Add a new `openai-compatible` endpoint type to leverage the existing `@ai-sdk/openai-compatible` package already declared in dependencies. The implementation will mirror the Ollama/LM Studio provider structure already established in the codebase.

---

## Project Context

- **Architecture**: WXT-based Chrome/Firefox browser extension
- **Stack**: Vue 3 + TypeScript + TailwindCSS
- **Location**: `/Volumes/HDD_01/opencodeProjects/NativeMindExtension`
- **Dependency**: `@ai-sdk/openai-compatible` (v0.2.5) already in `package.json`
- **Target**: Add `openai-compatible` to `LLMEndpointType` union

---

## Architecture Overview

### Existing Provider Pattern

The project uses a provider-based architecture with the following structure:

```
utils/llm/providers/
├── ollama/
│   ├── ollama-provider.ts
│   ├── ollama-chat-language-model.ts
│   └── index.ts
├── lm-studio/
│   ├── chat-language-model.ts
│   └── index.ts
└── web-llm/
    ├── openai-compatible-chat-language-model.ts
    └── index.ts
```

The key interface is `LanguageModelV1` from `@ai-sdk/provider`, implemented by each provider.

### Target Architecture

Add a new provider at `utils/llm/providers/openai-compatible/` that:
1. Uses `@ai-sdk/openai-compatible` package
2. Implements the same `LanguageModelV1` interface
3. Follows the same pattern as the WebLLM implementation (which already uses OpenAI-compatible patterns)

---

## File Layout & Implementation Steps

### Phase 1: Provider Implementation (Can be Parallelized)

#### 1.1 Create Provider Directory & Types
**Path**: `utils/llm/providers/openai-compatible/`

**File 1**: `types.ts`
```typescript
import type { LanguageModelV1ProviderMetadata } from '@ai-sdk/provider'

export type OpenAICompatibleModelId = string

export interface OpenAICompatibleProviderSettings {
  /**
   * Custom fetch implementation. You can use it as a middleware to intercept requests,
   * or to provide a custom fetch implementation for e.g. testing.
   */
  fetch?: typeof fetch

  /**
   * Optional headers that will be sent with every request.
   */
  headers?: () => Record<string, string | undefined>

  /**
   * Optional organization header.
   */
  organization?: string

  /**
   * Optional number of tokens to include in the usage response.
   */
  includeUsage?: boolean

  /**
   * Custom provider metadata.
   */
  experimental_providerMetadata?: LanguageModelV1ProviderMetadata
}
```

**File 2**: `convert-to-openai-compatible-chat-messages.ts`
- Convert internal message format to OpenAI-compatible format
- **Reference**: Use `utils/llm/providers/web-llm/convert-to-openai-compatible-chat-messages.ts` as template

**File 3**: `openai-compatible-chat-language-model.ts`
- Main language model implementation
- **Reference**: Use `utils/llm/providers/web-llm/openai-compatible-chat-language-model.ts` as template
- Key methods: `doGenerate`, `doStream`

**File 4**: `index.ts`
```typescript
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

import type { OpenAICompatibleProviderSettings } from './types'

export function createOpenAICompatible(settings?: OpenAICompatibleProviderSettings) {
  return createOpenAICompatible({
    baseURL: new URL('/api', settings?.baseURL ?? 'http://localhost:11434').href,
    fetch: settings?.fetch,
    headers: settings?.headers,
    organization: settings?.organization,
    includeUsage: settings?.includeUsage,
  })
}

export { openaiCompatible } from '@ai-sdk/openai-compatible'
export type { LanguageModelV1 } from '@ai-sdk/provider'
export type { OpenAICompatibleProviderSettings } from './types'
```

---

### Phase 2: Configuration & Registry (Sequenced after Phase 1)

#### 2.1 Extend Endpoint Type
**Path**: `utils/llm/models.ts`

Update `LLMEndpointType` union:
```typescript
export type LLMEndpointType = 'ollama' | 'lm-studio' | 'web-llm' | 'openai-compatible'
```

#### 2.2 Create Configuration Structure
**Path**: `utils/user-config/settings.ts` or similar (check existing pattern)

Add OpenAI-compatible configuration schema:
```typescript
export interface OpenAICompatibleConfig {
  id: string
  name: string
  endpointUrl: string
  apiKey?: string
  defaultModel: string
  numCtx: number
  enableNumCtx: boolean
  enableThinking?: boolean
}
```

#### 2.3 Update Model Factory
**Path**: `utils/llm/models.ts` (update `getModel` function)

Add case for `'openai-compatible'` that:
1. Reads configuration from user config
2. Creates model using the new provider
3. Wraps with middleware stack

---

### Phase 3: UI & Entry Points (Parallel with Phase 2)

#### 3.1 Sidepanel LLM Integration
**Path**: `entrypoints/sidepanel/utils/llm.ts`

Update LLM loading logic to handle `openai-compatible` endpoint type.

#### 3.2 Settings Panel
**Path**: `components/settings/LMSetting/index.vue`

Add configuration panel for OpenAI-compatible endpoint:
- Endpoint URL input
- API key input (optional)
- Model name input
- Context window slider
- Thinking toggle for reasoning models

#### 3.3 Predefined Models (Optional)
**Path**: `utils/llm/predefined-models.ts`

Add any common OpenAI-compatible models (e.g., `gpt-oss:20b` that already exists):
```typescript
export const PREDEFINED_OPENAI_COMPATIBLE_MODELS: PredefinedModel[] = [
  {
    name: 'gpt-oss 20B',
    id: 'gpt-oss:20b',
  },
  // Add more as needed
]
```

---

### Phase 4: Testing & Verification (Sequenced)

#### 4.1 Unit Tests
**Path**: `utils/llm/providers/openai-compatible/__tests__/`

Create tests for:
- Message conversion
- Request body generation
- Response parsing

#### 4.2 Integration Tests
**Path**: `tests/llm/`

Test the full flow with mocked OpenAI-compatible servers.

#### 4.3 Build Verification
```bash
pnpm lint
pnpm compile
pnpm build:beta
```

---

## Configuration Structure

### User Config Schema (OpenAI-Compatible)

```typescript
interface UserModelConfig {
  llm: {
    endpointType: 'ollama' | 'lm-studio' | 'web-llm' | 'openai-compatible'
    model: string
    apiKey?: string  // optional for some providers
    backends: {
      ollama: OllamaBackendConfig
      lmStudio: LMStudioBackendConfig
      openaiCompatible: {
        baseUrl: Ref<string>
        apiKey: Ref<string>
        numCtx: Ref<number>
        enableNumCtx: Ref<boolean>
      }
    }
    reasoning: Ref<ReasoningOption>
  }
}
```

### Default Values

```typescript
const DEFAULT_OPENAI_COMPATIBLE_CONFIG = {
  baseUrl: '',
  apiKey: '',
  numCtx: 8192,
  enableNumCtx: true,
}
```

---

## Task Dependencies & Parallelization

### Parallel Tasks (No Dependencies Between Each Other)

| Phase | Task | File Path | Depends On |
|-------|------|-----------|------------|
| P1 | Create provider types | `utils/llm/providers/openai-compatible/types.ts` | `@ai-sdk/openai-compatible` |
| P1 | Create message converter | `utils/llm/providers/openai-compatible/convert-to-openai-compatible-chat-messages.ts` | P1 types |
| P1 | Create language model | `utils/llm/providers/openai-compatible/openai-compatible-chat-language-model.ts` | P1 types + message converter |
| P1 | Create barrel export | `utils/llm/providers/openai-compatible/index.ts` | P1 language model |
| P2 | Extend LLMEndpointType | `utils/llm/models.ts` | None |
| P3 | Set up configuration structure | `utils/user-config/settings.ts` | P2 (types) |
| P3 | Update settings UI panel | `components/settings/LMSetting/index.vue` | P2 (types) |

### Sequential Tasks (Must Follow Order)

| Phase | Task | File Path | Sequenced After |
|-------|------|-----------|-----------------|
| S1 | Update model factory `getModel` | `utils/llm/models.ts` | P1 + P2 complete |
| S2 | Update sidepanel LLM integration | `entrypoints/sidepanel/utils/llm.ts` | S1 |
| S3 | Create unit tests | `utils/llm/providers/openai-compatible/__tests__/` | P1 + S1 |
| S4 | Run lint/typecheck/build | CLI commands | All above |

### Execution Plan

```
Step 1: Parallel provider creation (P1 parallel tasks)
Step 2: Configuration setup (P2, P3 - can run in parallel)
Step 3: Sequential integration (S1, S2)
Step 4: Testing (S3, S4)
```

---

## Reference Implementation Notes

### Existing Patterns to Follow

1. **WebLLM Provider** (already uses OpenAI-compatible):
   - Path: `utils/llm/providers/web-llm/`
   - Key takeaway: Uses `@ai-sdk/openai-compatible` under the hood

2. **Ollama Provider**:
   - Path: `utils/llm/providers/ollama/`
   - Key takeaway: Clean separation of provider settings and language model

3. **LM Studio Provider**:
   - Path: `utils/llm/providers/lm-studio/`
   - Key takeaway: Uses its own SDK but follows same interface contract

### Key API SDK Patterns

```typescript
// Using @ai-sdk/openai-compatible package
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

const openaiCompatible = createOpenAICompatible({
  baseURL: 'http://localhost:1234/v1',
  apiKey: 'optional-api-key',
})

const model = openaiCompatible('model-id')

// Usage
await model.doGenerate({
  prompt: [{ role: 'system', content: '...' }],
  temperature: 0.7,
  maxTokens: 1024,
})
```

---

## Risk Assessment & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| SDK API changes | Medium | High | Pin version in package.json, add tests |
| Configuration migration needed | Low | Medium | Add migration step in version check |
| Type errors from `as any` | High | Medium | Use proper TypeScript types from SDK |
| Streaming not working | Medium | Medium | Reference WebLLM streaming implementation |
| UI config not persisted | Low | Medium | Verify storage pattern with existing providers |

---

## Acceptance Criteria

### Functional
- [ ] New `openai-compatible` endpoint type available in settings
- [ ] Can configure endpoint URL and API key
- [ ] Can select and use a model from the endpoint
- [ ] Streaming responses work (if supported by server)
- [ ] Error handling matches existing providers

### Technical
- [ ] TypeScript compiles without errors
- [ ] No lint warnings on new code
- [ ] Unit tests pass
- [ ] Build succeeds for both Chrome and Firefox

### Integration
- [ ] Existing providers (Ollama, LM Studio, WebLLM) still work
- [ ] Settings saved/loaded correctly
- [ ] RPC communication between background/sidepanel works

---

## Testing Strategy

### Unit Tests
- Test message conversion functions
- Test response parsing logic
- Mock external dependencies

### Integration Tests
- Test full model instantiation flow
- Test configuration persistence
- Mock OpenAI-compatible endpoint responses

### Manual Testing
- Create new endpoint configuration in settings
- Send test prompts to endpoint
- Verify error messages appear correctly

---

## Next Steps

1. **Review this plan** - Does the architecture match your expectations?
2. **Clarify any points** - Any missing details or assumptions?
3. **Approve implementation** - Shall I proceed with creating the files?

---

*Generated: 2026-04-17*
