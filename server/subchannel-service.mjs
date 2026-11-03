import { createHash } from 'node:crypto'
import { RolloutService, fail } from './service.mjs'
import { ruleIsNarrowing } from '../src/utils/businessPaymentRollout.js'
import {
  subchannelFeatureKeys,
  closedFeatureRule,
  canonicalFeatureRules,
  evaluateSubchannelFeatures,
} from '../src/utils/subchannelRollout.js'

export const featureResourceId = (channelId, subchannelId) =>
  `feature_${createHash('sha256')
    .update(JSON.stringify([channelId, String(subchannelId)]))
    .digest('hex')
    .slice(0, 32)}`

export class SubchannelRolloutService extends RolloutService {
  constructor(
    store,
    {
      subchannelReader = () => null,
      featureCapabilityReader = () => false,
      now,
    } = {},
  ) {
    super(store, { resourceNamespace: 'subchannel-features', now })
    this.subchannelReader = subchannelReader
    this.featureCapabilityReader = featureCapabilityReader
  }
  resource(actor, channelId, subchannelId) {
    const resource = this.subchannelReader(
      actor.scope,
      channelId,
      String(subchannelId),
    )
    if (
      !resource ||
      resource.channel_id !== channelId ||
      String(resource.subchannel_id) !== String(subchannelId)
    )
      fail(404, 'SUBCHANNEL_NOT_FOUND', '子渠道不存在或不属于当前授权渠道')
    if (!subchannelFeatureKeys(resource.business_method_id).length)
      fail(
        422,
        'FEATURE_UNSUPPORTED',
        '该子渠道暂未接入免密或卡保存产品，不自动推导机构能力',
      )
    return resource
  }
  newId(actor, input) {
    const d = input.document || {}
    this.resource(actor, d.channel_id, d.subchannel_id)
    return featureResourceId(d.channel_id, d.subchannel_id)
  }
  document(input, actor, id) {
    const resource = this.resource(
      actor,
      input?.channel_id,
      input?.subchannel_id,
    )
    if (featureResourceId(resource.channel_id, resource.subchannel_id) !== id)
      fail(422, 'RESOURCE_MISMATCH', '不能修改规则所属渠道或子渠道')
    try {
      return {
        resource_type: 'subchannel-features',
        channel_id: resource.channel_id,
        subchannel_id: String(resource.subchannel_id),
        business_method_id: resource.business_method_id,
        name: resource.name,
        rules: canonicalFeatureRules(
          input.rules,
          subchannelFeatureKeys(resource.business_method_id),
          actor.scope.region,
        ),
      }
    } catch (e) {
      fail(422, 'INVALID_CONFIG', e.message)
    }
  }
  read(actor, channelId, subchannelId) {
    this.requireRole(actor, ['editor', 'reviewer', 'viewer', 'emergency'])
    const resource = this.resource(actor, channelId, subchannelId),
      id = featureResourceId(channelId, subchannelId)
    return (
      this.store.get(this.key(actor), id) || {
        template_id: id,
        draftRevision: 0,
        revision: 0,
        published: null,
        pending: null,
        kills: {},
        emergencyEpoch: 0,
        draft: this.document(
          {
            ...resource,
            rules: Object.fromEntries(
              subchannelFeatureKeys(resource.business_method_id).map((key) => [
                key,
                closedFeatureRule(),
              ]),
            ),
          },
          actor,
          id,
        ),
      }
    )
  }
  checkReadiness(actor, before, after) {
    const resource = this.resource(actor, after.channel_id, after.subchannel_id)
    for (const [key, rule] of Object.entries(after.rules)) {
      if (
        rule.mode === 'off' ||
        (rule.mode === 'gradual' && rule.percentage === 0 && !rule.allow) ||
        ruleIsNarrowing(before?.rules[key], rule)
      )
        continue
      if (
        resource.channel_enabled !== true ||
        resource.enabled !== true ||
        this.featureCapabilityReader(actor.scope, resource, key) !== true
      )
        fail(
          422,
          'CAPABILITY_NOT_READY',
          '渠道 / 子渠道未启用，或该免密、保存产品尚未就绪，不能新增或扩量',
        )
    }
  }
  preview(actor, id, input) {
    this.requireRole(actor, ['editor', 'reviewer', 'viewer', 'emergency'])
    const state = this.state(actor, id),
      document =
        input.source === 'published'
          ? state.published
          : this.document(input.document || state.draft, actor, id)
    if (!document) fail(409, 'NOT_PUBLISHED', '子渠道功能尚未发布')
    const resource = this.resource(
      actor,
      document.channel_id,
      document.subchannel_id,
    )
    return {
      simulation: true,
      revision: state.revision,
      results: evaluateSubchannelFeatures(
        document,
        actor.scope,
        input.profile || {},
        {
          parentAllowed: input.eligibleSample === true,
          channelEnabled: resource.channel_enabled === true,
          subchannelEnabled: resource.enabled === true,
          ready: Object.fromEntries(
            Object.keys(document.rules).map((key) => [
              key,
              this.featureCapabilityReader(actor.scope, resource, key) === true,
            ]),
          ),
          eligibility: Object.fromEntries(
            Object.keys(document.rules).map((key) => [
              key,
              input.eligibleSample === true,
            ]),
          ),
          tokenValid: input.authorizationSample === true,
          consentValid: input.authorizationSample === true,
        },
        { kills: state.kills },
      ),
    }
  }
  evaluateRoute(actor, entry, trusted) {
    const selected = trusted.subchannels?.[entry.id]
    if (!selected?.id) return null // No trusted binding: never infer a subchannel from browser names/card brands.
    let resource
    try {
      resource = this.resource(actor, entry.channel_id, selected.id)
    } catch {
      return null
    }
    if (resource.business_method_id !== entry.business_method_id) return null
    const id = featureResourceId(entry.channel_id, selected.id),
      state = this.store.get(this.key(actor), id)
    const document = state?.published || {
      ...resource,
      rules: Object.fromEntries(
        subchannelFeatureKeys(resource.business_method_id).map((key) => [
          key,
          closedFeatureRule(),
        ]),
      ),
    }
    let ready
    try {
      ready = Object.fromEntries(
        Object.keys(document.rules).map((key) => [
          key,
          this.featureCapabilityReader(actor.scope, resource, key) === true,
        ]),
      )
    } catch {
      ready = {}
    }
    return {
      subchannelId: String(selected.id),
      revision: state?.revision || 0,
      emergencyEpoch: state?.emergencyEpoch || 0,
      results: evaluateSubchannelFeatures(
        document,
        actor.scope,
        trusted,
        {
          ...selected,
          parentAllowed: true,
          channelEnabled:
            resource.channel_enabled === true &&
            selected.channelEnabled === true,
          subchannelEnabled:
            resource.enabled === true && selected.subchannelEnabled === true,
          ready,
        },
        { published: !!state?.published, kills: state?.kills },
      ),
    }
  }
}
