<script setup lang="ts">
import { useCountdown } from '@vueuse/core'
import { computed, onMounted, ref, watch } from 'vue'

import IconOpenAICompatibleLogo from '@/assets/icons/logo-openai-compatible.svg?component'
import Checkbox from '@/components/Checkbox.vue'
import Input from '@/components/Input.vue'
import Loading from '@/components/Loading.vue'
import ScrollTarget from '@/components/ScrollTarget.vue'
import Selector from '@/components/Selector.vue'
import Button from '@/components/ui/Button.vue'
import Text from '@/components/ui/Text.vue'
import WarningMessage from '@/components/WarningMessage.vue'
import { useLogger } from '@/composables/useLogger'
import { useValueGuard } from '@/composables/useValueGuard'
import { SettingsScrollTarget } from '@/types/scroll-targets'
import { MIN_CONTEXT_WINDOW_SIZE } from '@/utils/constants'
import { useI18n } from '@/utils/i18n'
import { useLLMBackendStatusStore } from '@/utils/pinia-store/store'
import { getUserConfig } from '@/utils/user-config'

import Block from '../../Block.vue'
import SavedMessage from '../../SavedMessage.vue'
import Section from '../../Section.vue'

defineProps<{
  scrollTarget?: SettingsScrollTarget
}>()

const logger = useLogger()
const { t } = useI18n()
const llmBackendStatusStore = useLLMBackendStatusStore()
const userConfig = await getUserConfig()
const baseUrl = userConfig.llm.backends.openaiCompatible.baseUrl.toRef()
const apiKey = userConfig.llm.backends.openaiCompatible.apiKey.toRef()
const endpointType = userConfig.llm.endpointType.toRef()
const modelName = computed({
  get: () => userConfig.llm.model.get() ?? '',
  set: (v: string) => userConfig.llm.model.set(v),
})
const open = userConfig.settings.blocks.openaiCompatibleConfig.open.toRef()
const loading = ref(false)
const modelsLoading = ref(false)

const modelOptions = computed(() => {
  const models = llmBackendStatusStore.openaiCompatibleModelList
  return models.map(m => ({ id: m.id, label: m.id }))
})

// Use ref instead of computed to prevent Selector's internal watch from resetting
// the selection when modelOptions array reference changes after refreshModels()
const selectedModelId = ref<string | undefined>(userConfig.llm.model.get() || undefined)

// Sync userConfig → selectedModelId (external changes, e.g. load from storage)
watch(modelName, (newVal) => {
  const next = newVal || undefined
  if (next !== selectedModelId.value) {
    selectedModelId.value = next
  }
})

// When modelOptions updates, preserve current selection if it exists in new options;
// otherwise keep selectedModelId as-is (don't auto-select first item)
watch(modelOptions, (newOptions) => {
  if (selectedModelId.value) {
    const exists = newOptions.some(o => o.id === selectedModelId.value)
    if (!exists && newOptions.length > 0) {
      // Current model not in new list — keep value so user can see it's missing,
      // but don't auto-overwrite. Only reset if options list is empty.
    }
  }
})

// Sync selectedModelId → userConfig (user selection via Selector)
// Also set endpointType to 'openai-compatible' when user selects a model here,
// otherwise the chat would still try to use the previous backend (e.g. ollama)
watch(selectedModelId, (newVal) => {
  if (newVal !== undefined && newVal !== modelName.value) {
    modelName.value = newVal
    endpointType.value = 'openai-compatible'
  }
})

const { value: numCtx, guardedValue: guardedNumCtx, errorMessage: numCtxError } = useValueGuard(userConfig.llm.backends.openaiCompatible.numCtx.toRef(), (value) => {
  return {
    isValid: value >= MIN_CONTEXT_WINDOW_SIZE,
    errorMessage: t('settings.ollama.context_window_size_error', { min: MIN_CONTEXT_WINDOW_SIZE }),
  }
})
const enableNumCtx = userConfig.llm.backends.openaiCompatible.enableNumCtx.toRef()

const setupOpenAICompatible = async () => {
  endpointType.value = 'openai-compatible'
  // For openai-compatible, we just verify the connection
  const success = await llmBackendStatusStore.updateOpenAICompatibleConnectionStatus()
  if (success) {
    stopCheckConnection()
  }
}

const testConnection = async () => {
  loading.value = true
  try {
    const success = await llmBackendStatusStore.updateOpenAICompatibleConnectionStatus()
    if (success) {
      await refreshModels()
    }
    return success
  }
  catch (error) {
    logger.error('Error testing connection:', error)
    return false
  }
  finally {
    loading.value = false
  }
}

const refreshModels = async () => {
  modelsLoading.value = true
  try {
    await llmBackendStatusStore.updateOpenAICompatibleModelList()
  }
  finally {
    modelsLoading.value = false
  }
}

const reScanOpenAICompatible = async () => {
  const success = await llmBackendStatusStore.updateOpenAICompatibleConnectionStatus()
  logger.info('OpenAI-Compatible connection test result:', success)
  if (success && endpointType.value === 'web-llm') {
    endpointType.value = 'openai-compatible'
    stopCheckConnection()
  }
}

watch(baseUrl, (newValue) => {
  try {
    const url = new URL(newValue)
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    if (!isLocalhost) {
      userConfig.llm.backends.openaiCompatible.numCtx.resetDefault()
      userConfig.llm.backends.openaiCompatible.enableNumCtx.set(true)
    }
  }
  catch {
    // avoid error when baseUrl is not a valid url
  }
})

const { start: startCheckConnection, stop: stopCheckConnection, remaining: checkSignal } = useCountdown(600, { interval: 2000 })

watch(checkSignal, (val) => {
  if (val) reScanOpenAICompatible()
})

onMounted(async () => {
  testConnection()
})
</script>

<template>
  <Block
    v-model:open="open"
    :title="t('settings.providers.openai_compatible.title')"
    collapsible
  >
    <template #title>
      <div class="flex items-center gap-3">
        <div class="size-6 rounded-md flex items-center justify-center overflow-hidden shadow-02">
          <IconOpenAICompatibleLogo class="size-6" />
        </div>
        <span class="font-medium text-base">
          {{ t('settings.providers.openai_compatible.title') }}
        </span>
      </div>
    </template>
    <div class="flex flex-col gap-4">
      <Section v-if="endpointType === 'web-llm'">
        <span class="block mt-2">
          <Text
            color="secondary"
            size="xs"
            class="leading-4"
          >
            {{ t('settings.webllm_desc_openai_compatible') }}
          </Text>
        </span>
      </Section>
      <Section>
        <div class="flex flex-col gap-6 items-stretch">
          <ScrollTarget
            v-if="endpointType !== 'web-llm'"
            :autoScrollIntoView="scrollTarget === 'openai-compatible-server-address-section'"
            showHighlight
            class="w-full"
          >
            <Section
              :title="t('settings.openai_compatible.server_address')"
              class="w-full"
            >
              <div class="flex flex-col gap-1">
                <div class="flex gap-3 items-stretch">
                  <Input
                    v-model="baseUrl"
                    class="rounded-md py-2 px-4 grow"
                    wrapperClass="w-full"
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
                <Text
                  color="secondary"
                  size="xs"
                  display="block"
                >
                  {{ t('settings.openai_compatible.server_address_desc') }}
                </Text>
                <SavedMessage :watch="baseUrl" />
              </div>
            </Section>
          </ScrollTarget>
          <Section
            v-if="endpointType !== 'web-llm'"
            class="w-full"
          >
            <template #title>
              <Text
                class="font-medium text-sm"
                display="block"
              >
                {{ t('settings.openai_compatible.api_key') }}
              </Text>
            </template>
            <div class="flex flex-col gap-1">
              <div class="flex gap-3 items-stretch">
                <Input
                  v-model="apiKey"
                  type="password"
                  class="rounded-md py-2 px-4 grow"
                  wrapperClass="w-full"
                  placeholder="sk-..."
                />
              </div>
              <Text
                color="secondary"
                size="xs"
                display="block"
              >
                {{ t('settings.openai_compatible.api_key_desc') }}
              </Text>
              <SavedMessage :watch="apiKey" />
            </div>
          </Section>
          <Section
            v-if="endpointType !== 'web-llm'"
            class="w-full"
          >
            <template #title>
              <div class="flex items-center justify-between">
                <Text
                  class="font-medium text-sm"
                  display="block"
                >
                  {{ t('settings.openai_compatible.model_name') }}
                </Text>
                <Button
                  variant="secondary"
                  class="text-xs px-2 py-1"
                  :disabled="modelsLoading || !baseUrl"
                  @click="refreshModels"
                >
                  <Loading v-if="modelsLoading" :size="10" />
                  <span v-else>{{ t('settings.general.refresh_status') }}</span>
                </Button>
              </div>
            </template>
            <div class="flex flex-col gap-2">
              <Selector
                v-if="modelOptions.length > 0"
                v-model="selectedModelId"
                :options="modelOptions"
                :placeholder="t('settings.openai_compatible.model_name')"
                dropdownAlign="stretch"
                class="w-full"
              />
              <Input
                v-else
                v-model="modelName"
                class="rounded-md py-2 px-4 grow"
                wrapperClass="w-full"
                placeholder="gpt-4o-mini"
              />
              <Text
                v-if="modelOptions.length === 0 && baseUrl"
                color="tertiary"
                size="xs"
                display="block"
              >
                {{ t('settings.openai_compatible.model_name_refresh_hint') }}
              </Text>
              <Text
                color="secondary"
                size="xs"
                display="block"
              >
                {{ t('settings.openai_compatible.model_name_desc') }}
              </Text>
              <SavedMessage :watch="modelName" />
            </div>
          </Section>
          <Section
            v-if="endpointType !== 'web-llm'"
            class="w-full"
          >
            <template #title>
              <div class="flex justify-between">
                <Text
                  class="font-medium text-sm"
                  display="block"
                >
                  {{ t('settings.ollama.context_window_size') }}
                </Text>
                <div class="flex gap-2 items-center">
                  <Checkbox v-model="enableNumCtx">
                    <template #label>
                      <Text
                        class="font-medium text-xs"
                        display="block"
                      >
                        {{ t('settings.ollama.custom_context_window_size') }}
                      </Text>
                    </template>
                  </Checkbox>
                </div>
              </div>
            </template>
            <div class="flex flex-col gap-1">
              <div class="flex gap-3 items-stretch">
                <Input
                  v-model="numCtx"
                  min="512"
                  :error="!!numCtxError"
                  type="number"
                  :disabled="!enableNumCtx"
                  class="rounded-md py-2 px-4 grow"
                  wrapperClass="w-full"
                />
              </div>
              <div>
                <Text
                  color="secondary"
                  size="xs"
                  display="block"
                >
                  {{ t('settings.ollama.context_window_size_desc') }}
                </Text>
                <SavedMessage
                  v-if="!numCtxError"
                  :watch="[guardedNumCtx, enableNumCtx]"
                />
              </div>
              <WarningMessage
                v-if="numCtxError"
                class="text-xs"
                :message="numCtxError"
              />
            </div>
          </Section>
          <Text
            v-if="endpointType === 'web-llm'"
            display="block"
            color="secondary"
            size="xs"
            class="font-normal leading-4"
          >
            <div class="flex gap-1">
              <span>{{ t('settings.providers.openai_compatible.already_installed') }}</span>
              <button
                class="whitespace-nowrap hover:text-text-primary text-text-link cursor-pointer"
                @click="setupOpenAICompatible"
              >
                {{ t('settings.ollama.setup') }}
              </button>
            </div>
          </Text>
          <div>
            <div class="flex items-center justify-center flex-wrap gap-2 w-full font-medium">
              <Button
                variant="secondary"
                class="flex items-center justify-center min-h-8 min-w-40 py-1"
                @click="testConnection"
              >
                <Loading
                  v-if="loading"
                  :size="12"
                />
                <span v-else>
                  {{ t('settings.general.refresh_status') }}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </div>
  </Block>
</template>
