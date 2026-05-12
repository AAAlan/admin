<template>
  <div class="page-container">
    <div v-if="mode === 'page'" class="page-header">
      <h1 class="page-title">{{ isEdit ? '编辑游戏应用' : '创建游戏应用' }}</h1>
      <router-link
        to="/apps"
        class="btn btn-text"
        aria-label="返回游戏应用列表"
      >
        <Icon name="arrowLeft" :size="16" />
        <span>返回</span>
      </router-link>
    </div>

    <div class="page-content">
      <form @submit.prevent="handleSubmit" class="form-container">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">基础信息</h2>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label for="sdk-app-id" class="form-label">
                Game id<span class="required">*</span>
              </label>
              <div class="form-hint">
                游戏应用的唯一标识（Game id），例如：Silver
              </div>
              <input
                id="sdk-app-id"
                v-model="formData.sdk_app_id"
                type="text"
                class="input"
                placeholder="例如：Silver"
                required
                aria-required="true"
              />
            </div>

            <div class="form-group">
              <label for="game-name" class="form-label">
                游戏名<span class="required">*</span>
              </label>
              <input
                id="game-name"
                v-model="formData.game_name"
                type="text"
                class="input"
                placeholder="例如：Silver"
                :disabled="isEdit"
                required
                aria-required="true"
              />
            </div>

            <div class="form-group">
              <label class="form-label">开通状态</label>
              <div class="switch-group">
                <label class="switch">
                  <input
                    type="checkbox"
                    v-model="formData.pay_switch"
                    aria-label="开通/关闭"
                  />
                  <span class="switch-slider"></span>
                </label>
                <span class="switch-label">
                  {{ formData.pay_switch ? '已开通' : '已关闭' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="form-footer">
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="submitting || !isFormValid"
            aria-label="保存"
          >
            <Icon v-if="!submitting" name="check" :size="16" />
            <span>{{ submitting ? '保存中...' : '保存' }}</span>
          </button>
          <router-link
            v-if="mode === 'page'"
            to="/apps"
            class="btn btn-secondary"
            aria-label="取消"
          >
            <span>取消</span>
          </router-link>
          <button
            v-else
            type="button"
            class="btn btn-secondary"
            @click="handleCancel"
            aria-label="取消"
          >
            <span>取消</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { appAPI } from '@/api'
import Icon from '@/components/Icon.vue'

export default {
  name: 'GameAppEdit',
  components: {
    Icon
  },
  props: {
    mode: {
      type: String,
      default: 'page'
    },
    prefill: {
      type: Object,
      default: null
    }
  },
  emits: ['cancel', 'saved'],
  data() {
    return {
      submitting: false,
      entityId: '',
      formData: {
        sdk_app_id: 'Silver',
        game_name: '',
        pay_switch: true
      }
    }
  },
  computed: {
    isEdit() {
      return !!this.entityId
    },
    isFormValid() {
      return this.formData.sdk_app_id && this.formData.game_name
    }
  },
  async mounted() {
    const routeId = this.$route.params.id
    if (this.mode !== 'page') {
      this.entityId = this.prefill?.id || ''
    } else if (routeId) {
      this.entityId = decodeURIComponent(routeId)
    }

    if (this.isEdit) {
      await this.fetchDetail()
    }
  },
  methods: {
    async fetchDetail() {
      try {
        const res = await appAPI.getAppDetail(this.entityId)
        if (res.code === 200 && res.data) {
          this.formData = {
            sdk_app_id: res.data.sdk_app_id || 'Silver',
            game_name: res.data.game_name || '',
            pay_switch: res.data.pay_switch !== false
          }
        } else {
          this.$message.error('应用不存在')
          if (this.mode !== 'page') {
            this.$emit('cancel')
          } else {
            this.$router.push('/apps')
          }
        }
      } catch (err) {
        console.error(err)
        this.$message.error('获取应用信息失败')
        if (this.mode !== 'page') {
          this.$emit('cancel')
        } else {
          this.$router.push('/apps')
        }
      }
    },
    async handleSubmit() {
      if (this.submitting || !this.isFormValid) return

      try {
        await this.$confirm.confirmStatusChange()
      } catch {
        return
      }

      this.submitting = true
      try {
        let res
        if (this.isEdit) {
          res = await appAPI.updateApp(this.entityId, this.formData)
        } else {
          res = await appAPI.createApp(this.formData)
        }
        if (res.code === 200) {
          this.$message.success('保存成功')
          if (this.mode !== 'page') {
            this.$emit('saved')
            this.$emit('cancel')
          } else {
            this.$router.push('/apps')
          }
        } else {
          this.$message.error(res.message || '保存失败')
        }
      } catch (err) {
        console.error(err)
        this.$message.error('保存失败，请稍后重试')
      } finally {
        this.submitting = false
      }
    },
    handleCancel() {
      if (this.mode !== 'page') {
        this.$emit('cancel')
      } else {
        this.$router.push('/apps')
      }
    }
  }
}
</script>

<style scoped>
.page-container {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-black);
  margin: 0;
}

.page-content {
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--spacing-xl);
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
}

.card-header {
  padding: var(--spacing-lg);
  background-color: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}

.card-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin: 0;
}

.card-body {
  padding: var(--spacing-lg);
}

.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.form-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.required {
  color: var(--color-error);
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--color-border);
}

.switch-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #d9d9d9;
  transition: var(--transition);
  border-radius: 24px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06) inset;
}

.switch-slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: #ffffff;
  transition: var(--transition);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.switch input:checked + .switch-slider {
  background-color: var(--color-primary);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04) inset;
}

.switch input:checked + .switch-slider:before {
  transform: translateX(20px);
}

.switch-label {
  color: var(--color-text);
  font-size: var(--font-size-base);
}

.mono-text {
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: var(--font-size-xs);
}
</style>

