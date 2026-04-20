<template>
  <div
    class="flex items-center gap-1 px-1 py-1 min-h-6 rounded-sm cursor-pointer"
    :class="[
      isEnabled ? 'bg-bg-accent-green text-text-secondary' : 'text-text-placeholder',
    ]"
    @click="toggle"
  >
    <IconCamera
      class="w-4 h-4"
    />
    <span class="text-xs font-medium select-none">
      {{ t('chat.tools.vision.title') }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import IconCamera from '@/assets/icons/camera.svg?component'
import { useI18n } from '@/utils/i18n'
import { getUserConfig } from '@/utils/user-config'

const { t } = useI18n()

const userConfig = await getUserConfig()
const currentModel = userConfig.llm.model.toRef()
const endpointType = userConfig.llm.endpointType.toRef()
const visionConfig = userConfig.llm.backends.openaiCompatible.vision

const isEnabled = computed({
  get: () => {
    if (endpointType.value !== 'openai-compatible') return false
    return !!visionConfig.get()?.[currentModel.value ?? '']
  },
  set: (v: boolean) => {
    const modelId = currentModel.value
    if (!modelId) return
    const map = { ...visionConfig.get() }
    if (v) {
      map[modelId] = true
    }
    else {
      delete map[modelId]
    }
    visionConfig.set(map)
  },
})

const toggle = () => {
  isEnabled.value = !isEnabled.value
}
</script>
