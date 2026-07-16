/**
 * scripts/seed-life-events.ts
 *
 * CSV-driven seeder for the fully-scored `life_events` table (which has no importer
 * of its own). Reads scripts/data/life-events-seed.csv, upserts the event_categories
 * lookup, computes each event's value via calculateEventValue(), and inserts the row
 * with every value / multiplier / longevity field populated.
 *
 * Run:  tsx scripts/seed-life-events.ts
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { eq } from 'drizzle-orm';
import { db } from '../server/db';
import { eventCategories, lifeEvents } from '../shared/schema';
import { calculateEventValue } from '../shared/event-scoring';

// event_categories lookup (name / description / color)
const CATEGORIES = [
  { name: 'Personal',     description: 'Solo growth, health, and habits',  color: '#3357FF' },
  { name: 'Relationship', description: 'Time with a romantic partner',     color: '#FF33F5' },
  { name: 'Family',       description: 'Family, kids, and elders',         color: '#33FF57' },
  { name: 'Social',       description: 'Friends and community',            color: '#F5FF33' },
  { name: 'Work',         description: 'Career, business, and craft',      color: '#FF5733' },
  { name: 'Holidays',     description: 'Seasonal and annual traditions',   color: '#33FFF5' },
  { name: 'Household',    description: 'Chores, errands, and home upkeep', color: '#FF9F33' },
];

const num = (v: string | undefined, dflt = 0) => {
  const n = parseFloat((v ?? '').trim());
  return Number.isFinite(n) ? n : dflt;
};
const d = (n: number) => n.toFixed(2); // decimal columns take strings in drizzle-orm

async function seed() {
  const csvPath = path.join(process.cwd(), 'scripts', 'data', 'life-events-seed.csv');
  const fileContent = fs.readFileSync(csvPath, { encoding: 'utf-8' });
  const parser = parse(fileContent, { columns: true, skip_empty_lines: true, trim: true });

  const records: any[] = [];
  for await (const record of parser) records.push(record);
  console.log(`Parsed ${records.length} life events from ${csvPath}`);

  // Upsert categories, then map name -> id.
  await db.insert(eventCategories).values(CATEGORIES).onConflictDoNothing();
  const cats = await db.select().from(eventCategories);
  const catId = new Map(cats.map(c => [c.name, c.id]));

  let inserted = 0;
  for (const r of records) {
    const label = (r['label'] ?? '').trim();
    if (!label) continue;

    const exists = await db.select({ id: lifeEvents.id })
      .from(lifeEvents).where(eq(lifeEvents.label, label)).limit(1);
    if (exists.length) { console.log(`  skip (exists): ${label}`); continue; }

    const inputs = {
      valueMin: num(r['valueMin']),
      valueMaxPersonal: num(r['valueMaxPersonal']),
      costMin: num(r['costMin']),
      costMax: num(r['costMax']),
      hoursMin: num(r['hoursMin']),
      hoursMax: num(r['hoursMax']),
      eventsPerYear: num(r['eventsPerYear']),
      peopleValueMultiplier: num(r['peopleValueMultiplier'], 1),
      timeVortexMultiplier: num(r['timeVortexMultiplier'], 1),
      lovePriorityMultiplier: num(r['lovePriorityMultiplier'], 1),
    };
    const value = calculateEventValue(inputs);

    await db.insert(lifeEvents).values({
      label,
      relationship: (r['relationship'] ?? '').trim() || null,
      categoryId: catId.get((r['category'] ?? '').trim()) ?? null,
      eventsPerYear: inputs.eventsPerYear,
      bonusEvents: 0,
      isCalendared: num(r['isCalendared']) === 1,
      historicalEventsPerYear: inputs.eventsPerYear,
      hoursMin: inputs.hoursMin,
      hoursMax: inputs.hoursMax,
      yearsInLength: 0,
      overlapTolerance: 'flexible',
      exclusionDayRequired: false,
      costMin: d(inputs.costMin),
      costMax: d(inputs.costMax),
      valueMin: d(inputs.valueMin),
      valueMaxPersonal: d(inputs.valueMaxPersonal),
      peopleValueMultiplier: inputs.peopleValueMultiplier,
      timeVortexMultiplier: inputs.timeVortexMultiplier,
      lovePriorityMultiplier: inputs.lovePriorityMultiplier,
      motivator: (r['motivator'] ?? '').trim() || null,
      ageStart: Math.round(num(r['ageStart'], 0)),
      ageStop: Math.round(num(r['ageStop'], 100)),
      lifePoints: (r['lifePoints'] ?? '').trim() || null,
      emotionValue: (r['emotionValue'] ?? '').trim() || null,
      longevityImpact: (r['longevityImpact'] ?? '').trim() || null,
      approvalStatus: 'Approved',
      emoji: (r['emoji'] ?? '').trim() || null,
      isDefault: true,
    } as any);

    console.log(`  + ${label}  (score ${value.score}, annual ${value.annualValue})`);
    inserted++;
  }

  console.log(`Done. Inserted ${inserted} life events (${records.length - inserted} skipped).`);
}

seed()
  .then(() => process.exit(0))
  .catch(err => { console.error('Seed failed:', err); process.exit(1); });
