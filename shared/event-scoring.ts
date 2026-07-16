/**
 * shared/event-scoring.ts
 *
 * The value model for `life_events`. The schema defines valueMin / valueMaxPersonal
 * and the three multipliers (people / timeVortex / lovePriority) but nothing in the
 * app consumed them. This module is the missing formula: it turns a life event's raw
 * value range, cost, time, frequency, and multipliers into interpretable numbers plus
 * a single 0-100 ranking score.
 */

export interface EventValueInputs {
  valueMin: number;            // low end of personal value (currency-ish units)
  valueMaxPersonal: number;    // high end of personal value
  costMin: number;             // low end of monetary cost
  costMax: number;             // high end of monetary cost
  hoursMin: number;            // low end of time cost, in hours
  hoursMax: number;            // high end of time cost, in hours
  eventsPerYear: number;       // expected / desired frequency
  peopleValueMultiplier: number;   // >1 when shared with others amplifies value
  timeVortexMultiplier: number;    // >1 when the event distorts/eats disproportionate time
  lovePriorityMultiplier: number;  // >1 for relationship-weighted events
}

export interface EventValue {
  baseValue: number;      // midpoint of the personal value range
  adjustedValue: number;  // base scaled by people & love, discounted by the time vortex
  netValue: number;       // adjusted value minus average monetary cost, per occurrence
  valuePerHour: number;   // net value divided by average hours spent
  annualValue: number;    // net value multiplied by events per year
  score: number;          // 0-100 composite for ranking events against each other
}

const mid = (a: number, b: number) => (a + b) / 2;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Compute the derived value of a life event from its raw scoring inputs.
 *
 *   baseValue      = midpoint(valueMin, valueMaxPersonal)
 *   adjustedValue  = baseValue * peopleValueMultiplier * lovePriorityMultiplier
 *                              / max(timeVortexMultiplier, 0.01)
 *   netValue       = adjustedValue - midpoint(costMin, costMax)
 *   valuePerHour   = netValue / max(midpoint(hoursMin, hoursMax), 0.01)
 *   annualValue    = netValue * eventsPerYear
 *   score          = clamp(0, 100, round(20 * log10(max(annualValue, 1) + 1)))
 *
 * The score is a log-scaled 0-100 ranking so a handful of high-frequency, high-value
 * events don't dwarf everything else, and value-negative events (e.g. doomscrolling)
 * floor at 0.
 */
export function calculateEventValue(input: EventValueInputs): EventValue {
  const baseValue = mid(input.valueMin, input.valueMaxPersonal);

  const timeVortex = Math.max(input.timeVortexMultiplier, 0.01);
  const adjustedValue =
    (baseValue * input.peopleValueMultiplier * input.lovePriorityMultiplier) / timeVortex;

  const avgCost = mid(input.costMin, input.costMax);
  const netValue = adjustedValue - avgCost;

  const avgHours = Math.max(mid(input.hoursMin, input.hoursMax), 0.01);
  const valuePerHour = netValue / avgHours;

  const annualValue = netValue * input.eventsPerYear;

  const score = clamp(Math.round(20 * Math.log10(Math.max(annualValue, 1) + 1)), 0, 100);

  return {
    baseValue: round2(baseValue),
    adjustedValue: round2(adjustedValue),
    netValue: round2(netValue),
    valuePerHour: round2(valuePerHour),
    annualValue: round2(annualValue),
    score,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
