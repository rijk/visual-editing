<template>
  <slot />
</template>

<script lang="ts" setup>
import {
  type DisableVisualEditing,
  enableVisualEditing,
} from '@sanity/visual-editing'

let disable: DisableVisualEditing
const router = useRouter()

onMounted(() => {
  disable = enableVisualEditing({
    history: {
      subscribe: (navigate) => {
        router.isReady().then(() => {
          navigate({ type: 'replace', url: router.currentRoute.value.fullPath })
        })
        return router.afterEach((to) => {
          // There is no mechanism to determine navigation type in a Vue Router navigation guard, so just push
          // https://github.com/vuejs/vue-router/issues/1620
          navigate({ type: 'push', url: to.fullPath })
        })
      },
      update: (update) => {
        if (update.type === 'push' || update.type === 'replace') {
          router[update.type](update.url)
        } else if (update.type === 'pop') {
          router.back()
        }
      },
    },
  })
})
onUnmounted(() => disable())
</script>
