'use strict';

function required(value, name) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

function defineExperiment(input = {}) {
  const variants = Array.isArray(input.variants) ? input.variants : [];
  if (variants.length < 2) throw new Error('at least two variants required');
  const names = variants.map(variant => required(variant.name, 'variant.name'));
  if (new Set(names).size !== names.length) throw new Error('variant names must be unique');

  return Object.freeze({
    type: 'g2-experiment',
    version: 1,
    experiment_id: required(input.experiment_id, 'experiment_id'),
    hypothesis: required(input.hypothesis, 'hypothesis'),
    variants: variants.map(variant => Object.freeze({
      name: required(variant.name, 'variant.name'),
      config: Object.freeze({ ...(variant.config || {}) })
    })),
    safety_invariants: Object.freeze((input.safety_invariants || []).map(String)),
    metrics: Object.freeze((input.metrics || []).map(String)),
    promotion_rule: required(input.promotion_rule, 'promotion_rule'),
    minimum_observations_per_variant: Number(input.minimum_observations_per_variant || 1)
  });
}

function compareVariants(observations = [], metric, lowerIsBetter = false) {
  const grouped = new Map();
  for (const observation of observations) {
    if (!observation || !observation.variant) continue;
    const value = Number(observation[metric]);
    if (!Number.isFinite(value)) continue;
    const list = grouped.get(observation.variant) || [];
    list.push(value);
    grouped.set(observation.variant, list);
  }

  const stats = {};
  for (const [variant, values] of grouped) {
    stats[variant] = {
      n: values.length,
      mean: values.reduce((sum, value) => sum + value, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  const ranked = Object.entries(stats).sort((a, b) =>
    lowerIsBetter ? a[1].mean - b[1].mean : b[1].mean - a[1].mean
  );

  return Object.freeze({
    metric,
    lower_is_better: lowerIsBetter,
    stats: Object.freeze(stats),
    leader: ranked.length ? ranked[0][0] : null
  });
}

module.exports = { defineExperiment, compareVariants };
