// Made-up data for the design renders, the sample report and the store
// screenshots. Never shipped in the app. Fixed clock: Saturday Nov 14,
// 2026, 10:00 am, on the New York clock. One person on a weekly GLP-1
// medication since Aug 13 (three dose steps typed by them), a weekly B12
// shot on Mondays as a second medication (Pro), most mornings weighed,
// some side effects in the days after a shot, and today's protein and water.
import { addDays, atTime, dayKey } from '../../src/days.ts';

export const NOW = atTime('2026-11-14', 10, 0);
export const TODAY = '2026-11-14';

// A small fixed random, so every run draws the same data.
let s = 7;
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);

export function seed({ stack = false } = {}) {
  const meds = [
    {
      id: 1,
      name: 'Semaglutide',
      schedule: { kind: 'interval', everyDays: 7 },
      startDay: '2026-08-13',
      doses: [
        { id: 1, medId: 1, fromDay: '2026-08-13', amount: '0.25', unit: 'mg' },
        { id: 2, medId: 1, fromDay: '2026-09-10', amount: '0.5', unit: 'mg' },
        { id: 3, medId: 1, fromDay: '2026-10-08', amount: '1', unit: 'mg' },
      ],
      remind: true,
      position: 0,
      createdAt: atTime('2026-08-13', 19),
    },
  ];
  if (stack)
    meds.push({
      id: 2,
      name: 'Vitamin B12',
      schedule: { kind: 'weekdays', days: [0] },
      startDay: '2026-10-05',
      doses: [{ id: 4, medId: 2, fromDay: '2026-10-05', amount: '1000', unit: 'mcg' }],
      remind: true,
      position: 1,
      createdAt: atTime('2026-10-05', 9),
    });

  const rotation = ['abdomen-left', 'abdomen-right', 'thigh-left', 'thigh-right'];
  const shots = [];
  let id = 1;
  for (let i = 0, day = '2026-08-13'; day <= '2026-11-12'; i++, day = addDays(day, 7)) {
    const dose = day >= '2026-10-08' ? '1' : day >= '2026-09-10' ? '0.5' : '0.25';
    shots.push({ id: id++, medId: 1, medName: 'Semaglutide', at: atTime(day, 19 + (i % 3 === 0 ? 1 : 0), (i * 17) % 60), amount: dose, unit: 'mg', site: rotation[i % 4], note: '', backfilled: i === 3, createdAt: 0 });
  }
  if (stack) for (let day = '2026-10-05'; day <= '2026-11-09'; day = addDays(day, 7)) shots.push({ id: id++, medId: 2, medName: 'Vitamin B12', at: atTime(day, 8, 40), amount: '1000', unit: 'mcg', site: day === '2026-10-19' || day === '2026-11-02' ? 'arm-right' : 'arm-left', note: '', backfilled: false, createdAt: 0 });

  const weights = [];
  let w = 212.6;
  for (let day = '2026-08-10'; day <= TODAY; day = addDays(day, 1)) {
    w -= 0.17 + (rand() - 0.5) * 0.12;
    if (rand() < 0.55 || day === TODAY || day === '2026-08-12') weights.push({ id: weights.length + 1, at: atTime(day, 7, 10 + Math.floor(rand() * 30)), value: Math.round((w + (rand() - 0.5) * 1.2) * 10) / 10, unit: 'lb', waist: day === '2026-11-14' ? 38.5 : day === '2026-08-12' ? 42 : null, createdAt: 0 });
  }

  const feelings = [];
  const add = (day, h, kind, level) => feelings.push({ id: feelings.length + 1, at: atTime(day, h), kind, level, note: '', createdAt: 0 });
  for (const sh of shots.filter((x) => x.medId === 1)) {
    const d = dayKey(sh.at);
    if (d < '2026-08-20') continue;
    if (rand() < 0.8) add(addDays(d, 1), 11, 'nausea', rand() < 0.3 ? 'moderate' : 'mild');
    if (rand() < 0.55) add(addDays(d, 2), 13, 'nausea', 'mild');
    if (rand() < 0.5) add(addDays(d, 1), 16, 'fatigue', rand() < 0.2 ? 'strong' : 'mild');
    if (rand() < 0.35) add(addDays(d, 3), 9, 'constipation', 'mild');
    if (rand() < 0.25) add(addDays(d, 2), 21, 'heartburn', 'moderate');
    if (rand() < 0.15) add(d, 22, 'site_reaction', 'mild');
    if (rand() < 0.2) add(addDays(d, 4), 15, 'low_appetite', 'mild');
  }
  add('2026-11-13', 12, 'nausea', 'mild');

  const intake = [{ day: TODAY, protein: 62, water: 1240 }];
  return { meds, shots, weights, feelings, intake };
}
