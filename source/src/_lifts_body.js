/* ---------- Strength modules ----------
   Every gym day is about 45 minutes and follows the same arc:
   dynamic stretch (5) -> dynamic power lifts (5) -> heavy full-body compounds (23) -> muscle-specific finishers (12).
   A, B and C are all full-body but stagger the patterns: A squat + horizontal push/pull, B hinge + vertical push/pull,
   C single-leg + mixed. Each has three versions that rotate every four weeks. */
function same(a) { return [a, a, a, a]; }
function ex(n, cue, rx, rest) { return { n: n, cue: cue, rx: rx, rest: Array.isArray(rest) ? rest : same(rest) }; }
function dy(n, cue, rx) { var e = ex(n, cue, same(rx), '–'); e.wu = true; return e; }
var WU = ex('Lift warm-up', 'Follow the 5-minute lift warm-up on the Warm-up tab.', same('5 min'), '–'); WU.wu = true;
var DYN = [
  [dy("World's greatest stretch", 'Lunge, elbow to instep, then rotate and reach to the sky.', '1×5/side'), dy('Deep squat pry', 'Sit deep, elbows push the knees out, rock side to side.', '1×5, 5 s holds'), dy('Leg swings', 'Front to back, tall torso, a little higher each swing.', '1×10/leg'), dy('Inchworm', 'Walk the hands out to a plank and back, legs as straight as you can.', '1×5'), dy('Open-book rotation', 'Side-lying, knees stacked, open the top arm and follow it with your eyes.', '1×6/side')],
  [dy('Walking lunge with reach', 'Long step, reach both arms overhead and lean slightly away from the front leg.', '1×6/side'), dy('90/90 hip switch', 'Sit tall, rotate both knees side to side without using your hands if you can.', '1×6/side'), dy('Hamstring scoop', 'Heel down, toes up, hinge and sweep the hands past the foot.', '1×8/leg'), dy('Scapular push-up', 'Arms straight, let the chest sink then push the floor away.', '1×8'), dy('Band pull-apart', 'Arms straight, squeeze the shoulder blades together.', '1×12')],
  [dy('Spiderman lunge with rotation', 'Deep lunge, same-side elbow toward the floor, then rotate open.', '1×5/side'), dy('Bodyweight Cossack squat', 'Shift side to side, sitting deep over one heel with the other leg straight.', '1×5/side'), dy('Glute bridge march', 'Hips high and level while you lift one knee at a time.', '1×8/side'), dy('Cat-cow to downward dog', 'Round, arch, then push the hips up and press the heels down.', '1×6'), dy('Knee-to-wall ankle rock', 'Heel stays down, knee tracks over the second toe.', '1×8/side')]
];
var RX = {
  power: ['3×5', '4×4', '3×3', '2×3'], powerMany: ['3×10', '3×12', '3×10', '2×8'],
  lower: ['4×6 @ RPE 7', '4×4 @ RPE 8', '3×3 @ RPE 8', '2×5 @ RPE 6'], lowerRest: ['2:30', '2:30', '2:30', '2:00'],
  lowerLeg: ['3×8/leg @ RPE 7', '4×6/leg @ RPE 8', '3×5/leg @ RPE 8', '2×6/leg @ RPE 6'],
  upper: ['3×8 @ RPE 7', '3×5 @ RPE 8', '3×4 @ RPE 8', '2×6 @ RPE 6'],
  acc: ['3×10', '3×8', '2×8', '2×10'], accLeg: ['3×10/leg', '3×8/leg', '2×8/leg', '2×8/leg'], accHi: ['3×15', '3×12', '2×12', '2×12'], side: ['3×10/side', '3×10/side', '2×10/side', '2×8/side']
};
function day(key, name, focus, v, power, lower, push, pull, fin) {
  return { key: key, name: name, focus: focus, v: v, blocks: [
    { min: 5, t: 'Dynamic stretch', ex: DYN[v.d] },
    { min: 5, t: 'Dynamic power', ex: power },
    { min: 23, t: 'Heavy compounds', ex: [lower, push, pull] },
    { min: 12, t: 'Muscle-specific finishers', ex: fin }
  ] };
}
var SS = 'Superset: alternate with the next lift, about 75 s between them.';
var LIFT_VARS = {
  A: [
    day('A', 'Squat Day', 'Full body, squat-led: explosive jumps, a heavy squat, a heavy press-and-row superset, then hamstring, shin and calf finishers.', { d: 0 },
      [ex('Box jump', 'Step down, never jump down. Reset between reps and land quietly.', RX.power, '60 s'), ex('Kettlebell swing', 'Hike it back, snap the hips, let the bell float to chest height.', RX.powerMany, '60 s')],
      ex('Back squat', 'Brace first, sit between your hips, and go as deep as you can control. RPE 8 leaves two reps in the tank.', RX.lower, RX.lowerRest),
      ex('Barbell bench press', 'Shoulder blades pinned back and down, feet planted, bar to the lower chest. ' + SS, RX.upper, '75 s'),
      ex('One-arm dumbbell row', 'Flat back, let the shoulder blade stretch forward at the bottom, pull the elbow to the hip.', ['3×8/arm', '3×6/arm', '3×5/arm', '2×8/arm'], '75 s'),
      [ex('Dumbbell Romanian deadlift', 'Slow 3 s lowering, feel the hamstrings stretch, hips back, soft knees.', RX.acc, '45 s'), ex('Tibialis raise (wall)', 'Heels about 12 in from the wall, toes up hard, 2 s up and 2 s down.', ['3×20', '3×20, add a band', '2×20', '2×15'], '30 s'), ex('Deficit calf raise', 'Off a step: sink into a deep stretch for 2 s, then rise all the way up.', ['3×12', '3×10, add weight', '2×12', '2×10'], '30 s')]),
    day('A', 'Squat Day', 'Full body, squat-led: jumps and slams, a front squat that opens the ankles and hips, an incline press-and-row superset, then adductor and lower-leg finishers.', { d: 1 },
      [ex('Squat jump', 'Dip, explode, land soft and sink into the next rep.', RX.power, '60 s'), ex('Medicine ball slam', 'Reach tall, then throw the ball through the floor with your whole body.', ['3×8', '3×10', '3×6', '2×6'], '45 s')],
      ex('Front squat', 'Elbows high, chest tall, sit straight down. The upright position stretches ankles and hips.', RX.lower, RX.lowerRest),
      ex('Incline dumbbell press', 'Let the dumbbells sink for a deep chest stretch, elbows about 45° from the body. ' + SS, RX.upper, '75 s'),
      ex('Chest-supported dumbbell row', 'Chest on the incline bench, reach long at the bottom, pause at the top.', RX.upper, '75 s'),
      [ex('Cossack squat', 'Sit deep over one heel with the other leg long. Hold a light weight in front as a counterbalance.', ['3×6/side', '3×6/side, add weight', '2×6/side', '2×5/side'], '45 s'), ex('Tibialis raise (wall)', 'Heels about 12 in from the wall, toes up hard, 2 s up and 2 s down.', ['3×20', '3×20, add a band', '2×20', '2×15'], '30 s'), ex('Soleus raise (bent knee)', 'Knees bent 90°, weight on the thighs, 3 s down and a pause at the bottom.', ['3×15', '3×12, heavier', '2×15', '2×15'], '30 s')]),
    day('A', 'Squat Day', 'Full body, squat-led: jumps, a paused squat for strength out of the deepest position, a dumbbell press-and-row superset, then hamstring, groin and calf finishers.', { d: 2 },
      [ex('Box jump', 'Step down, never jump down. Reset between reps and land quietly.', RX.power, '60 s'), ex('Medicine ball chest pass', 'Step and punch the ball into a wall or to a partner as fast as you can.', ['3×8', '3×8', '3×6', '2×6'], '45 s')],
      ex('Paused back squat', 'Two-second pause at the bottom, stay tight, then drive up. Use about 10% less than your normal squat.', RX.lower, RX.lowerRest),
      ex('Dumbbell bench press', 'Deep stretch at the bottom, press up and slightly in. ' + SS, RX.upper, '75 s'),
      ex('Seated cable row', 'Reach forward and let the lats stretch, then pull to the lower ribs without leaning back.', RX.upper, '75 s'),
      [ex('Nordic hamstring curl', 'Anchor the ankles, lower as slowly as you can, push back up with your hands.', ['3×5', '3×6', '2×5', '2×4'], '60 s'), ex('Copenhagen plank', 'Top leg on the bench, lift the hips, squeeze the inner thigh.', ['3×20 s/side', '3×25 s/side', '2×20 s/side', '2×15 s/side'], '30 s'), ex('Deficit calf raise', 'Off a step: sink into a deep stretch for 2 s, then rise all the way up.', ['3×12', '3×10, add weight', '2×12', '2×10'], '30 s')])
  ],
  B: [
    day('B', 'Hinge Day', 'Full body, hinge-led: bouncy ankle work, a heavy deadlift, an overhead press and pull-up superset, then single-leg and Achilles finishers.', { d: 1 },
      [ex('Pogo hops', 'Stiff ankles, quiet feet, quick off the floor.', ['3×20', '4×20', '3×20', '2×15'], '45 s'), ex('Broad jump', 'Swing the arms, land in a quarter squat and hold for 2 s.', RX.power, '60 s')],
      ex('Trap-bar deadlift', 'Wedge into the bar, push the floor away, finish by squeezing the glutes. No bouncing off the floor.', RX.lower, RX.lowerRest),
      ex('Standing barbell overhead press', 'Squeeze glutes, ribs down, head through the window at the top. ' + SS, RX.upper, '75 s'),
      ex('Pull-up', 'Start from a full dead hang for a lat stretch, pull the elbows to your ribs. Use a band or the lat pulldown if needed.', ['3×6', '3×5, add weight if easy', '3×4', '2×5'], '75 s'),
      [ex('Dumbbell Bulgarian split squat', 'Rear foot on a bench, drop straight down until the back hip flexor stretches, drive through the front heel.', RX.accLeg, '45 s'), ex('Eccentric heel drop (single leg)', 'Rise on two legs, lower on one over 3 s into a full stretch, off the edge of a step.', ['3×12/leg', '3×12/leg, hold a dumbbell', '2×12/leg', '2×10/leg'], '30 s'), ex('Hanging knee raise', 'No swinging: curl the pelvis up, lower slowly to a full hang.', ['3×10', '3×12', '2×10', '2×8'], '30 s')]),
    day('B', 'Hinge Day', 'Full body, hinge-led: hops and swings, a heavy Romanian deadlift that lengthens the hamstrings under load, a push-press and chin-up superset, then lunge, calf and trunk finishers.', { d: 2 },
      [ex('Pogo hops', 'Stiff ankles, quiet feet, quick off the floor.', ['3×20', '4×20', '3×20', '2×15'], '45 s'), ex('Kettlebell swing', 'Hike it back, snap the hips, let the bell float to chest height.', RX.powerMany, '60 s')],
      ex('Barbell Romanian deadlift', 'Bar stays on the thighs, hips travel back until the hamstrings are fully stretched, then stand tall.', ['4×8 @ RPE 7', '4×6 @ RPE 8', '3×5 @ RPE 8', '2×6 @ RPE 6'], RX.lowerRest),
      ex('Push press', 'Small dip, drive with the legs, punch the bar overhead and lower it under control. ' + SS, RX.upper, '75 s'),
      ex('Chin-up', 'Palms toward you, full hang at the bottom, chest to the bar. Use a band or the lat pulldown if needed.', ['3×6', '3×5, add weight if easy', '3×4', '2×5'], '75 s'),
      [ex('Dumbbell walking lunge', 'Long step, tall torso, back knee kisses the floor.', RX.accLeg, '45 s'), ex('Soleus raise (bent knee)', 'Knees bent 90°, weight on the thighs, 3 s down and a pause at the bottom.', ['3×15', '3×12, heavier', '2×15', '2×15'], '30 s'), ex('Pallof press', 'Resist the twist. Keep hips square.', RX.side, '30 s')]),
    day('B', 'Hinge Day', 'Full body, hinge-led: jumps, a heavy conventional deadlift, a dumbbell press and pulldown superset, then glute, Achilles and trunk finishers.', { d: 0 },
      [ex('Broad jump', 'Swing the arms, land in a quarter squat and hold for 2 s.', RX.power, '60 s'), ex('Medicine ball slam', 'Reach tall, then throw the ball through the floor with your whole body.', ['3×8', '3×10', '3×6', '2×6'], '45 s')],
      ex('Conventional deadlift', 'Bar over mid-foot, lats tight, push the floor away and stand tall. Reset each rep.', RX.lower, RX.lowerRest),
      ex('Seated dumbbell overhead press', 'Lower until the dumbbells are at ear height for a shoulder stretch, press straight up. ' + SS, RX.upper, '75 s'),
      ex('Lat pulldown', 'Full reach at the top, pull the elbows down to your ribs, chest proud.', RX.upper, '75 s'),
      [ex('Barbell hip thrust', 'Shoulders on a bench, chin tucked, drive the hips up and pause for 2 s.', RX.acc, '45 s'), ex('Eccentric heel drop (single leg)', 'Rise on two legs, lower on one over 3 s into a full stretch, off the edge of a step.', ['3×12/leg', '3×12/leg, hold a dumbbell', '2×12/leg', '2×10/leg'], '30 s'), ex('Dead bug', 'Lower back stays glued to the floor.', ['3×8/side', '3×10/side', '2×8/side', '2×8/side'], '30 s')])
  ],
  C: [
    day('C', 'Single-Leg Day', 'Full body, one leg at a time: bounds and hops, a heavy reverse lunge, a push-up and barbell-row superset, then hamstring, trunk and lat finishers.', { d: 2 },
      [ex('Lateral skater hops', 'Land softly on one foot, hold for a beat, then go the other way.', ['3×8/side', '4×8/side', '3×6/side', '2×6/side'], '45 s'), ex('Alternate-leg bounds', 'Long, springy strides. Drive the knee up and reach out.', ['3×20 m', '4×20 m', '3×20 m', '2×20 m'], '60 s')],
      ex('Barbell reverse lunge', 'Long step back, front shin near vertical, drive through the front heel. All reps on one leg, then switch.', RX.lowerLeg, RX.lowerRest),
      ex('Weighted push-up', 'Hands on plates or handles so the chest sinks below the hands, body in one line. ' + SS, ['3×10', '3×8, add weight', '3×6', '2×8'], '75 s'),
      ex('Barbell bent-over row', 'Hinge to about 45°, pull to the belly button, keep the torso still.', RX.upper, '75 s'),
      [ex('Dumbbell single-leg Romanian deadlift', 'Square hips, soft knee, reach long until the hamstring stretches. Touch a wall for balance if needed.', RX.accLeg, '45 s'), ex('Side plank', 'Straight line from head to heels.', ['3×30 s/side', '3×40 s/side', '2×30 s/side', '2×20 s/side'], '30 s'), ex('Dumbbell pullover', 'Lying across a bench, lower the dumbbell behind your head for a deep lat and chest stretch.', RX.acc, '30 s')]),
    day('C', 'Single-Leg Day', 'Full body, one leg at a time: split jumps, a heavy step-up, a landmine press and inverted-row superset, then glute, carry and arm finishers.', { d: 0 },
      [ex('Split-squat jump', 'Jump from a lunge and land in a lunge on the same side. Soft, quiet landings.', ['3×5/side', '3×6/side', '3×4/side', '2×4/side'], '60 s'), ex('Lateral skater hops', 'Land softly on one foot, hold for a beat, then go the other way.', ['3×8/side', '4×8/side', '3×6/side', '2×6/side'], '45 s')],
      ex('Dumbbell step-up', 'Knee-high box, whole foot on, stand tall without pushing off the back leg, lower for 3 s.', RX.lowerLeg, RX.lowerRest),
      ex('Landmine press', 'Half-kneeling, press up and forward, reach long at the top. ' + SS, ['3×8/arm', '3×6/arm', '3×5/arm', '2×6/arm'], '75 s'),
      ex('Inverted row', 'Body in one line under a bar or rings, pull the chest to the bar, lower to straight arms.', ['3×10', '3×8, feet raised', '3×6', '2×8'], '75 s'),
      [ex('Single-leg hip thrust', 'Shoulders on a bench, one foot down, drive the hips up level and pause.', RX.accLeg, '45 s'), ex('Suitcase carry', 'One heavy dumbbell, tall posture, no leaning.', same('3×30 m/side'), '30 s'), ex('Incline dumbbell curl', 'Lie back on an incline so the arms hang behind you: a long stretch at the bottom of every rep.', RX.acc, '30 s')]),
    day('C', 'Single-Leg Day', 'Full body, one leg at a time: bounds and jumps, a deep front-foot-elevated split squat, an Arnold press and pulldown superset, then hamstring, trunk and shin finishers.', { d: 1 },
      [ex('Alternate-leg bounds', 'Long, springy strides. Drive the knee up and reach out.', ['3×20 m', '4×20 m', '3×20 m', '2×20 m'], '60 s'), ex('Squat jump', 'Dip, explode, land soft and sink into the next rep.', RX.power, '60 s')],
      ex('Front-foot-elevated split squat', 'Front foot on a low plate, sink until the back knee nearly touches: a deep stretch for the back hip.', RX.lowerLeg, RX.lowerRest),
      ex('Dumbbell Arnold press', 'Start palms facing you at the chin, rotate and press overhead, reverse it on the way down. ' + SS, RX.upper, '75 s'),
      ex('Neutral-grip lat pulldown', 'Palms facing each other, full reach at the top, pull to the upper chest.', RX.upper, '75 s'),
      [ex('Dumbbell single-leg Romanian deadlift', 'Square hips, soft knee, reach long until the hamstring stretches. Touch a wall for balance if needed.', RX.accLeg, '45 s'), ex('Pallof press', 'Resist the twist. Keep hips square.', RX.side, '30 s'), ex('Tibialis raise (wall)', 'Heels about 12 in from the wall, toes up hard, 2 s up and 2 s down.', ['3×20', '3×20, add a band', '2×20', '2×15'], '30 s')])
  ]
};
var LIFT = {
  A: LIFT_VARS.A[0], B: LIFT_VARS.B[0], C: LIFT_VARS.C[0],
  UB: {
    key: 'UB', name: 'Upper Body & Core', focus: 'Upper body, core and hips with no impact: presses, rows and pulldowns, then core and glute work. Gives the legs a break between run days, and is the go-to session when an injury keeps you off your feet.',
    blocks: [
      { min: 5, t: 'Dynamic stretch', ex: DYN[0] },
      { min: 8, t: 'Push', ex: [
        ex('Dumbbell bench press', 'Shoulder blades pinned back, press up and slightly in.', same('3×10'), '90 s'),
        ex('Push-up', 'Body in one line. Stop two reps before form breaks.', same('2×12'), '60 s')] },
      { min: 8, t: 'Pull', ex: [
        ex('Chest-supported dumbbell row', 'Pull the elbows to your hips, pause at the top.', same('3×10'), '60 s'),
        ex('Lat pulldown', 'Chest up, pull the elbows down to your ribs.', same('3×8'), '60 s')] },
      { min: 6, t: 'Shoulders', ex: [ex('Seated dumbbell overhead press', 'Ribs down, press straight up.', same('3×10'), '60 s')] },
      { min: 10, t: 'Core', ex: [
        ex('Dead bug', 'Lower back stays glued to the floor.', same('3×8/side'), '30 s'),
        ex('Side plank', 'Straight line from head to heels.', same('3×30 s/side'), '30 s'),
        ex('Pallof press', 'Resist the twist. Keep hips square.', same('3×10/side'), '30 s'),
        ex('Hollow hold', 'Ribs down, low back flat.', same('3×20 s'), '30 s')] },
      { min: 8, t: 'Hips and glutes', ex: [
        ex('Glute bridge', 'Squeeze at the top for 2 s.', same('3×12'), '45 s'),
        ex('Side-lying hip abduction', 'Toes slightly down, no rocking.', same('3×15/side'), '30 s'),
        ex('Banded clamshell', 'Feet together, open the top knee.', same('2×15/side'), '30 s')] }
    ]
  },
  HT: {
    key: 'HT', name: 'Travel Session', focus: 'A 30-minute bodyweight session for a hotel room or a park. Optional.',
    blocks: [
      { min: 5, t: 'Dynamic stretch', ex: DYN[0] },
      { min: 10, t: 'Legs', ex: [
        ex('Bodyweight squat', 'Slow down, 3 s lowering.', same('3×15'), '45 s'),
        ex('Reverse lunge', 'Long step back, tall torso.', same('3×10/leg'), '45 s'),
        ex('Single-leg Romanian deadlift', 'Reach long, hips square.', same('3×10/leg'), '45 s')] },
      { min: 8, t: 'Upper body', ex: [
        ex('Push-up', 'Leave two reps in the tank.', same('3×max-2'), '60 s'),
        ex('Pike push-up', 'Hips high, head between the hands.', same('3×8'), '60 s')] },
      { min: 7, t: 'Core and calves', ex: [
        ex('Plank', 'Squeeze glutes and quads.', same('3×40 s'), '30 s'),
        ex('Glute bridge', 'Squeeze at the top.', same('3×15'), '30 s'),
        ex('Calf raise (single leg)', '2 s up, 3 s down.', same('3×15/leg'), '30 s')] }
    ]
  },
  ACT: {
    key: 'ACT', name: 'Race-Week Activation', focus: 'A short, easy session to keep the legs awake. Nothing heavy.',
    blocks: [
      { min: 5, t: 'Dynamic stretch', ex: DYN[0] },
      { min: 5, t: 'Prime', ex: [
        ex('Glute bridge', 'Squeeze at the top for 2 s.', same('2×10'), '30 s'),
        ex('Goblet squat, light', 'Easy depth, quick tempo, stop with plenty left.', same('2×6'), '45 s')] },
      { min: 5, t: 'Power', ex: [ex('Pogo hops', 'Light and bouncy. Stop before it feels tiring.', same('2×15'), '45 s')] },
      { min: 5, t: 'Calves and feet', ex: [
        ex('Straight-knee calf raise', '2 s up, 2 s down.', same('2×12'), '30 s'),
        ex('Short-foot hold', 'Hold 5 s each rep.', same('2×8'), '–')] }
    ]
  }
};
/* which version of a session a given plan week uses: a new one every four weeks */
function liftVar(weekN) { return Math.floor(Math.max(0, (weekN || 1) - 1) / 4) % 3; }
function liftMod(key, v) { var a = LIFT_VARS[key]; return a ? a[(v || 0) % a.length] : LIFT[key]; }
var LIFT_PHASES = [
  { k: 'Base', d: 'Learn the lifts. Moderate loads, higher reps.' },
  { k: 'Build', d: 'Heavier loads, lower reps. Your biggest strength gains come here.' },
  { k: 'Peak', d: 'Keep the strength, cut the volume. Save fresh legs for run days.' },
  { k: 'Light', d: 'Taper and post-race weeks. Half the sets and easy loads.' }
];
