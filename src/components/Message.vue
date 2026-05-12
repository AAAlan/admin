<template>
  <Teleport to="body">
    <Transition name="message" @after-leave="onAfterLeave">
      <div
        v-if="localVisible"
        class="message-container"
        :class="[`message-${type}`]"
        role="alert"
        :aria-live="type === 'error' ? 'assertive' : 'polite'"
      >
        <div class="message-content">
          <Icon :name="iconName" :size="20" class="message-icon" />
          <span class="message-text">{{ content }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import Icon from './Icon.vue'

export default {
  name: 'Message',
  components: {
    Icon
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    content: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'info',
      validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
    },
    duration: {
      type: Number,
      default: 3000
    }
  },
  emits: ['update:visible', 'close'],
  data() {
    return {
      localVisible: true,
      autoCloseTimer: null
    }
  },
  computed: {
    iconName() {
      const iconMap = {
        success: 'check',
        error: 'close',
        warning: 'eye',
        info: 'eye'
      }
      return iconMap[this.type] || 'eye'
    }
  },
  watch: {
    visible(newVal) {
      this.localVisible = newVal
      if (newVal && this.duration > 0) {
        this.scheduleAutoClose()
      } else if (this.autoCloseTimer) {
        clearTimeout(this.autoCloseTimer)
        this.autoCloseTimer = null
      }
    }
  },
  mounted() {
    this.localVisible = this.visible
    this.scheduleAutoClose()
  },
  beforeUnmount() {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer)
    }
  },
  methods: {
    scheduleAutoClose() {
      if (this.autoCloseTimer) {
        clearTimeout(this.autoCloseTimer)
        this.autoCloseTimer = null
      }
      if (this.localVisible && this.duration > 0) {
        this.autoCloseTimer = setTimeout(() => {
          this.handleClose()
        }, this.duration)
      }
    },
    handleClose() {
      if (this.autoCloseTimer) {
        clearTimeout(this.autoCloseTimer)
        this.autoCloseTimer = null
      }
      this.localVisible = false
      this.$emit('update:visible', false)
    },
    onAfterLeave() {
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.message-container {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  min-width: 300px;
  max-width: 500px;
  padding: var(--spacing-md) var(--spacing-lg);
  background-color: var(--color-bg-container);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  border: 1px solid;
}

.message-success {
  border-color: var(--color-success);
  background-color: #f6ffed;
}

.message-error {
  border-color: var(--color-error);
  background-color: #fff2f0;
}

.message-warning {
  border-color: var(--color-warning);
  background-color: #fffbe6;
}

.message-info {
  border-color: var(--color-info);
  background-color: #e6f4ff;
}

.message-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.message-icon {
  flex-shrink: 0;
}

.message-success .message-icon {
  color: var(--color-success);
}

.message-error .message-icon {
  color: var(--color-error);
}

.message-warning .message-icon {
  color: var(--color-warning);
}

.message-info .message-icon {
  color: var(--color-info);
}

.message-text {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  line-height: 1.5;
}

/* 过渡动画 */
.message-enter-active {
  transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}

.message-leave-active {
  transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
}

.message-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.message-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>

