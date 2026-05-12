<template>
  <Modal
    :visible="internalVisible"
    :title="title"
    size="small"
    :close-on-click-overlay="false"
    @update:visible="handleUpdateVisible"
    @close="handleClose"
  >
    <div class="confirm-content">
      <Icon :name="iconName" :size="24" :class="['confirm-icon', `confirm-icon-${type}`]" />
      <p class="confirm-message">{{ message }}</p>
    </div>

    <template #footer>
      <button
        v-if="showCancel"
        class="btn btn-secondary"
        @click="handleCancel"
        aria-label="取消"
      >
        <span>{{ cancelText }}</span>
      </button>
      <button
        class="btn"
        :class="[`btn-${confirmButtonType}`]"
        @click="handleConfirm"
        aria-label="确认"
      >
        <span>{{ confirmText }}</span>
      </button>
    </template>
  </Modal>
</template>

<script>
import Modal from './Modal.vue'
import Icon from './Icon.vue'

export default {
  name: 'Confirm',
  components: {
    Modal,
    Icon
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: '确认'
    },
    message: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'info',
      validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
    },
    confirmText: {
      type: String,
      default: '确定'
    },
    cancelText: {
      type: String,
      default: '取消'
    },
    showCancel: {
      type: Boolean,
      default: true
    }
  },
  emits: ['update:visible', 'close', 'confirm', 'cancel'],
  data() {
    return {
      internalVisible: this.visible
    }
  },
  watch: {
    visible(newVal) {
      this.internalVisible = newVal
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
    },
    confirmButtonType() {
      const typeMap = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'primary'
      }
      return typeMap[this.type] || 'primary'
    }
  },
  methods: {
    handleConfirm() {
      // 立即隐藏弹窗
      this.internalVisible = false
      this.$emit('update:visible', false)
      // 然后触发确认事件
      this.$emit('confirm')
    },
    handleCancel() {
      // 立即隐藏弹窗
      this.internalVisible = false
      this.$emit('update:visible', false)
      // 然后触发取消事件
      this.$emit('cancel')
    },
    handleUpdateVisible(value) {
      this.internalVisible = value
      this.$emit('update:visible', value)
    },
    handleClose() {
      this.internalVisible = false
      this.$emit('update:visible', false)
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.confirm-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg) 0;
  text-align: center;
}

.confirm-icon {
  flex-shrink: 0;
}

.confirm-icon-success {
  color: var(--color-success);
}

.confirm-icon-error {
  color: var(--color-error);
}

.confirm-icon-warning {
  color: var(--color-warning);
}

.confirm-icon-info {
  color: var(--color-info);
}

.confirm-message {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  line-height: 1.6;
  word-break: break-word;
}
</style>

