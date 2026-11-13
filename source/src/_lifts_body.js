/* ---------- Strength modules ---------- */
function same(a) { return [a, a, a, a]; }
function ex(n, cue, rx, rest) { return { n: n, cue: cue, rx: rx, rest: Array.isArray(rest) ? rest : same(rest) }; }
var WU = ex('Lift warm-up', 'Follow the 5-minute lift warm-up on the Warm-up tab.', same('5 min'), '–');

var LIFT = {
  A: {
    key: 'A', name: 'Squat Day', focus: 'Heavy squat and press, box jumps for power, and a tibialis finisher for the shins.',
    blocks: [
      { min: 5, t: 'Warm-up', ex: [WU] },
      { min: 6, t: 'Power', ex: [ex('Box jump', 'Step down, never jump down. Reset between reps and land quietly.', ['3×5', '4×4', '3×4', '2×3'], '60 s')] },
      { min: 12, t: 'Main lift', ex: [ex('Back squat', 'RPE 7 leaves three reps in the tank, RPE 8 leaves two. Brace first, then use full depth you control.', ['3×8 @ RPE 7', '4×5 @ RPE 8', '3×3 @ RPE 8', '2×5 @ RPE 6'], ['2:00', '2:30', '2:30', '1:30'])] },
      { min: 8, t: 'Press', ex: [ex('Standing barbell overhead press', 'Squeeze glutes, ribs down, head through the window at the top.', ['3×8', '4×5', '3×4', '2×5'], ['2:00', '2:00', '2:00', '1:30'])] },
      { min: 7, t: 'Single-leg', ex: [ex('Dumbbell walking lunge', 'Long step, tall torso, front knee tracks over the middle toes.', ['3×10/leg', '3×8/leg', '2×6/leg', '2×6/leg, bodyweight'], '90 s')] },
      { min: 7, t: 'Superset', ex: [
        ex('One-arm dumbbell row', 'Flat back, pull the elbow to the hip. Alternate with the tibialis raise.', ['3×10/arm', '3×8/arm', '3×6/arm', '2×8/arm'], '45 s'),
        ex('Tibialis raise (wall)', 'Heels about 12 in from the wall, toes up hard, 2 s up and 2 s down.', ['3×20', '3×20, add a band', '2×20', '2×15'], '45 s')] }
    ]
  },
  B: {
    key: 'B', name: 'Hinge Day', focus: 'Deadlift and single-leg strength, with pogo hops and heel drops to build tough calves and Achilles tendons.',
    blocks: [
      { min: 5, t: 'Warm-up', ex: [WU] },
      { min: 6, t: 'Power', ex: [
        ex('Pogo hops', 'Stiff ankles, quiet feet, quick off the floor.', ['3×20', '4×20', '3×20', '2×15'], '45 s'),
        ex('Broad jump', 'Swing the arms, land in a quarter squat and hold for 2 s.', ['3×3', '3×4', '3×3', '2×3'], '60 s')] },
      { min: 12, t: 'Main lift', ex: [ex('Deadlift (conventional or trap bar)', 'Wedge into the bar, push the floor away, finish by squeezing the glutes.', ['3×8 @ RPE 7', '4×5 @ RPE 8', '3×3 @ RPE 8', '2×5 @ RPE 6'], ['2:00', '2:30', '2:30', '1:30'])] },
      { min: 8, t: 'Single-leg', ex: [ex('Dumbbell Bulgarian split squat', 'Rear foot on a bench, drop straight down, drive through the front heel.', ['3×8/leg', '3×6/leg', '2×5/leg', '2×6/leg, bodyweight'], '90 s')] },
      { min: 7, t: 'Pull', ex: [ex('Barbell bent-over row', 'Hinge to about 45°, pull to the belly button, keep the torso still.', ['3×10', '4×6', '3×5', '2×8'], ['90 s', '90 s', '90 s', '60 s'])] },
      { min: 7, t: 'Calf superset', ex: [
        ex('Eccentric heel drop (single leg)', 'Rise on two legs, lower on one leg over 3 s, off the edge of a step.', ['3×12/leg', '3×12/leg, hold a dumbbell', '2×12/leg', '2×10/leg'], '45 s'),
        ex('Soleus raise (bent knee)', 'Knees bent 90°, weight on the thighs, 3 s down and a pause at the bottom.', ['3×15', '3×12, heavier', '2×15', '2×15'], '45 s')] }
    ]
  },
  C: {
    key: 'C', name: 'Power & Core', focus: 'The third lifting day in the base weeks. Light on the legs, heavy on bounce, trunk and foot strength.',
    blocks: [
      { min: 5, t: 'Warm-up', ex: [WU] },
      { min: 8, t: 'Bounds', ex: [
        ex('Alternate-leg bounds', 'Long, springy strides. Drive the knee up and reach out.', same('4×20 m'), '60 s'),
        ex('Lateral skater hops', 'Land softly on one foot, hold for a beat, then go the other way.', same('3×8/side'), '45 s')] },
      { min: 8, t: 'Hinge', ex: [ex('Dumbbell single-leg Romanian deadlift', 'Square hips, soft knee, reach long. Touch a wall for balance if needed.', same('3×10/leg'), '60 s')] },
      { min: 8, t: 'Push and pull', ex: [
        ex('Dumbbell incline press', 'Elbows at about 45° from the body.', same('3×10'), '60 s'),
        ex('Chin-up or lat pulldown', 'Pull the elbows to your ribs. Pause at the top.', same('3×8'), '60 s')] },
      { min: 8, t: 'Core', ex: [
        ex('Pallof press', 'Resist the twist. Keep hips square.', same('3×10/side'), '30 s'),
        ex('Dead bug', 'Lower back stays glued to the floor.', same('3×8/side'), '30 s'),
        ex('Side plank', 'Straight line from head to heels.', same('3×30 s/side'), '30 s'),
        ex('Suitcase carry', 'Tall posture, no leaning.', same('3×30 m/side'), '30 s')] },
      { min: 8, t: 'Foot and ankle', ex: [
        ex('Short-foot hold', 'Pull the ball of the foot toward the heel without curling the toes. Hold 5 s.', same('3×10'), '–'),
        ex('Banded ankle inversion and eversion', 'Slow and controlled, only the ankle moves.', same('2×15 each way'), '–'),
        ex('Single-leg balance', 'Progress to eyes closed or a folded towel.', same('3×30 s/leg'), '–')] }
    ]
  },
  UB: {
    key: 'UB', name: 'Upper Body & Core', focus: 'No-impact strength for weeks when running or jumping is off the table. Skip anything that provokes pain.',
    blocks: [
      { min: 5, t: 'Warm-up', ex: [WU] },
      { min: 8, t: 'Push', ex: [
        ex('Dumbbell bench press', 'Shoulder blades pinned back, press up and slightly in.', same('3×10'), '90 s'),
        ex('Push-up', 'Body in one line. Stop two reps before form breaks.', same('2×12'), '60 s')] },
      { min: 8, t: 'Pull', ex: [
        ex('Chest-supported dumbbell row', 'Pull the elbows to your hips, pause at the top.', same('3×10'), '60 s'),
        ex('Lat pulldown or assisted pull-up', 'Chest up, pull the elbows down.', same('3×8'), '60 s')] },
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
      { min: 5, t: 'Warm-up', ex: [WU] },
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
      { min: 5, t: 'Warm-up', ex: [WU] },
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
var LIFT_PHASES = [
  { k: 'Base', d: 'Learn the lifts. Moderate loads, higher reps.' },
  { k: 'Build', d: 'Heavier loads, lower reps. Your biggest strength gains come here.' },
  { k: 'Peak', d: 'Keep the strength, cut the volume. Save fresh legs for run days.' },
  { k: 'Light', d: 'Taper and post-race weeks. Half the sets and easy loads.' }
];
