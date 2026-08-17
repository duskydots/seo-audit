import type { RuleDefinition } from "./rule.schema.ts";
import { browserDeliveryVariant } from "./rules/rendering/browser-delivery-variant.rule.ts";
import { renderTimeout } from "./rules/rendering/hard-timeout.rule.ts";
import { indexabilityChanged } from "./rules/rendering/indexability-changed.rule.ts";
import { largeJavascriptPayload } from "./rules/rendering/javascript-payload-large.rule.ts";
import { renderedOnlyLinks } from "./rules/rendering/links-added.rule.ts";
import { primaryContentAdded } from "./rules/rendering/primary-content-added.rule.ts";
import { primaryContentRemoved } from "./rules/rendering/primary-content-removed.rule.ts";
import { primaryRequestFailure } from "./rules/rendering/primary-request-failed.rule.ts";
import { largeThirdPartyPayload } from "./rules/rendering/third-party-payload-large.rule.ts";

export const renderingRules: readonly RuleDefinition[] = Object.freeze([
  primaryContentAdded,
  primaryContentRemoved,
  indexabilityChanged,
  renderedOnlyLinks,
  renderTimeout,
  primaryRequestFailure,
  largeJavascriptPayload,
  largeThirdPartyPayload,
  browserDeliveryVariant,
]);
