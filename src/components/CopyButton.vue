<template>
  <button
    type="button"
    class="btn-copy"
    @click="handleCopy"
    :aria-label="`复制${label || '内容'}`"
    :title="copied ? '已复制' : '复制'"
  >
    <Icon :name="copied ? 'check' : 'check'" :size="14" />
  </button>
</template>

<script>
import Icon from './Icon.vue'

export default {
  name: 'CopyButton',
  components: {
    Icon
  },
  props: {
    text: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      copied: false
    }
  },
  methods: {
    handleCopy() {
      const textToCopy = this.text || '-'
      navigator.clipboard.writeText(textToCopy).then(() => {
        this.copied = true
        setTimeout(() => {
          this.copied = false
        }, 2000)
      }).catch(err => {
        console.error('复制失败:', err)
        // 降级方案
        const textArea = document.createElement('textarea')
        textArea.value = textToCopy
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand('copy')
          this.copied = true
          setTimeout(() => {
            this.copied = false
          }, 2000)
        } catch (err) {
          console.error('复制失败:', err)
          alert('复制失败，请手动复制')
        }
        document.body.removeChild(textArea)
      })
    }
  }
}
</script>

<style scoped>
.btn-copy {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  transition: var(--transition);
}

.btn-copy:hover {
  background-color: var(--color-bg);
  color: var(--color-primary);
}

.btn-copy:active {
  transform: scale(0.95);
}
</style>

