<template>
  <section class="release-panel">
    <div class="release-heading">
      <h3>
        {{ featureResource ? '子渠道功能发布管理' : '后端发布管理' }}
        <small>SQLite · 服务端生效版本</small>
      </h3>
      <label v-if="demoSession && !readOnly"
        >本地演示身份
        <select v-model="role" :disabled="busy" @change="switchRole">
          <option value="editor">运营</option>
          <option value="reviewer">独立审批人</option>
          <option value="emergency">应急管理员</option>
          <option value="viewer">只读</option>
        </select></label
      ><span v-else>当前身份：{{ role }}</span>
    </div>
    <p>
      {{ demoSession ? '身份切换仅用于本地联调，不是正式登录。' : ''
      }}{{
        featureResource
          ? '此处仅发布当前子渠道的功能规则，不更改收银台模版的支付方式。'
          : '当前配置按业务支付方式共享，同一 CARD 的多渠道不重复分桶。'
      }}
    </p>
    <p v-if="!templateId">首次保存服务端草稿后，可提交审核与发布。</p>
    <template v-else-if="state">
      <div class="version-line">
        草稿 r{{ state.draftRevision }}
        <span
          >生效 v{{ state.revision
          }}{{ state.revision ? '' : '（尚未发布）' }}</span
        ><span>应急代次 {{ state.emergencyEpoch }}</span
        ><button class="btn btn-text" :disabled="busy" @click="load">
          刷新服务端状态
        </button>
      </div>
      <p v-if="dirty" class="release-warning">
        表单还有未保存内容，请先保存服务端草稿。发布只使用已保存快照。
      </p>
      <div v-if="state.pending" class="pending-review">
        <strong>等待独立审核</strong>
        <p>{{ state.pending.submitter }} · {{ state.pending.reason }}</p>
        <p>
          快照：r{{ state.pending.draftRevision }}，基于 v{{
            state.pending.baseRevision
          }}
        </p>
      </div>
      <details>
        <summary>本次差异（{{ changes.length }} 项）</summary>
        <ul>
          <li v-for="change in changes" :key="change">{{ change }}</li>
        </ul>
      </details>
      <label v-if="!readOnly && role !== 'viewer'" class="release-reason"
        >操作原因
        <input
          v-model="reason"
          placeholder="提交、审核、回滚、应急操作均需填写原因"
          maxlength="500"
      /></label>
      <div v-if="!readOnly" class="release-actions">
        <button
          v-if="role === 'editor' && !state.pending"
          class="btn btn-primary"
          :disabled="busy || dirty || !changes.length"
          @click="act('submit')"
        >
          提交发布审核
        </button>
        <button
          v-if="role === 'editor' && state.pending"
          class="btn btn-secondary"
          :disabled="busy"
          @click="act('withdraw')"
        >
          撤回审核
        </button>
        <button
          v-if="role === 'reviewer' && state.pending"
          class="btn btn-primary"
          :disabled="busy"
          @click="act('approve')"
        >
          审核通过并发布
        </button>
        <button
          v-if="role === 'reviewer' && state.pending"
          class="btn btn-secondary"
          :disabled="busy"
          @click="act('reject')"
        >
          驳回
        </button>
      </div>
      <details class="release-history">
        <summary>历史版本、回滚与应急</summary>
        <div v-if="!readOnly && role === 'reviewer'" class="release-controls">
          <label
            >回滚版本
            <select v-model.number="targetRevision">
              <option :value="0">请选择版本</option>
              <option
                v-for="v in versions"
                :key="v.revision"
                :value="v.revision"
              >
                v{{ v.revision }} · {{ v.createdAt }}
              </option>
            </select></label
          ><button
            class="btn btn-secondary"
            :disabled="busy || !targetRevision || !!state.pending || dirty"
            @click="act('rollback')"
          >
            回滚为新版本
          </button>
        </div>
        <div v-if="!readOnly && role === 'emergency'" class="release-controls">
          <label
            >{{ featureResource ? '子渠道功能' : '业务支付方式' }}
            <select v-model="methodId">
              <option v-for="id in methodIds" :key="id" :value="id">
                {{ featureResource ? featureLabels[id] || id : id }}
              </option>
            </select></label
          ><button
            class="btn btn-secondary"
            :disabled="busy || !methodId"
            @click="act('kill')"
          >
            紧急停用</button
          ><button
            class="btn btn-secondary"
            :disabled="busy || !selectedEmergencyStopped"
            @click="act('resume')"
          >
            显式恢复
          </button>
        </div>
        <p>
          当前应急覆盖：{{
            emergencyLabels.join('、') || '无'
          }}。回滚不会解除覆盖。
        </p>
        <ol class="audit-list">
          <li v-for="(event, index) in audit.slice(0, 6)" :key="index">
            {{ event.action }} · {{ event.actor }} · v{{ event.revision }} ·
            {{ event.reason || event.note }}
          </li>
        </ol>
      </details>
    </template>
    <p v-if="error" class="release-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="release-success" role="status">{{ notice }}</p>
  </section>
</template>

<script>
import {
  backendSession,
  rolloutRequest,
  switchBackendRole,
} from '@/api/rolloutBackend.js'
import { subchannelFeatureCatalog } from '@/utils/subchannelRollout.js'
const labels = {
  submit: '已提交独立审核，生效版本未变化',
  approve: '审核通过，服务端生效版本已更新',
  reject: '已驳回，生效版本未变化',
  withdraw: '已撤回',
  rollback: '已回滚为新版本，应急覆盖保持',
  kill: '已紧急停用，待审快照已失效',
  resume: '已清除应急覆盖，机构资格仍需校验',
}
export default {
  props: {
    templateId: String,
    resourcePath: String,
    featureResource: Boolean,
    dirty: Boolean,
    refreshKey: Number,
    readOnly: Boolean,
  },
  emits: ['state', 'role'],
  data() {
    return {
      state: null,
      versions: [],
      audit: [],
      role: 'editor',
      demoSession: false,
      reason: '',
      methodId: '',
      targetRevision: 0,
      busy: false,
      error: '',
      notice: '',
    }
  },
  computed: {
    selectedEmergencyStopped() {
      const keys =
        this.featureResource && this.methodId === 'card_save'
          ? ['card_save', 'card_reuse']
          : [this.methodId]
      return keys.some((key) => this.state?.kills?.[key])
    },
    featureLabels() {
      return Object.fromEntries(
        Object.entries(subchannelFeatureCatalog).map(([key, feature]) => [
          key,
          feature.name,
        ]),
      )
    },
    emergencyLabels() {
      const ids = [
        ...new Set(
          Object.keys(this.state?.kills || {}).map((id) =>
            this.featureResource && id === 'card_reuse' ? 'card_save' : id,
          ),
        ),
      ]
      return ids.map((id) =>
        this.featureResource ? this.featureLabels[id] || id : id,
      )
    },
    basePath() {
      return this.resourcePath || `/templates/${this.templateId}`
    },
    methodIds() {
      return [
        ...new Set([
          ...Object.keys(this.state?.draft.rules || {}),
          ...Object.keys(this.state?.published?.rules || {}),
        ]),
      ].filter((id) => !this.featureResource || id !== 'card_reuse')
    },
    changes() {
      if (!this.state) return []
      const before = this.state.published,
        after = this.state.draft,
        changes = []
      for (const id of new Set([
        ...Object.keys(before?.rules || {}),
        ...Object.keys(after.rules),
      ])) {
        const a = before?.rules[id],
          b = after.rules[id]
        if (JSON.stringify(a) !== JSON.stringify(b))
          changes.push(
            `${id}：${a ? `${a.mode} ${a.percentage}%` : '未配置'} → ${b ? `${b.mode} ${b.percentage}%` : '移除'}（包括人群条件 / 名单变更）`,
          )
      }
      for (const key of [
        'cashier_template_name',
        'currency',
        'enabled',
        'is_simulator',
        'is_web_cashier',
        'payment_methods',
      ])
        if (JSON.stringify(before?.[key]) !== JSON.stringify(after[key]))
          changes.push(`模版 ${key} 已变更`)
      return changes
    },
  },
  watch: {
    templateId: {
      immediate: true,
      handler() {
        this.load()
      },
    },
    refreshKey() {
      this.load()
    },
    resourcePath() {
      this.load()
    },
  },
  methods: {
    async load() {
      this.error = ''
      try {
        const session = await backendSession()
        this.role = session.role
        this.demoSession = session.demo
        this.$emit('role', session.role)
        if (!this.templateId) return
        const id = this.templateId,
          path = this.basePath
        const [state, versions, audit] = await Promise.all([
          rolloutRequest(path),
          rolloutRequest(`${path}/versions`),
          rolloutRequest(`${path}/audit`),
        ])
        if (id !== this.templateId || path !== this.basePath) return
        this.state = state.data
        this.versions = versions.data
        this.audit = audit.data
        if (!this.methodIds.includes(this.methodId))
          this.methodId = this.methodIds[0] || ''
        this.$emit('state', this.state)
      } catch (e) {
        this.error = e.message
      }
    },
    async switchRole() {
      if (this.readOnly) return
      this.busy = true
      this.error = ''
      try {
        await switchBackendRole(this.role)
        await this.load()
      } catch (e) {
        this.error = e.message
      } finally {
        this.busy = false
      }
    },
    async act(action) {
      if (!this.state || this.busy || this.readOnly) return
      this.busy = true
      this.error = ''
      this.notice = ''
      try {
        const body = {
          reason: this.reason,
          draftRevision: this.state.draftRevision,
          baseDraftRevision: this.state.draftRevision,
          baseRevision: this.state.revision,
          pendingId: this.state.pending?.id,
          targetRevision: this.targetRevision,
          emergencyEpoch: this.state.emergencyEpoch,
          methodIds: [this.methodId],
        }
        await rolloutRequest(`${this.basePath}/${action}`, {
          method: 'POST',
          body,
        })
        this.notice = labels[action]
        this.reason = ''
        await this.load()
      } catch (e) {
        this.error = `${e.message}（${e.code || 'NETWORK_ERROR'}）`
      } finally {
        this.busy = false
      }
    },
  },
}
</script>

<style scoped>
.release-panel {
  border: 1px solid #d8e3fc;
  background: #f8faff;
  border-radius: 8px;
  padding: 16px;
  margin-top: 18px;
  color: #344054;
  font-size: 13px;
}
.release-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
h3 {
  margin: 0;
  font-size: 15px;
}
h3 small {
  font-weight: 400;
  font-size: 11px;
  color: #667085;
}
p {
  line-height: 1.7;
  margin: 8px 0;
}
.version-line,
.release-actions,
.release-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin: 10px 0;
}
input,
select {
  padding: 8px;
  border: 1px solid #cdd5e0;
  border-radius: 5px;
  font: inherit;
  min-width: 0;
  background: white;
  color: #344054;
}
.release-reason {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 14px 0;
}
.release-reason input {
  flex: 1;
}
summary {
  cursor: pointer;
  padding: 8px 0;
}
.pending-review {
  padding: 10px;
  background: #fff6e7;
  border-radius: 5px;
}
.release-warning,
.release-error {
  color: #ad4727;
}
.release-success {
  color: #168259;
}
.audit-list {
  padding-left: 18px;
  line-height: 1.8;
  color: #667085;
}
@media (max-width: 640px) {
  .release-reason {
    align-items: stretch;
    flex-direction: column;
  }
  .release-controls label {
    display: grid;
    gap: 6px;
    max-width: 100%;
  }
  .release-heading {
    align-items: start;
    flex-direction: column;
  }
}
</style>
