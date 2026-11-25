/* ---------- Tailored strength programs ----------
   Built from a questionnaire (goal, emphasis, experience, equipment, style, days, session length, limits).
   Sources the structure follows:
   - ACSM position stand on progression models (2009) and the 2026 ACSM resistance-training guideline: rep ranges and rest
     for strength, hypertrophy, power and muscular endurance; train every major muscle group at least twice a week.
   - Schoenfeld and colleagues: 10+ hard sets per muscle per week for growth, a wide rep range works when sets are hard.
   - Lean-mass sparing in a calorie deficit (Roth et al. 2022 review): don't cut training volume while dieting.
   - Strong Curves (Contreras): a glute movement first in every session, full-body A/B/C, double progression.
   - r/bodyweightfitness Recommended Routine: paired calisthenics ladders, 3×5–8, move up a rung at 3×8.
   - RippedBody progression model: double progression, +10 lb big lower lifts, +5 lb elsewhere, stop 1–2 reps short of failure. */
var SP_GOALS = {
  muscle: { name: 'Muscle Builder', short: 'Build muscle', d: 'More muscle (a bulk). Moderate weights for 6–15 reps, 10–20 hard sets per muscle a week.', rx: { main: [4, 6, 10, '2:00'], sec: [3, 8, 12, '90 s'], acc: [3, 10, 15, '75 s'], iso: [3, 12, 20, '60 s'] } },
  lean: { name: 'Cut & Keep', short: 'Lean out', d: 'Lose fat, keep muscle (a cut). Heavy compounds stay in and weekly volume is kept, because cutting volume while dieting tends to cost muscle.', rx: { main: [3, 5, 8, '2:00'], sec: [3, 8, 12, '90 s'], acc: [3, 10, 15, '60 s'], iso: [2, 12, 20, '45 s'] }, finisher: true },
  recomp: { name: 'Recomp', short: 'Both: build and lean out', d: 'Build muscle and lose fat slowly at the same time. Heavy and moderate work, plus a short conditioning finisher.', rx: { main: [4, 5, 8, '2:00'], sec: [3, 8, 12, '90 s'], acc: [3, 10, 15, '60 s'], iso: [2, 12, 20, '45 s'] }, finisher: true },
  strength: { name: 'Strength Foundations', short: 'Get stronger', d: 'Lift heavier. Big lifts in low reps with long rests, then supporting work.', rx: { main: [5, 3, 5, '3:00'], sec: [3, 5, 8, '2:00'], acc: [3, 8, 10, '90 s'], iso: [2, 10, 12, '60 s'] } },
  power: { name: 'Athletic Power', short: 'Power & athleticism', d: 'Jump higher, sprint and move faster. Explosive work first while fresh, then heavy lifts.', rx: { main: [4, 3, 5, '3:00'], sec: [3, 5, 8, '2:00'], acc: [2, 8, 10, '90 s'], iso: [2, 10, 12, '60 s'] }, power: true },
  endurance: { name: 'Muscular Endurance', short: 'Muscular endurance', d: 'Go longer without tiring. Lighter weights, 12–25 reps, short rests.', rx: { main: [3, 12, 15, '60 s'], sec: [3, 15, 20, '45 s'], acc: [2, 15, 20, '45 s'], iso: [2, 20, 25, '30 s'] } },
  health: { name: 'Healthy Strength', short: 'General health', d: 'Feel strong and move well. Every muscle group twice a week, 8–12 reps, nothing to failure.', rx: { main: [3, 8, 12, '90 s'], sec: [2, 10, 12, '75 s'], acc: [2, 10, 15, '60 s'], iso: [2, 12, 15, '60 s'] } }
};
var SP_EMPH = { balanced: 'Balanced', glutes: 'Glutes & Legs', upper: 'Upper Body', legs: 'Legs' };
/* exercise pools, best first. eq: gym > db > band > bw ('bar' needs a pull-up bar). no: limits that rule it out. lad: a calisthenics ladder rung */
function pe(n, eq, no, cue, lad) { return { n: n, eq: eq, no: no || '', cue: cue, lad: lad || 0, iso: /kickback|Frog pump|Banded hip thrust|abduction|clamshell|side walk|lateral raise|curl$|fly$|pushdown/i.test(n) }; }
var SP_POOL = {
  squat: [pe('Back squat', 'gym', 'back', 'Brace, sit between the hips, knees track over the toes.'), pe('Leg press', 'gym', '', 'Lower until the hips start to curl, press through the whole foot.'), pe('Front squat', 'gym', 'back', 'Elbows high, sit straight down.'), pe('Goblet squat', 'db', '', 'Hold the bell at the chest, elbows inside the knees at the bottom.'), pe('Heel-elevated goblet squat', 'db', '', 'Heels on a plate, upright torso, deep knee bend for the quads.'), pe('Banded squat', 'band', '', 'Band under the feet and over the shoulders, sit back and stand tall.'),
    pe('Bodyweight squat', 'bw', '', 'Sit back and down, chest up, 3 s lowering.', 1), pe('Split squat', 'bw', 'knees', 'Long stance, back knee lowers straight down.', 2), pe('Bulgarian split squat', 'bw', 'knees', 'Rear foot on a bench, most weight on the front leg.', 3), pe('Shrimp squat', 'bw', 'knees', 'Hold the back foot, lower the back knee to the floor under control.', 4)],
  hinge: [pe('Barbell Romanian deadlift', 'gym', 'back', 'Soft knees, push the hips back, bar slides down the thighs.'), pe('Trap-bar deadlift', 'gym', '', 'Push the floor away, hips and shoulders rise together.'), pe('45° back extension', 'gym', '', 'Round slightly over the pad, squeeze the glutes to come up.'), pe('Dumbbell Romanian deadlift', 'db', '', 'Hips back, dumbbells close to the legs, flat back.'), pe('Dumbbell single-leg Romanian deadlift', 'db', '', 'Reach the free leg long, hips square.'), pe('Banded good morning', 'band', 'back', 'Band behind the neck, hinge at the hips with a flat back.'),
    pe('Single-leg Romanian deadlift (bodyweight)', 'bw', '', 'Reach long and slow, 3 s down.', 1), pe('Sliding leg curl', 'bw', '', 'Hips up, slide the heels in and out on a towel.', 2), pe('Nordic hamstring curl', 'bw', 'knees', 'Anchor the ankles, lower as slowly as you can.', 3)],
  glute: [pe('Barbell hip thrust', 'gym', '', 'Shoulders on the bench, chin tucked, drive the hips up and squeeze 1 s.'), pe('B-stance hip thrust', 'gym', '', 'One foot forward does most of the work; squeeze at the top.'), pe('Cable kickback', 'gym', '', 'Slight hinge, kick back and up, no lower-back arch.'), pe('Dumbbell hip thrust', 'db', '', 'Dumbbell on the hips, pause 1 s at the top.'), pe('Banded hip thrust', 'band', '', 'Band across the hips, pinned under the hands or the bench.'), pe('Frog pump', 'bw', '', 'Soles together, knees out, short fast squeezes.'),
    pe('Glute bridge', 'bw', '', 'Squeeze at the top for 2 s, ribs down.', 1), pe('Single-leg glute bridge', 'bw', '', 'One knee hugged in, drive through the working heel.', 2), pe('Single-leg hip thrust', 'bw', '', 'Shoulders on a bench or couch, full range, 1 s squeeze.', 3)],
  lunge: [pe('Dumbbell Bulgarian split squat', 'db', 'knees', 'Rear foot up, lean slightly forward for more glute.'), pe('Dumbbell walking lunge', 'db', 'knees', 'Long steps, back knee kisses the floor.'), pe('Dumbbell step-up', 'db', '', 'Whole foot on the box, drive through the heel, slow down.'), pe('Dumbbell reverse lunge', 'db', '', 'Step back long, front shin vertical.'), pe('Reverse lunge', 'bw', '', 'Step back, tall torso, push through the front heel.'), pe('Step-up', 'bw', '', 'Use a sturdy step or bench, lower slowly.')],
  hpush: [pe('Barbell bench press', 'gym', 'shoulders', 'Shoulder blades pinned, bar to the lower chest.'), pe('Dumbbell bench press', 'db', '', 'Press up and slightly in, 2 s lowering.'), pe('Incline dumbbell press', 'db', '', 'Bench at 30°, elbows about 45° from the body.'), pe('Machine chest press', 'gym', '', 'Handles at mid-chest, press without shrugging.'), pe('Band chest press', 'band', '', 'Band behind the back, press forward and together.'),
    pe('Incline push-up', 'bw', '', 'Hands on a bench, body in one line.', 1), pe('Push-up', 'bw', '', 'Body in one line, chest to a fist height off the floor.', 2), pe('Diamond push-up', 'bw', '', 'Hands together under the chest, elbows close.', 3), pe('Archer push-up', 'bw', 'shoulders', 'Shift over one arm while the other stays straight.', 4)],
  vpush: [pe('Seated dumbbell overhead press', 'db', 'shoulders', 'Ribs down, press straight up.'), pe('Standing barbell overhead press', 'gym', 'shoulders back', 'Squeeze the glutes, bar travels in a straight line.'), pe('Landmine press', 'gym', '', 'Press up and forward along the bar\'s arc.'), pe('Dumbbell Arnold press', 'db', 'shoulders', 'Rotate the palms out as you press.'), pe('Half-kneeling band press', 'band', '', 'Tall half-kneel, press the band overhead.'),
    pe('Pike push-up', 'bw', 'shoulders', 'Hips high, lower the head between the hands.', 1), pe('Elevated pike push-up', 'bw', 'shoulders', 'Feet on a bench, more weight over the hands.', 2)],
  hpull: [pe('Seated cable row', 'gym', '', 'Chest tall, pull the elbows past the ribs, pause.'), pe('Chest-supported dumbbell row', 'db', '', 'Chest on an incline bench, elbows to the hips.'), pe('One-arm dumbbell row', 'db', '', 'Knee and hand on the bench, row to the hip.'), pe('Barbell bent-over row', 'gym', 'back', 'Hinge to 45°, row to the belly button.'), pe('Band row', 'band', '', 'Anchor the band, squeeze the shoulder blades.'),
    pe('Doorframe row', 'bw', '', 'Hold the frame, lean back, pull the chest to your hands.', 1), pe('Inverted row', 'bw', '', 'Under a sturdy table or low bar, body straight, chest to the edge.', 2)],
  vpull: [pe('Lat pulldown', 'gym', '', 'Chest up, pull the elbows down to the ribs.'), pe('Assisted pull-up machine', 'gym', '', 'Full hang to chin over the bar; use less help over time.'), pe('Neutral-grip lat pulldown', 'gym', '', 'Palms facing, pull to the upper chest.'), pe('Pull-up', 'bar', '', 'Full hang, pull the chest toward the bar.'), pe('Band lat pulldown', 'band', '', 'Anchor the band high, pull the elbows down and back.'),
    pe('Negative pull-up', 'bar', '', 'Jump to the top, lower over 3–5 s.', 1), pe('Chin-up', 'bar', '', 'Palms facing you, chin over the bar.', 2)],
  arms_b: [pe('Dumbbell curl', 'db', '', 'Elbows still at your sides, 2 s down.'), pe('Hammer curl', 'db', '', 'Palms facing in, no swinging.'), pe('Cable curl', 'gym', '', 'Elbows pinned, squeeze at the top.'), pe('Incline dumbbell curl', 'db', '', 'Arms hang behind you on an incline bench.'), pe('Band curl', 'band', '', 'Stand on the band, curl with elbows fixed.'), pe('Chin-up', 'bar', '', 'Palms facing you, slow lowering.')],
  arms_t: [pe('Cable triceps pushdown', 'gym', '', 'Elbows pinned, straighten fully.'), pe('Overhead dumbbell triceps extension', 'db', 'shoulders', 'Elbows point up, lower behind the head.'), pe('Dumbbell skull crusher', 'db', '', 'Lower to the sides of the head, elbows still.'), pe('Band triceps pushdown', 'band', '', 'Band anchored high, elbows at your sides.'), pe('Bench dip', 'bw', 'shoulders', 'Hands on a bench behind you, lower to 90° at the elbow.'), pe('Diamond push-up', 'bw', '', 'Hands together, elbows close.')],
  delts: [pe('Dumbbell lateral raise', 'db', '', 'Raise to shoulder height leading with the elbows.'), pe('Cable lateral raise', 'gym', '', 'Cable behind you, smooth arc to shoulder height.'), pe('Band lateral raise', 'band', '', 'Stand on the band, raise to shoulder height.')],
  rear: [pe('Face pull', 'gym', '', 'Rope to the forehead, elbows high, thumbs back.'), pe('Rear-delt dumbbell fly', 'db', '', 'Hinge forward, open the arms wide, squeeze.'), pe('Band pull-apart', 'band', '', 'Straight arms, pull the band to the chest.')],
  chest_iso: [pe('Cable fly', 'gym', '', 'Soft elbows, hug a big tree.'), pe('Dumbbell fly', 'db', 'shoulders', 'Wide arc, stop when the elbows reach bench height.')],
  quad_iso: [pe('Leg extension', 'gym', '', 'Pause at the top, 3 s down.'), pe('Heel-elevated goblet squat', 'db', '', 'Heels up, knees forward, upright torso.'), pe('Wall sit', 'bw', '', 'Thighs parallel, back flat on the wall.')],
  ham_iso: [pe('Seated leg curl', 'gym', '', 'Pause with the heels under you, slow return.'), pe('Lying leg curl', 'gym', '', 'Hips pressed down, curl to the glutes.'), pe('Sliding leg curl', 'bw', '', 'Hips up, slide the heels in and out on a towel.')],
  abd: [pe('Hip abduction machine', 'gym', '', 'Lean slightly forward for more glute, pause wide.'), pe('Cable hip abduction', 'gym', '', 'Stand tall, sweep the leg out without leaning.'), pe('Banded side walk', 'band', '', 'Band above the knees, small steps, stay low.'), pe('Banded clamshell', 'band', '', 'Feet together, open the knee without rolling back.'), pe('Side-lying hip abduction', 'bw', '', 'Top leg slightly behind you, toes forward.')],
  calf: [pe('Straight-knee calf raise', 'bw', '', '2 s up, pause, 3 s down. Hold a dumbbell when easy.'), pe('Soleus raise (bent knee)', 'db', '', 'Knees bent, weight on the thighs, full range.')],
  core: [pe('Cable crunch', 'gym', 'back', 'Curl the ribs to the hips, not the hips back.'), pe('Hanging knee raise', 'bar', '', 'Tilt the pelvis up at the top, no swinging.'), pe('Pallof press', 'band', '', 'Press out and resist the twist.'), pe('Dead bug', 'bw', '', 'Lower back pressed down, opposite arm and leg reach.'), pe('Plank', 'bw', '', 'Squeeze glutes and quads, ribs down.'), pe('Side plank', 'bw', '', 'Straight line head to heels.'), pe('Hollow hold', 'bw', 'back', 'Lower back glued to the floor.'), pe('Ab wheel rollout', 'bw', 'back shoulders', 'Roll out only as far as the back stays flat.')],
  power: [pe('Box jump', 'bw', 'knees', 'Land softly, step down.'), pe('Kettlebell swing', 'db', 'back', 'Snap the hips, the arms just guide the bell.'), pe('Broad jump', 'bw', 'knees', 'Swing the arms, land soft and stick it.'), pe('Medicine ball slam', 'gym', '', 'Reach tall, slam with the whole body.'), pe('Dumbbell jump squat', 'db', 'knees', 'Light dumbbells, quick quarter dip and jump.'), pe('Push press', 'gym', 'shoulders back', 'Dip and drive with the legs, lock out overhead.')],
  upower: [pe('Medicine ball chest pass', 'gym', '', 'Explode the ball into a wall, catch and repeat.'), pe('Plyo push-up', 'bw', 'shoulders', 'Push hard enough for the hands to leave the floor.'), pe('Push press', 'gym', 'shoulders back', 'Dip and drive with the legs.')]
};
var SP_TIMED = /^(Plank|Side plank|Hollow hold|Wall sit)$/;
var SP_MUSC = { squat: 'quads glutes', hinge: 'hams glutes', glute: 'glutes', lunge: 'quads glutes', hpush: 'chest triceps', vpush: 'shoulders triceps', hpull: 'back biceps', vpull: 'back biceps', arms_b: 'biceps', arms_t: 'triceps', delts: 'shoulders', rear: 'shoulders', chest_iso: 'chest', quad_iso: 'quads', ham_iso: 'hams', abd: 'glutes', calf: 'calves', core: 'core', power: '', upower: '' };
/* session templates: [pattern, role] in priority order (later slots are dropped for short sessions) */
var SP_DAYS = {
  FA: ['Full Body A', [['squat', 'main'], ['hpush', 'main'], ['hpull', 'sec'], ['hinge', 'sec'], ['delts', 'iso'], ['core', 'iso'], ['arms_b', 'iso'], ['calf', 'iso']]],
  FB: ['Full Body B', [['hinge', 'main'], ['vpull', 'main'], ['vpush', 'sec'], ['lunge', 'sec'], ['core', 'iso'], ['arms_t', 'iso'], ['rear', 'iso'], ['calf', 'iso']]],
  FC: ['Full Body C', [['glute', 'main'], ['hpush', 'sec', 1], ['vpull', 'sec', 1], ['squat', 'acc', 1], ['arms_b', 'iso', 1], ['core', 'iso', 1], ['arms_t', 'iso', 1], ['abd', 'iso']]],
  GA: ['Glutes A', [['glute', 'main'], ['squat', 'sec'], ['hpull', 'sec'], ['hpush', 'acc'], ['hinge', 'acc'], ['abd', 'iso'], ['core', 'iso'], ['calf', 'iso']]],
  GB: ['Glutes B', [['glute', 'main', 2], ['lunge', 'sec'], ['vpull', 'sec'], ['vpush', 'acc'], ['hinge', 'acc', 2], ['abd', 'iso', 1], ['core', 'iso', 1], ['arms_t', 'iso']]],
  GC: ['Glutes C', [['glute', 'main', 1], ['hinge', 'main'], ['hpush', 'sec', 1], ['hpull', 'acc', 1], ['squat', 'acc', 1], ['abd', 'iso'], ['core', 'iso', 2], ['arms_b', 'iso']]],
  GL: ['Glutes & Legs', [['glute', 'main'], ['squat', 'main'], ['hinge', 'sec'], ['lunge', 'acc'], ['abd', 'iso'], ['ham_iso', 'iso'], ['glute', 'iso', 2], ['calf', 'iso']]],
  GL2: ['Glutes & Hamstrings', [['glute', 'main', 1], ['hinge', 'main'], ['lunge', 'sec', 2], ['ham_iso', 'acc'], ['abd', 'iso', 1], ['glute', 'iso', 5], ['quad_iso', 'iso'], ['core', 'iso']]],
  GU: ['Upper Body & Core', [['hpush', 'main'], ['vpull', 'main'], ['hpull', 'sec'], ['vpush', 'sec'], ['delts', 'iso'], ['rear', 'iso'], ['core', 'iso'], ['arms_t', 'iso']]],
  U1: ['Upper 1', [['hpush', 'main'], ['hpull', 'main'], ['vpush', 'sec'], ['vpull', 'sec'], ['delts', 'iso'], ['arms_b', 'iso'], ['arms_t', 'iso'], ['rear', 'iso']]],
  L1: ['Lower 1', [['squat', 'main'], ['hinge', 'sec'], ['lunge', 'acc'], ['quad_iso', 'iso'], ['ham_iso', 'iso'], ['calf', 'iso'], ['core', 'iso'], ['abd', 'iso']]],
  U2: ['Upper 2', [['vpull', 'main', 1], ['hpush', 'main', 2], ['hpull', 'sec', 1], ['vpush', 'sec', 2], ['rear', 'iso'], ['arms_t', 'iso', 1], ['arms_b', 'iso', 1], ['chest_iso', 'iso']]],
  L2: ['Lower 2', [['hinge', 'main', 1], ['glute', 'sec'], ['squat', 'acc', 1], ['ham_iso', 'iso', 1], ['quad_iso', 'iso'], ['calf', 'iso', 1], ['core', 'iso', 1], ['abd', 'iso']]],
  PU: ['Push', [['hpush', 'main'], ['vpush', 'sec'], ['hpush', 'acc', 2], ['delts', 'iso'], ['arms_t', 'iso'], ['chest_iso', 'iso'], ['arms_t', 'iso', 1], ['core', 'iso']]],
  PL: ['Pull', [['vpull', 'main'], ['hpull', 'main'], ['hpull', 'acc', 2], ['rear', 'iso'], ['arms_b', 'iso'], ['arms_b', 'iso', 1], ['core', 'iso'], ['delts', 'iso']]],
  LG: ['Legs', [['squat', 'main'], ['hinge', 'sec'], ['lunge', 'acc'], ['quad_iso', 'iso'], ['ham_iso', 'iso'], ['calf', 'iso'], ['glute', 'iso'], ['core', 'iso']]],
  AR: ['Arms & Shoulders', [['vpush', 'main', 1], ['arms_b', 'sec'], ['arms_t', 'sec'], ['delts', 'acc'], ['rear', 'iso'], ['arms_b', 'iso', 1], ['arms_t', 'iso', 1], ['core', 'iso']]]
};
var SP_SPLIT = {
  balanced: { 2: ['FA', 'FB'], 3: ['FA', 'FB', 'FC'], 4: ['U1', 'L1', 'U2', 'L2'], 5: ['U1', 'L1', 'PU', 'PL', 'LG'], 6: ['PU', 'PL', 'LG', 'PU', 'PL', 'LG'] },
  glutes: { 2: ['GA', 'GC'], 3: ['GA', 'GB', 'GC'], 4: ['GL', 'GU', 'GL2', 'GA'], 5: ['GL', 'GU', 'GL2', 'GU', 'GB'], 6: ['GL', 'GU', 'GL2', 'GA', 'GU', 'GB'] },
  upper: { 2: ['FA', 'FB'], 3: ['PU', 'PL', 'LG'], 4: ['U1', 'L1', 'U2', 'L2'], 5: ['PU', 'PL', 'LG', 'U1', 'AR'], 6: ['PU', 'PL', 'LG', 'PU', 'PL', 'AR'] },
  legs: { 2: ['FA', 'FB'], 3: ['L1', 'U1', 'L2'], 4: ['L1', 'U1', 'L2', 'U2'], 5: ['L1', 'U1', 'LG', 'U2', 'L2'], 6: ['L1', 'U1', 'LG', 'U2', 'L2', 'FC'] }
};
var SP_FALL = { vpull: 'hpull', arms_b: 'hpull', rear: 'hpull', delts: 'vpush', chest_iso: 'hpush', arms_t: 'hpush', quad_iso: 'squat', ham_iso: 'hinge', abd: 'glute', upower: 'hpush', calf: 'core' };
var SP_COUNT = { 30: 4, 45: 5, 60: 6, 75: 7, 90: 8 };
var SP_EQ = { gym: ['gym', 'db', 'band', 'bw', 'bar'], db: ['db', 'band', 'bw'], band: ['band', 'bw'], bw: ['bw'] };
function spDefaults(sp) {
  sp = Object.assign({ goal: 'health', emph: 'balanced', exp: 'new', equip: 'gym', style: 'weights', len: 45, limits: [], bar: false, block: 0, vol: 0 }, sp || {});
  if (!sp.dows || !sp.dows.length) sp.dows = ({ 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] })[clamp(+sp.days || 3, 2, 6)];
  sp.days = sp.dows.length; return sp;
}
function spPick(pat, sp, k, used, role) {
  var eqOK = SP_EQ[sp.equip] || SP_EQ.gym, lim = sp.limits || [], calis = sp.style === 'calis';
  var ok = (SP_POOL[pat] || []).filter(function (e) {
    var eq = e.eq === 'bar' ? (sp.equip === 'gym' || sp.bar) : eqOK.indexOf(e.eq) >= 0;
    return eq && !lim.some(function (l) { return e.no.indexOf(l) >= 0; });
  });
  if (calis) { var bw = ok.filter(function (e) { return e.eq === 'bw' || e.eq === 'bar'; }); if (bw.length) ok = bw.concat(ok.filter(function (e) { return bw.indexOf(e) < 0; })); }
  else if (sp.style === 'mix' && /core|calf|power|upower/.test(pat)) { var b2 = ok.filter(function (e) { return e.eq === 'bw'; }); if (b2.length) ok = b2.concat(ok.filter(function (e) { return b2.indexOf(e) < 0; })); }
  /* ladders: start everyone at the easiest rung that fits their experience */
  var lad = ok.filter(function (e) { return e.lad; }), first = (calis || !ok.some(function (e) { return !e.lad && e.eq !== 'bar'; })) && lad.length ? lad[Math.min(lad.length - 1, sp.exp === 'exp' ? 2 : sp.exp === 'some' ? 1 : 0)] : null;
  var list = first ? (calis ? [first] : [first].concat(ok.filter(function (e) { return !e.lad; }))) : ok.filter(function (e) { return !e.lad || !ok.some(function (x) { return !x.lad; }); });
  if (role === 'main' || role === 'sec') { var heavy = list.filter(function (e) { return !e.iso; }); if (heavy.length) list = heavy; }
  if (!list.length) return null;
  for (var i = 0; i < list.length; i++) { var e = list[(k + i) % list.length]; if (used.indexOf(e.n) < 0) return e; }
  return null;
}
function spRx(sp, role, pat, n, bwx) {
  var g = SP_GOALS[sp.goal] || SP_GOALS.health, r = g.rx[role] || g.rx.acc, sets = sp.exp === 'new' ? Math.min(3, r[0]) : r[0];
  if (role === 'main' || role === 'sec') sets += Math.min(2, +sp.vol || 0);   /* the coach adds sets once you're consistent */
  if (SP_TIMED.test(n)) { var t = sp.goal === 'endurance' ? 60 : sp.exp === 'new' ? 30 : 45; return [sets + '×' + t + ' s', sets + '×' + t + ' s', sets + '×' + t + ' s', Math.max(2, sets - 1) + '×' + t + ' s']; }
  var lo = r[1], hi = r[2];
  if (bwx && hi < 8) { lo = 5; hi = 8; }   /* bodyweight ladders: 5–8 reps, then move up a rung (Recommended Routine) */
  if ((pat === 'core' || pat === 'calf' || pat === 'abd') && hi < 12) { lo = 10; hi = 15; }
  var s = sets + '×' + lo + '–' + hi; return [s, s, s, Math.max(2, sets - 1) + '×' + lo + '–' + hi];
}
function buildProgram(spIn, prof) {
  var sp = spDefaults(spIn), g = SP_GOALS[sp.goal] || SP_GOALS.health, split = (SP_SPLIT[sp.emph] || SP_SPLIT.balanced)[sp.days],
    fbOnly = (sp.equip === 'bw' || sp.equip === 'band') && !sp.bar && sp.emph !== 'glutes' && sp.days >= 3;   /* little to pull with: full-body days so each session has enough work */
  if (fbOnly) split = ['FA', 'FB', 'FC', 'FA', 'FB', 'FC'].slice(0, sp.days);
  var n = SP_COUNT[sp.len] || 5;
  var days = split.map(function (tk, di) {
    var T = SP_DAYS[tk], used = [], exs = [], seen = split.slice(0, di).filter(function (x) { return x === tk; }).length, off = +sp.block || 0;
    var slots = T[1].slice();
    if (g.power) slots.unshift([['U1', 'U2', 'PU', 'PL', 'AR', 'GU'].indexOf(tk) >= 0 ? 'upower' : 'power', 'pow']);
    slots.forEach(function (s) {
      if (exs.length >= n + (g.power ? 1 : 0)) return;
      var e = spPick(s[0], sp, (s[2] || 0) + seen * 2 + off, used, s[1]);
      if (!e && SP_FALL[s[0]]) { s = [SP_FALL[s[0]], s[1], s[2]]; e = spPick(s[0], sp, (s[2] || 0) + seen * 2 + off, used, s[1]) || spPick(s[0], Object.assign({}, sp, { style: 'weights' }), (s[2] || 0) + 1, used, s[1]); }
      if (!e) return;
      used.push(e.n);
      var rest = s[1] === 'pow' ? '2:00' : (g.rx[s[1]] || g.rx.acc)[3], rx = s[1] === 'pow' ? (function () { var p = (sp.exp === 'new' ? 3 : 4) + '×' + (/jump|Plyo/i.test(e.n) ? 3 : 5); return [p, p, p, '2×3']; })() : spRx(sp, s[1], s[0], e.n, e.eq === 'bw' || e.eq === 'bar');
      var it = ex(e.n, e.cue + (s[1] === 'pow' ? ' Explosive: full rest, stop when speed drops.' : ''), rx, rest); it.pat = s[0]; it.role = s[1]; if (e.lad) it.lad = s[0];
      exs.push(it);
    });
    var blocks = [{ min: 5, t: 'Warm-up', ex: DYN[di % DYN.length] }];
    var pw = exs.filter(function (x) { return x.role === 'pow'; }), mains = exs.filter(function (x) { return x.role === 'main' || x.role === 'sec'; }), rest2 = exs.filter(function (x) { return x.role !== 'pow' && x.role !== 'main' && x.role !== 'sec'; });
    var body = sp.len - 5, fin = g.finisher && sp.len >= 45;
    if (pw.length) blocks.push({ min: 6, t: 'Power', ex: pw });
    blocks.push({ min: Math.round((body - (pw.length ? 6 : 0) - (fin ? 6 : 0)) * 0.6), t: 'Main lifts', ex: mains });
    if (rest2.length) blocks.push({ min: Math.round((body - (pw.length ? 6 : 0) - (fin ? 6 : 0)) * 0.4), t: 'Accessories', ex: rest2 });
    if (fin) { var cf = sp.limits.indexOf('knees') >= 0 || sp.limits.indexOf('back') >= 0 || sp.equip === 'bw' || sp.equip === 'band' ? ex('Conditioning finisher', 'Pick any cardio machine or fast bodyweight moves: 20 s hard, 40 s easy.', ['6 rounds', '6 rounds', '8 rounds', '4 rounds'], '–') : ex('Kettlebell swing finisher', 'Snap the hips. 20 s on, 40 s off.', ['6 rounds', '6 rounds', '8 rounds', '4 rounds'], '–'); cf.wu = true; blocks.push({ min: 6, t: 'Finisher', ex: [cf] }); }
    var name = T[0] + (split.length > 3 && seen ? ' (2)' : '');
    return { key: 'P' + (di + 1), name: name, focus: g.short + ' · ' + SP_EMPH[sp.emph].toLowerCase() + ': ' + exs.filter(function (x) { return x.role === 'main' || x.role === 'pow'; }).map(function (x) { return x.n.toLowerCase(); }).join(', ') + '.', blocks: blocks, prog: true, tmpl: tk };
  });
  /* weekly hard sets per muscle (direct work; compound lifts count for each muscle listed) */
  var vol = {};
  days.forEach(function (d) { d.blocks.forEach(function (b) { b.ex.forEach(function (x) { if (!x.pat) return; var s = +(String(x.rx[0]).split('×')[0]) || 0; (SP_MUSC[x.pat] || '').split(' ').filter(Boolean).forEach(function (m) { vol[m] = (vol[m] || 0) + s; }); }); }); });
  var nm = (sp.style === 'calis' ? 'Calisthenics ' : '') + (sp.emph !== 'balanced' ? SP_EMPH[sp.emph] + ' ' : '') + g.name;
  return { name: nm, goal: sp.goal, sp: sp, days: days, vol: vol, desc: g.d };
}
var _progCache = { k: null, p: null };
function programOf(prof) {
  if (!prof || !prof.sp || !prof.sp.on) return null;
  var k = JSON.stringify([prof.sp, prof.weightKg]); if (_progCache.k === k) return _progCache.p;
  var p = buildProgram(prof.sp, prof); p.days.forEach(function (d) { LIFT[d.key] = d; }); _progCache = { k: k, p: p }; return p;
}
/* place the program's sessions on the chosen weekdays, replacing the plan's standard lifts */
function applyProgram(weeks, prof) {
  var P = programOf(prof); if (!P) return;
  var dows = P.sp.dows, newb = P.sp.exp === 'new', start = P.sp.start || null, dl = P.sp.deload || null;
  weeks.forEach(function (w, wi) {
    var bw = start ? Math.max(0, Math.floor(diffD(start, w.start) / 7)) : wi, light = dl ? w.start === dl : ((bw + 1) % (newb ? 6 : 5) === 0), raceWk = w.days.some(function (d) { return d.parts.some(function (p) { return p.type === 'race'; }); });
    w.days.forEach(function (d) { var keep = d.parts.filter(function (p) { return p.type !== 'strength'; }); d.parts = keep.length ? keep : [restPart()]; });
    dows.forEach(function (dw, j) {
      var d = w.days.filter(function (x) { return pd(x.date).getDay() === dw; })[0]; if (!d) return;
      var day = P.days[j], lp = light || raceWk ? 3 : 0;
      var part = { type: 'strength', role: 'lift', key: day.key, v: 0, lp: lp, title: day.name, min: P.sp.len, note: (lp === 3 ? (raceWk ? 'Race week: lighter session, one fewer set. ' : 'Deload week: one fewer set and about 10% lighter, so you come back stronger. ') : '') + day.focus, prog: true };
      if (d.parts.length === 1 && d.parts[0].type === 'rest') d.parts = [part]; else d.parts.push(part);
    });
    w.tot = totals(w.days); w.progLight = light;
  });
}
/* swap a cardio or cross-training session for another kind, on one date */
function cardioSwap(p, kind, d) {
  var c = CARDIO[kind]; if (!c) return p;
  var min = p.min || Math.round((p.mi || 3) * 10), hard = /interval/i.test(p.title || '') || p.type === 'speed', long = /longer|long/i.test(p.title || '') || p.type === 'long';
  if (c.run) return { type: 'easy', role: p.role || 'easy', mi: Math.max(1, Math.round(min / 10 * 2) / 2), title: (c.tread ? 'Treadmill run' : 'Easy run') + (hard ? ' with strides' : ''), note: 'Swapped in for ' + (p.title || 'cardio').toLowerCase() + '. Easy, conversational effort' + (hard ? ', with 6 × 20 s strides at the end.' : '.'), treadmill: !!c.tread, swapped: kind, cardio: true, ckind: kind, from: p.from || p.title };
  var title = c.t + (hard && c.iv ? ' intervals' : long ? ', longer steady' : ', easy'), note = hard && c.iv ? '10 min easy, then ' + c.iv + ', then 5–10 min easy.' : long ? 'Steady, conversational effort the whole way (RPE 3–4).' : 'Easy, conversational effort (RPE 3–4).';
  return { type: 'cross', role: p.role || 'cross', title: title, min: Math.round(min * (c.f >= 1.5 && !long ? 1 : 1)), note: note + ' Swapped in for ' + (p.title || 'cardio').toLowerCase() + '.', cardio: true, ckind: kind, swapped: kind, from: p.from || p.title };
}
function applySwaps(weeks, prof) {
  var S = prof.cswap; if (!S) return;
  weeks.forEach(function (w) { var ch = false; w.days.forEach(function (d) { d.parts = d.parts.map(function (p) { var k = S[d.date + '|' + (p.role || p.type)]; if (!k || p.type === 'strength' || p.type === 'race' || p.type === 'rest') return p; if (!(p.cardio || p.type === 'cross' || prof.focus === 'fitness')) return p; ch = true; return cardioSwap(p, k, d); }); }); if (ch) w.tot = totals(w.days); });
}

/* ---- weight suggestions shared by the app and the watch-workout script ---- */
var SP_START = { 'Barbell hip thrust': [.6, .6], 'B-stance hip thrust': [.3, .3], 'Dumbbell hip thrust': [.25, .25], 'Back squat': [.5, .4], 'Front squat': [.4, .3], 'Leg press': [1, .8], 'Goblet squat': [.2, .15], 'Heel-elevated goblet squat': [.15, .12], 'Barbell Romanian deadlift': [.5, .4], 'Trap-bar deadlift': [.6, .5], 'Dumbbell Romanian deadlift': [.15, .12], 'Dumbbell single-leg Romanian deadlift': [.1, .08], 'Dumbbell Bulgarian split squat': [.08, .06], 'Dumbbell walking lunge': [.08, .06], 'Dumbbell step-up': [.08, .06], 'Dumbbell reverse lunge': [.08, .06], 'Barbell bench press': [.5, .3], 'Dumbbell bench press': [.18, .1], 'Incline dumbbell press': [.15, .08], 'Machine chest press': [.4, .25], 'Seated dumbbell overhead press': [.12, .07], 'Standing barbell overhead press': [.3, .18], 'Landmine press': [.15, .1], 'Dumbbell Arnold press': [.1, .06], 'Seated cable row': [.45, .3], 'Chest-supported dumbbell row': [.15, .1], 'One-arm dumbbell row': [.18, .12], 'Barbell bent-over row': [.4, .25], 'Lat pulldown': [.45, .3], 'Neutral-grip lat pulldown': [.45, .3], 'Dumbbell curl': [.07, .045], 'Hammer curl': [.08, .05], 'Cable curl': [.15, .1], 'Incline dumbbell curl': [.06, .04], 'Cable triceps pushdown': [.2, .12], 'Overhead dumbbell triceps extension': [.12, .07], 'Dumbbell skull crusher': [.06, .04], 'Dumbbell lateral raise': [.05, .03], 'Cable lateral raise': [.04, .03], 'Face pull': [.2, .12], 'Rear-delt dumbbell fly': [.04, .03], 'Cable fly': [.1, .06], 'Dumbbell fly': [.07, .04], 'Leg extension': [.35, .25], 'Seated leg curl': [.3, .2], 'Lying leg curl': [.25, .18], 'Hip abduction machine': [.5, .5], 'Cable hip abduction': [.05, .05], 'Cable kickback': [.06, .06], 'Kettlebell swing': [.15, .12], 'Soleus raise (bent knee)': [.2, .15], 'Cable crunch': [.25, .18] };
function spStartLb(n, c) {
  var t = SP_START[n]; c = c || {}; if (!t || !c.bwLb) return null;
  var w = c.bwLb * t[c.sex === 'F' ? 1 : 0] * ({ new: 1, some: 1.3, exp: 1.6 })[c.exp || 'new'] || 0, step = w < 25 ? 2.5 : 5;
  return Math.max(step, Math.round(w / step) * step);
}
function ladderNext(n) { var out = null; Object.keys(SP_POOL).forEach(function (k) { var L = SP_POOL[k].filter(function (e) { return e.lad; }); L.forEach(function (e, i) { if (e.n === n && L[i + 1] && !out) out = L[i + 1].n; }); }); return out; }
var PN_LOWER = /squat|deadlift|lunge|leg press|hip thrust|rdl|romanian|step.?up|calf|glute bridge|good morning|hamstring|trap bar/i, PN_DB = /dumbbell|\bdb\b|kettlebell/i;
/* double progression for a rep range ("3×8–12"): h = [{date, sets:[{w, r}]}] oldest first */
function progNext(n, rx, h, lp, c) {
  var m = /(\d+)\s*×\s*(\d+)\s*[–-]\s*(\d+)/.exec(String(rx || '')); c = c || {}; if (!m) return null;
  var sets = +m[1], lo = +m[2], hi = +m[3], inc = PN_DB.test(n) ? 5 : PN_LOWER.test(n) ? 10 : 5, per = PN_DB.test(n) ? ' per hand' : '';
  var out = { text: '', w: null, r: lo, kind: 'start' };
  if (!h || !h.length) {
    var sw = c.weighted ? spStartLb(n, c) : null; out.w = sw;
    out.text = sw ? 'First time: start around ' + sw + ' lb' + per + ' for ' + lo + '–' + hi + ' reps (from your body weight and experience). The last rep should feel like a 7 out of 10. Adjust the next set if it\'s much easier or harder.' : c.weighted ? 'First time: pick a weight you could lift about ' + (hi + 2) + ' times, and do ' + lo + '–' + hi + ' reps. Stop with 2 good reps left.' : 'First time: do ' + lo + '–' + hi + ' clean reps per set, stopping 1–2 short of failure.';
    return out;
  }
  var last = h[h.length - 1], topW = last.sets.reduce(function (a, s) { return Math.max(a, +s.w || 0); }, 0), reps = last.sets.map(function (s) { return +s.r || 0; });
  if (lp >= 3) { out.kind = 'hold'; out.w = topW ? (topW * 0.9 < 25 ? Math.round(topW * 0.9 / 2.5) * 2.5 : Math.round(topW * 0.9 / 5) * 5) : null; out.text = 'Deload: ' + (out.w ? out.w + ' lb, ' : '') + 'one fewer set, stop 3 reps short. Easy on purpose.'; return out; }
  if (!topW) {
    out.kind = 'bw'; var all = reps.length >= sets && reps.every(function (r) { return r >= hi; }), nx = ladderNext(n);
    if (all && nx) { out.next = nx; out.text = 'You hit ' + sets + '×' + hi + '. Time to move up: ' + nx + ', starting at ' + sets + '×' + lo + '.'; }
    else if (all) { out.r = hi; out.text = 'You hit ' + sets + '×' + hi + '. Hold a dumbbell or a loaded backpack, or slow the lowering to 4 s.'; }
    else { out.r = Math.min(hi, Math.min.apply(null, reps) + 1); out.text = 'Last time: ' + reps.join(', ') + '. Add a rep per set (aim for ' + out.r + '+), working toward ' + sets + '×' + hi + '.'; }
    return out;
  }
  var top = last.sets.filter(function (s) { return +s.w === topW; }), done = top.length >= sets && top.every(function (s) { return +s.r >= hi; });
  var tot = function (x) { return x.sets.reduce(function (a, s) { return a + (+s.r || 0); }, 0); }, mx = function (x) { return x.sets.reduce(function (a, s) { return Math.max(a, +s.w || 0); }, 0); };
  var stuck = 0; for (var i = h.length - 1; i > 0; i--) { if (mx(h[i]) === mx(h[i - 1]) && tot(h[i]) <= tot(h[i - 1])) stuck++; else break; }
  if (topW < 40) inc = Math.min(inc, 5);
  if (done) { out.kind = 'up'; out.w = topW + inc; out.r = lo; out.text = 'You reached ' + sets + '×' + hi + ' at ' + topW + ' lb. Go up to ' + out.w + ' lb' + per + ' for ' + lo + '+ reps, then build back to ' + hi + '.'; }
  else if (stuck >= 2) { out.kind = 'reset'; out.w = Math.round(topW * 0.9 / 5) * 5 || topW; out.r = hi; out.text = 'No rep gains at ' + topW + ' lb for ' + (stuck + 1) + ' sessions. Drop to ' + out.w + ' lb, hit ' + hi + ' clean reps, and build back. Sleep and food matter here too.'; }
  else { out.kind = 'reps'; out.w = topW; out.r = Math.min(hi, Math.min.apply(null, top.map(function (s) { return +s.r || 0; })) + 1); out.text = 'Stay at ' + topW + ' lb and add a rep per set (last: ' + top.map(function (s) { return s.r; }).join(', ') + '). When every set hits ' + hi + ', add ' + inc + ' lb.'; }
  return out;
}

/* ---- whose calendar: only calendars you've confirmed as yours shape your plan ----
   prefs.calSrc = {calendar key: {mine: true|false, who: 'Steph'}}. Older calendar files (no per-calendar list) are used as they are. */
var CAL_KEYS = ['shifts', 'busy', 'away', 'starts', 'ends', 'events', 'times'];
function calFor(cal, prefs) {
  if (!cal || !cal.by || !cal.by.length) return cal;
  var src = (prefs && prefs.calSrc) || {}, use = cal.by.filter(function (b) { return src[b.key] && src[b.key].mine === true; });
  var out = { updated: cal.updated, calendars: use.length, by: cal.by };
  CAL_KEYS.forEach(function (k) {
    var m = {}; use.forEach(function (b) { Object.keys(b[k] || {}).forEach(function (d) { var v = b[k][d]; if (k === 'busy' || k === 'events') m[d] = (m[d] || []).concat(v); else if (!(d in m)) m[d] = v; }); });
    out[k] = m;
  });
  return out;
}
function calPending(cal, prefs) { var src = (prefs && prefs.calSrc) || {}; return cal && cal.by ? cal.by.filter(function (b) { return !src[b.key] || src[b.key].mine == null; }) : []; }
