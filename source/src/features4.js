/* ================= Features 4: exercise library (how-to, form tips, muscle map, substitutes), rotating gym sessions,
   1RM calculator, race-time estimator (Daniels VDOT), quieter rating prompts ================= */

/* ---------- exercise library ---------- */
var EXDB = {};
function X(n, pat, eq, pri, sec, how, tips, subs, deep) { EXDB[n] = { n: n, pat: pat, eq: eq, pri: pri.split(' '), sec: sec ? sec.split(' ') : [], how: how.split('|'), tips: tips.split('|'), subs: subs ? subs.split('|') : [], deep: !!deep }; }
/* dynamic stretches */
X("World's greatest stretch", 'stretch', 'None', 'hipflex hams', 'adductors upperback glutes', 'Step into a long lunge and put both hands inside the front foot.|Drop the elbow toward the instep, then rotate and reach that arm to the ceiling.|Straighten the front leg to stretch the hamstring, then step through.', 'Keep the back knee off the floor if you can.|Follow your hand with your eyes when you rotate.', 'Spiderman lunge with rotation|Walking lunge with reach', 1);
X('Deep squat pry', 'squat', 'None', 'adductors glutes', 'calves hipflex', 'Sit into your deepest squat with heels down.|Press the elbows against the inside of the knees and rock gently side to side.|Hold each side for a few seconds.', 'Hold a rack or a light plate in front if you tip backwards.|Chest tall, heels on the floor.', 'Bodyweight Cossack squat|90/90 hip switch', 1);
X('Leg swings', 'stretch', 'None', 'hams hipflex', 'glutes', 'Hold a rack and stand tall on one leg.|Swing the other leg forward and back, a little higher each time.', 'Keep the torso still; the leg moves, not the back.', 'Hamstring scoop|Walking lunge with reach', 1);
X('Inchworm', 'core', 'None', 'hams abs', 'delts calves', 'Fold forward and walk the hands out to a plank.|Pause, then walk the feet toward the hands with legs as straight as you can.', 'Keep the hips level in the plank.', 'Cat-cow to downward dog|Hamstring scoop', 1);
X('Open-book rotation', 'stretch', 'None', 'upperback obliques', 'chest', 'Lie on your side with knees stacked and bent, arms straight in front.|Open the top arm across to the other side and follow it with your eyes.|Pause, breathe out, and return.', 'Keep the knees together so the twist comes from the upper back.', "World's greatest stretch|Band pull-apart", 1);
X('Walking lunge with reach', 'lunge', 'None', 'hipflex quads', 'glutes obliques', 'Step into a long lunge.|Reach both arms overhead and lean slightly away from the front leg.|Step through into the next lunge.', 'Squeeze the back glute to deepen the hip stretch.', "World's greatest stretch|Spiderman lunge with rotation", 1);
X('90/90 hip switch', 'stretch', 'None', 'glutes adductors', 'hipflex', 'Sit with both knees bent to 90 degrees, one leg in front and one to the side.|Rotate both knees over to the other side.|Sit tall over the front shin each time.', 'Use your hands behind you at first; work toward no hands.', 'Deep squat pry|Bodyweight Cossack squat', 1);
X('Hamstring scoop', 'hinge', 'None', 'hams', 'calves lowback', 'Step one heel forward with the toes up.|Hinge at the hips and sweep both hands down past the foot and up.|Step and repeat on the other leg.', 'Back flat, hips back.', 'Leg swings|Inchworm', 1);
X('Scapular push-up', 'core', 'None', 'upperback chest', 'delts', 'Hold a straight-arm plank.|Let the chest sink between the shoulders, then push the floor away.|Arms stay straight throughout.', 'Small movement; only the shoulder blades move.', 'Band pull-apart|Cat-cow to downward dog');
X('Band pull-apart', 'pullH', 'Light band', 'rdelts upperback', 'traps', 'Hold a band at chest height with straight arms.|Pull it apart until it touches your chest.|Return slowly.', 'Ribs down; do not lean back.', 'Scapular push-up|Open-book rotation');
X('Spiderman lunge with rotation', 'stretch', 'None', 'hipflex adductors', 'upperback', 'From a plank, step one foot outside the same-side hand.|Drop the inside elbow toward the floor.|Rotate and reach to the ceiling, then switch sides.', 'Keep the back leg long and the hips low.', "World's greatest stretch|Walking lunge with reach", 1);
X('Bodyweight Cossack squat', 'lunge', 'None', 'adductors glutes', 'quads hams', 'Stand wide.|Sit deep over one heel while the other leg stays straight with toes up.|Push across to the other side.', 'Heel of the bent leg stays down.', 'Deep squat pry|90/90 hip switch', 1);
X('Glute bridge march', 'thrust', 'None', 'glutes', 'hams abs', 'Lift into a glute bridge.|Keeping the hips high and level, lift one knee, then the other.', 'If the hips drop or twist, slow down.', 'Glute bridge|Dead bug');
X('Cat-cow to downward dog', 'core', 'None', 'lowback calves', 'hams delts', 'On all fours, round the back, then arch it.|Push the hips up and back, pressing the heels toward the floor.|Return and repeat.', 'Pedal the heels to open the calves.', 'Inchworm|Knee-to-wall ankle rock', 1);
X('Knee-to-wall ankle rock', 'calf', 'Wall', 'calves', 'tib', 'Stand facing a wall with one foot a hand-width away.|Drive the knee forward to touch the wall with the heel down.|Move the foot back a little as it gets easy.', 'Knee tracks over the second toe.', 'Cat-cow to downward dog|Deficit calf raise', 1);
/* power */
X('Box jump', 'jump', 'Box or bench', 'quads glutes', 'calves hams', 'Stand a short step from a box, swing the arms and jump.|Land softly on the whole foot in a quarter squat.|Stand tall, then step down.', 'Step down, never jump down.|Choose a height you can land quietly on.|Full reset between reps: this is power, not cardio.', 'Squat jump|Broad jump|Dumbbell jump squat');
X('Squat jump', 'jump', 'None', 'quads glutes', 'calves', 'Dip to a quarter squat.|Explode straight up.|Land softly and sink into the next rep.', 'Quiet landings.|Stop the set when the jumps get lower.', 'Box jump|Broad jump|Pogo hops');
X('Broad jump', 'jump', 'None', 'glutes quads', 'hams calves', 'Swing the arms back and hinge.|Jump forward as far as you can.|Land in a quarter squat and hold for two seconds.', 'Stick the landing before you care about distance.', 'Box jump|Squat jump|Kettlebell swing');
X('Kettlebell swing', 'swing', 'Kettlebell or dumbbell', 'glutes hams', 'lowback forearms abs', 'Hike the bell back between your legs with a flat back.|Snap the hips forward so the bell floats to chest height.|Let it fall and hinge again.', 'It is a hip hinge, not a squat or a front raise.|Squeeze the glutes hard at the top.', 'Broad jump|Dumbbell Romanian deadlift|Medicine ball slam');
X('Medicine ball slam', 'throw', 'Medicine ball', 'abs lats', 'delts glutes', 'Reach the ball overhead on your toes.|Throw it into the floor as hard as you can, folding at the hips.|Catch the bounce and repeat.', 'Use a non-bouncing ball if you have one.|Whole body, not just arms.', 'Kettlebell swing|Medicine ball chest pass|Squat jump');
X('Medicine ball chest pass', 'throw', 'Medicine ball and wall', 'chest triceps', 'delts abs', 'Stand facing a wall with the ball at your chest.|Step and punch the ball into the wall as fast as you can.|Catch and reset.', 'Speed is the point: use a light ball.', 'Medicine ball slam|Explosive push-up');
X('Pogo hops', 'jump', 'None', 'calves', 'tib', 'Stand tall and hop in place on the balls of your feet.|Keep the knees almost straight and the ankles stiff.|Spend as little time on the ground as possible.', 'Quiet, quick contacts.|Stop if your shins complain.', 'Jump rope|Straight-knee calf raise');
X('Lateral skater hops', 'jump', 'None', 'glutes adductors', 'quads calves', 'Hop sideways from one foot to the other.|Land softly, hold for a beat, then hop back.', 'Knee stays over the foot on landing.', 'Lateral lunge|Alternate-leg bounds');
X('Alternate-leg bounds', 'jump', 'Open space', 'glutes hams', 'calves quads', 'Run with exaggerated, springy strides.|Drive the knee up and push the ground away behind you.', 'Think long and floaty, not fast.', 'Skipping for height|Lateral skater hops|Split-squat jump');
X('Split-squat jump', 'jump', 'None', 'quads glutes', 'calves', 'Start in a lunge.|Jump straight up and land in a lunge on the same side.|Finish the reps, then switch legs.', 'Soft landings; torso tall.', 'Squat jump|Alternate-leg bounds|Dumbbell walking lunge');
/* heavy lower */
X('Back squat', 'squat', 'Barbell and rack', 'quads glutes', 'adductors lowback hams abs', 'Set the bar on your upper back and step back, feet about shoulder width.|Take a big breath, brace, and sit down between your hips.|Go as deep as you can keep your back position, then drive up.', 'Knees track over the toes; do not let them cave in.|Keep the whole foot planted.|The breath and brace come before every rep.', 'Goblet squat|Leg press|Front squat|Dumbbell Bulgarian split squat', 1);
X('Front squat', 'squat', 'Barbell and rack', 'quads glutes', 'abs upperback adductors', 'Rest the bar on the front of your shoulders with elbows high.|Sit straight down with a tall chest.|Drive up, leading with the elbows.', 'If the wrists complain, cross the arms or use straps.|Elbows up the whole time.', 'Goblet squat|Back squat|Leg press', 1);
X('Paused back squat', 'squat', 'Barbell and rack', 'quads glutes', 'adductors lowback abs', 'Squat as normal.|Hold the bottom position for a full two seconds, staying tight.|Drive up without bouncing.', 'Use about 10% less than your normal squat.|Do not relax in the hole.', 'Back squat|Goblet squat|Leg press', 1);
X('Trap-bar deadlift', 'hinge', 'Trap (hex) bar', 'glutes hams quads', 'lowback traps forearms', 'Stand inside the bar with feet hip width.|Hinge and bend the knees to grip, chest up, back flat.|Push the floor away and stand tall; lower under control.', 'Squeeze the glutes at the top, do not lean back.|Reset each rep from a dead stop.', 'Conventional deadlift|Dumbbell Romanian deadlift|Kettlebell deadlift');
X('Conventional deadlift', 'hinge', 'Barbell', 'glutes hams lowback', 'quads traps lats forearms', 'Bar over mid-foot, feet hip width.|Hinge to grip, shins to the bar, chest up, lats tight.|Push the floor away and stand tall, bar close to the legs.', 'Flat back from start to finish.|Think "push the floor", not "pull the bar".', 'Trap-bar deadlift|Barbell Romanian deadlift|Kettlebell deadlift');
X('Barbell Romanian deadlift', 'hinge', 'Barbell', 'hams glutes', 'lowback lats forearms', 'Stand tall holding the bar.|Push the hips back with soft knees, sliding the bar down the thighs.|Stop when the hamstrings are fully stretched, then stand tall.', 'The bar never leaves your legs.|The knees bend a little and then stop.', 'Dumbbell Romanian deadlift|Trap-bar deadlift|Back extension', 1);
X('Barbell reverse lunge', 'lunge', 'Barbell or dumbbells', 'quads glutes', 'hams adductors abs', 'Take a long step back and lower the back knee toward the floor.|Keep the front shin close to vertical.|Drive through the front heel to stand.', 'All reps on one leg, then switch.|Torso tall.', 'Dumbbell walking lunge|Dumbbell Bulgarian split squat|Dumbbell step-up', 1);
X('Dumbbell step-up', 'lunge', 'Box and dumbbells', 'quads glutes', 'hams calves', 'Put one whole foot on a knee-high box.|Stand up without pushing off the bottom leg.|Lower for three seconds.', 'Lean slightly forward; keep the hips level.', 'Barbell reverse lunge|Dumbbell Bulgarian split squat|Leg press (single leg)');
X('Front-foot-elevated split squat', 'lunge', 'Low plate and dumbbells', 'quads glutes', 'hipflex adductors', 'Front foot on a low plate, back foot behind you on the toes.|Sink straight down until the back knee nearly touches.|Drive up through the front foot.', 'The raised front foot allows a deeper stretch for the back hip.', 'Dumbbell Bulgarian split squat|Barbell reverse lunge|Dumbbell walking lunge', 1);
/* heavy upper */
X('Barbell bench press', 'pushH', 'Barbell and bench', 'chest triceps', 'delts', 'Lie with eyes under the bar, shoulder blades squeezed back and down.|Lower the bar to the lower chest with elbows about 45 degrees out.|Press up and slightly back.', 'Feet planted, glutes on the bench.|Use a spotter or safety arms for heavy sets.', 'Dumbbell bench press|Weighted push-up|Machine chest press');
X('Dumbbell bench press', 'pushH', 'Dumbbells and bench', 'chest triceps', 'delts', 'Lie back with the dumbbells over your chest.|Lower them beside the chest for a deep stretch.|Press up and slightly in.', 'Shoulder blades pinned back.|Control the bottom; no bouncing.', 'Barbell bench press|Weighted push-up|Machine chest press', 1);
X('Incline dumbbell press', 'pushH', 'Dumbbells and incline bench', 'chest delts', 'triceps', 'Set the bench to about 30 degrees.|Lower the dumbbells to the upper chest for a deep stretch.|Press up over the collarbones.', 'Elbows about 45 degrees from the body.', 'Dumbbell bench press|Landmine press|Weighted push-up', 1);
X('Weighted push-up', 'pushH', 'Plates or handles', 'chest triceps', 'delts abs', 'Hands on plates or handles so the chest can sink below the hands.|Lower in one straight line.|Push the floor away.', 'Add a plate on your back or a band when 10 reps is easy.|Squeeze glutes so the hips do not sag.', 'Dumbbell bench press|Push-up|Machine chest press', 1);
X('Standing barbell overhead press', 'pushV', 'Barbell', 'delts triceps', 'traps abs upperback', 'Bar on the front of the shoulders, grip just outside them.|Squeeze glutes, ribs down, and press straight up.|Move your head "through the window" at the top.', 'Do not lean back; if you have to, the weight is too heavy.', 'Seated dumbbell overhead press|Landmine press|Push press');
X('Seated dumbbell overhead press', 'pushV', 'Dumbbells and bench', 'delts triceps', 'traps', 'Sit tall with dumbbells at ear height.|Press straight up until the arms are straight.|Lower slowly to ear height.', 'Ribs down, back against the pad.', 'Standing barbell overhead press|Dumbbell Arnold press|Landmine press', 1);
X('Push press', 'pushV', 'Barbell', 'delts triceps', 'quads glutes abs', 'Bar on the front of the shoulders.|Dip a few inches at the knees and drive up hard.|Use the leg drive to punch the bar overhead; lower under control.', 'The dip is short and straight down.', 'Standing barbell overhead press|Seated dumbbell overhead press|Landmine press');
X('Landmine press', 'pushV', 'Barbell in a corner or landmine', 'delts chest', 'triceps abs', 'Half-kneel holding the end of the bar at your shoulder.|Press up and forward, reaching long at the top.|Lower slowly.', 'Friendly on shoulders that dislike straight overhead pressing.', 'Seated dumbbell overhead press|Incline dumbbell press|Dumbbell Arnold press');
X('Dumbbell Arnold press', 'pushV', 'Dumbbells', 'delts', 'triceps traps', 'Start with palms facing you at chin height.|Rotate the palms forward as you press overhead.|Reverse on the way down.', 'Smooth rotation; lighter than a normal press.', 'Seated dumbbell overhead press|Standing barbell overhead press|Landmine press', 1);
X('One-arm dumbbell row', 'pullH', 'Dumbbell and bench', 'lats upperback', 'biceps rdelts forearms', 'One hand and knee on a bench, back flat.|Let the dumbbell hang and the shoulder blade reach forward.|Pull the elbow to the hip and pause.', 'No twisting to cheat the weight up.', 'Chest-supported dumbbell row|Seated cable row|Inverted row', 1);
X('Chest-supported dumbbell row', 'pullH', 'Dumbbells and incline bench', 'upperback lats', 'biceps rdelts', 'Lie chest-down on an incline bench.|Reach long at the bottom.|Pull the elbows back and pause.', 'The bench stops you cheating: keep the chest on it.', 'One-arm dumbbell row|Seated cable row|Barbell bent-over row', 1);
X('Seated cable row', 'pullH', 'Cable machine', 'lats upperback', 'biceps rdelts', 'Sit tall with a slight knee bend.|Reach forward and let the lats stretch.|Pull to the lower ribs without leaning back.', 'Pause for a second with the shoulder blades squeezed.', 'Chest-supported dumbbell row|One-arm dumbbell row|Inverted row', 1);
X('Barbell bent-over row', 'pullH', 'Barbell', 'lats upperback', 'lowback biceps hams', 'Hinge to about 45 degrees with a flat back.|Pull the bar to the belly button.|Lower under control.', 'Torso stays still; if it bounces, go lighter.', 'Chest-supported dumbbell row|One-arm dumbbell row|Seated cable row');
X('Inverted row', 'pullH', 'Bar in a rack or rings', 'upperback lats', 'biceps abs', 'Hang under a bar with the body in one line.|Pull the chest to the bar.|Lower to straight arms.', 'Walk the feet forward or raise them to make it harder.', 'Seated cable row|One-arm dumbbell row|Chest-supported dumbbell row');
X('Pull-up', 'pullV', 'Pull-up bar', 'lats', 'biceps upperback forearms abs', 'Hang from the bar with palms away, arms straight.|Pull the elbows down to your ribs until the chin clears the bar.|Lower all the way to a dead hang.', 'Use a band or the assisted machine if you cannot get 5 reps.|No kicking.', 'Lat pulldown|Chin-up|Neutral-grip lat pulldown', 1);
X('Chin-up', 'pullV', 'Pull-up bar', 'lats biceps', 'upperback forearms', 'Hang with palms facing you.|Pull the chest to the bar.|Lower to a full hang.', 'Easier on the elbows than it looks if you keep the shoulders down.', 'Lat pulldown|Pull-up|Neutral-grip lat pulldown', 1);
X('Lat pulldown', 'pullV', 'Cable machine', 'lats', 'biceps upperback', 'Grip just outside shoulder width and reach all the way up.|Pull the bar to the upper chest, elbows down to the ribs.|Return slowly to a full stretch.', 'Slight lean back only; do not turn it into a row.', 'Pull-up|Chin-up|Neutral-grip lat pulldown', 1);
X('Neutral-grip lat pulldown', 'pullV', 'Cable machine', 'lats', 'biceps upperback', 'Use the handle with palms facing each other.|Pull to the upper chest.|Return to a full reach.', 'The neutral grip is the kindest on the shoulders.', 'Lat pulldown|Chin-up|Pull-up', 1);
/* finishers */
X('Dumbbell Romanian deadlift', 'hinge', 'Dumbbells', 'hams glutes', 'lowback forearms', 'Stand tall with dumbbells on the thighs.|Push the hips back with soft knees, lowering for three seconds.|Feel the hamstrings stretch, then stand.', 'Back flat; the weights stay close to the legs.', 'Barbell Romanian deadlift|Dumbbell single-leg Romanian deadlift|Back extension', 1);
X('Dumbbell single-leg Romanian deadlift', 'hinge', 'Dumbbell', 'hams glutes', 'lowback calves abs', 'Stand on one leg with a soft knee.|Hinge forward, reaching the other leg long behind you.|Stop when the hamstring is stretched, then stand tall.', 'Hips stay square to the floor.|Touch a wall for balance if you need it.', 'Dumbbell Romanian deadlift|Single-leg hip thrust|Back extension', 1);
X('Dumbbell Bulgarian split squat', 'lunge', 'Bench and dumbbells', 'quads glutes', 'hipflex adductors hams', 'Rear foot on a bench behind you.|Drop straight down until the back hip stretches.|Drive through the front heel.', 'Front foot far enough forward that the heel stays down.', 'Front-foot-elevated split squat|Barbell reverse lunge|Dumbbell walking lunge', 1);
X('Dumbbell walking lunge', 'lunge', 'Dumbbells', 'quads glutes', 'hams adductors', 'Take a long step and lower the back knee to just above the floor.|Push through the front foot and step into the next lunge.', 'Tall torso; front knee over the middle toes.', 'Barbell reverse lunge|Dumbbell Bulgarian split squat|Dumbbell step-up', 1);
X('Cossack squat', 'lunge', 'Light dumbbell or plate', 'adductors glutes', 'quads hams', 'Stand wide holding a light weight in front of you.|Sit deep over one heel with the other leg straight, toes up.|Push across to the other side.', 'Go only as deep as the heel stays down.', 'Lateral lunge|Copenhagen plank|Deep squat pry', 1);
X('Nordic hamstring curl', 'hinge', 'Something to anchor the ankles', 'hams', 'glutes calves', 'Kneel with the ankles anchored.|Keeping hips straight, lower your body toward the floor as slowly as you can.|Catch yourself and push back up with your hands.', 'One of the best-studied exercises for preventing hamstring strains.|Start with just the lowering.', 'Stability-ball hamstring curl|Dumbbell Romanian deadlift|Seated leg curl', 1);
X('Copenhagen plank', 'core', 'Bench', 'adductors', 'obliques abs', 'Side plank with the top leg on a bench.|Lift the hips and the bottom leg.|Hold.', 'Bend the top knee on the bench to make it easier.', 'Cossack squat|Side plank|Lateral lunge');
X('Barbell hip thrust', 'thrust', 'Barbell and bench', 'glutes', 'hams', 'Shoulders against a bench, bar over the hips.|Tuck the chin and drive the hips up until the body is flat.|Pause two seconds and lower.', 'Shins vertical at the top.|Do not arch the lower back.', 'Single-leg hip thrust|Glute bridge|Dumbbell Romanian deadlift');
X('Single-leg hip thrust', 'thrust', 'Bench', 'glutes', 'hams abs', 'Shoulders on a bench, one foot on the floor.|Drive the hips up level and pause.|Lower slowly.', 'Hips stay level; no twisting.', 'Barbell hip thrust|Glute bridge|Dumbbell single-leg Romanian deadlift');
X('Glute bridge', 'thrust', 'None', 'glutes', 'hams', 'Lie on your back with knees bent.|Push through the heels and lift the hips.|Squeeze at the top for two seconds.', 'Ribs down; the glutes do the work, not the lower back.', 'Barbell hip thrust|Single-leg hip thrust');
X('Tibialis raise (wall)', 'calf', 'Wall', 'tib', '', 'Lean your back against a wall with heels about a foot away.|Pull the toes up as high as you can.|Lower slowly.', 'This is your shin-splint insurance: do it every gym day.|Move the feet further out to make it harder.', 'Banded dorsiflexion|Heel walks|Tib-bar raise');
X('Deficit calf raise', 'calf', 'Step', 'calves', '', 'Stand with the balls of the feet on a step.|Sink the heels into a deep stretch for two seconds.|Rise all the way up and pause.', 'Slow down: three seconds on the way down.', 'Eccentric heel drop (single leg)|Straight-knee calf raise|Soleus raise (bent knee)', 1);
X('Eccentric heel drop (single leg)', 'calf', 'Step', 'calves', '', 'Rise on two feet on the edge of a step.|Shift to one foot and lower the heel over three seconds into a full stretch.|Repeat.', 'A staple for Achilles and calf durability.', 'Deficit calf raise|Soleus raise (bent knee)|Straight-knee calf raise', 1);
X('Soleus raise (bent knee)', 'calf', 'Dumbbell or machine', 'calves', '', 'Sit with knees bent 90 degrees and a weight on the thighs.|Raise the heels as high as you can.|Lower for three seconds and pause at the bottom.', 'The soleus takes most of the load when you run, and it likes heavy weight.', 'Seated calf raise machine|Eccentric heel drop (single leg)|Deficit calf raise', 1);
X('Straight-knee calf raise', 'calf', 'None', 'calves', '', 'Stand tall and rise onto the balls of the feet.|Pause, then lower slowly.', 'Two seconds up, two seconds down.', 'Deficit calf raise|Eccentric heel drop (single leg)');
X('Hanging knee raise', 'core', 'Pull-up bar', 'abs hipflex', 'forearms obliques', 'Hang from a bar.|Curl the pelvis up and bring the knees to the chest.|Lower slowly to a full hang.', 'No swinging.', 'Dead bug|Reverse crunch|Hollow hold', 1);
X('Pallof press', 'core', 'Cable or band', 'obliques abs', 'glutes', 'Stand side-on to a cable held at your chest.|Press the hands straight out and resist the twist.|Bring them back in.', 'Hips and shoulders stay square.', 'Side plank|Suitcase carry|Dead bug');
X('Dead bug', 'core', 'None', 'abs', 'hipflex obliques', 'Lie on your back, arms up, knees over hips.|Lower the opposite arm and leg toward the floor.|Return and switch.', 'The lower back stays glued to the floor.', 'Hollow hold|Pallof press|Plank');
X('Side plank', 'core', 'None', 'obliques', 'glutes abs delts', 'Lie on your side, elbow under the shoulder.|Lift the hips into a straight line.|Hold.', 'Hips forward; do not fold at the waist.', 'Copenhagen plank|Pallof press|Suitcase carry');
X('Suitcase carry', 'carry', 'One heavy dumbbell', 'obliques forearms', 'traps abs glutes', 'Hold one heavy dumbbell at your side.|Walk tall without leaning.|Switch hands.', 'Go heavy: it should be hard to stay upright.', 'Pallof press|Side plank|Farmer carry');
X('Dumbbell pullover', 'pushH', 'Dumbbell and bench', 'lats chest', 'triceps abs', 'Lie across or along a bench holding one dumbbell over your chest.|Lower it behind your head with slightly bent elbows.|Pull it back over the chest.', 'Ribs down; feel the stretch in the lats.', 'Straight-arm cable pulldown|Lat pulldown', 1);
X('Incline dumbbell curl', 'curl', 'Dumbbells and incline bench', 'biceps', 'forearms', 'Lie back on an incline so the arms hang behind you.|Curl without letting the elbows drift forward.|Lower to a full stretch.', 'Lighter than a standing curl.', 'Dumbbell curl|Cable curl|Chin-up', 1);
X('Dumbbell jump squat', 'jump', 'Light dumbbells', 'quads glutes', 'calves', 'Hold light dumbbells at your sides.|Dip and jump.|Land softly.', 'Very light weights only.', 'Squat jump|Box jump');
X('Goblet squat', 'squat', 'Dumbbell or kettlebell', 'quads glutes', 'abs adductors upperback', 'Hold a dumbbell against your chest.|Sit down between the hips, elbows inside the knees.|Stand tall.', 'The best squat to learn with.', 'Back squat|Front squat|Leg press', 1);
X('Leg press', 'squat', 'Leg press machine', 'quads glutes', 'adductors hams', 'Feet shoulder width on the platform.|Lower until the knees are at about 90 degrees.|Press without locking the knees hard.', 'Keep the lower back on the pad.', 'Goblet squat|Back squat|Dumbbell Bulgarian split squat');
X('Push-up', 'pushH', 'None', 'chest triceps', 'delts abs', 'Hands just outside the shoulders, body in one line.|Lower the chest to the floor.|Push the floor away.', 'Hands on a bench to make it easier.', 'Dumbbell bench press|Weighted push-up');
X('Plank', 'core', 'None', 'abs', 'delts glutes obliques', 'Elbows under shoulders, body in one line.|Squeeze glutes and quads.|Hold.', 'Stop when the hips sag.', 'Dead bug|Hollow hold');
X('Hollow hold', 'core', 'None', 'abs', 'hipflex', 'Lie on your back, press the lower back down.|Lift shoulders and legs a few inches.|Hold.', 'Bend the knees to make it easier.', 'Dead bug|Plank');
var PAT_WORDS = [['squat', /squat|leg press/i], ['hinge', /deadlift|rdl|good morning|back extension|curl.*ham|hamstring/i], ['lunge', /lunge|split|step-up|step up/i], ['pushV', /overhead|shoulder press|arnold|pike/i], ['pushH', /press|push-up|dip/i], ['pullV', /pull-up|chin|pulldown/i], ['pullH', /row|pull-apart/i], ['jump', /jump|hop|bound|skip/i], ['calf', /calf|heel|tibialis|soleus|ankle|foot/i], ['thrust', /thrust|bridge/i], ['carry', /carry/i], ['curl', /curl|triceps/i], ['core', /plank|bug|hollow|crunch|raise|pallof/i]];
function exInfo(n) {
  if (EXDB[n]) return EXDB[n];
  var pat = 'core'; PAT_WORDS.some(function (p) { if (p[1].test(n)) { pat = p[0]; return true; } return false; });
  var m = { squat: ['quads glutes', 'adductors'], hinge: ['hams glutes', 'lowback'], lunge: ['quads glutes', 'hams'], pushH: ['chest triceps', 'delts'], pushV: ['delts triceps', 'traps'], pullH: ['lats upperback', 'biceps'], pullV: ['lats', 'biceps'], jump: ['quads glutes', 'calves'], calf: ['calves', 'tib'], thrust: ['glutes', 'hams'], carry: ['obliques forearms', 'traps'], curl: ['biceps', 'forearms'], core: ['abs', 'obliques'] }[pat];
  var mod = findEx(n);
  return { n: n, pat: pat, eq: '', pri: m[0].split(' '), sec: m[1].split(' '), how: [mod ? mod.cue : 'Move with control through the fullest range you can hold good form in.'], tips: ['Start light and add weight only when every rep looks the same.'], subs: [], deep: false, generic: true };
}
/* substitutes: listed ones first, then anything else with the same movement pattern */
function subsFor(n) {
  var e = exInfo(n), out = e.subs.slice();
  Object.keys(EXDB).forEach(function (k) { var x = EXDB[k]; if (k !== n && x.pat === e.pat && out.indexOf(k) < 0 && x.pri[0] === e.pri[0] && !(findEx(k) || {}).wu) out.push(k); });
  return out.slice(0, 7);
}

/* ---------- movement diagrams (start and finish) ---------- */
/* pose: head, shoulder, hip, knee, ankle, elbow, hand as x,y pairs (side view, ground at y=100); extras: k2/a2 back leg, bar, bench, box, step */
var ST = [60, 18, 60, 30, 60, 58, 61, 79, 60, 100, 63, 46, 62, 62];
var POSES = {
  squat: [{ p: [60, 18, 60, 30, 60, 58, 62, 79, 60, 100, 68, 38, 62, 30], bar: [60, 28] }, { p: [68, 46, 63, 56, 44, 76, 72, 78, 60, 100, 70, 64, 64, 56], bar: [63, 54] }],
  hinge: [{ p: [88, 44, 79, 51, 47, 58, 55, 80, 53, 100, 79, 68, 78, 84], bar: [78, 86] }, { p: ST, bar: [62, 64] }],
  lunge: [{ p: ST }, { p: [60, 32, 60, 44, 58, 72, 80, 78, 80, 100, 62, 60, 60, 74], k2: [46, 94], a2: [28, 92] }],
  pushH: [{ p: [32, 60, 44, 64, 76, 64, 92, 70, 92, 98, 44, 48, 44, 34], bar: [44, 32], bench: 1 }, { p: [32, 60, 44, 64, 76, 64, 92, 70, 92, 98, 56, 72, 46, 56], bar: [46, 54], bench: 1 }],
  pushV: [{ p: [60, 18, 60, 30, 60, 58, 61, 79, 60, 100, 70, 42, 66, 28], bar: [66, 26] }, { p: [60, 18, 60, 30, 60, 58, 61, 79, 60, 100, 63, 14, 63, 0], bar: [63, -2] }],
  pullH: [{ p: [88, 44, 79, 51, 47, 58, 55, 80, 53, 100, 80, 68, 80, 84], bar: [80, 86] }, { p: [88, 44, 79, 51, 47, 58, 55, 80, 53, 100, 64, 52, 76, 64], bar: [76, 66] }],
  pullV: [{ p: [54, 30, 60, 38, 60, 66, 63, 84, 60, 100, 60, 22, 60, 8], top: 1 }, { p: [54, 12, 60, 20, 60, 48, 66, 64, 60, 80, 70, 26, 60, 8], top: 1 }],
  jump: [{ p: [68, 40, 63, 50, 48, 68, 70, 78, 60, 100, 52, 60, 42, 68] }, { p: [60, 4, 60, 16, 60, 44, 62, 64, 60, 84, 64, 4, 68, -8], air: 1 }],
  calf: [{ p: ST, step: 1 }, { p: [60, 11, 60, 23, 60, 51, 61, 72, 60, 93, 63, 39, 62, 55], step: 1, toes: 1 }],
  thrust: [{ p: [28, 54, 38, 62, 62, 86, 84, 70, 86, 100, 50, 76, 60, 82], bench2: 1 }, { p: [28, 58, 38, 62, 62, 62, 84, 64, 86, 100, 50, 60, 60, 60], bench2: 1 }],
  swing: [{ p: [84, 46, 76, 52, 46, 58, 55, 80, 53, 100, 66, 64, 54, 74], bar: [52, 76] }, { p: [60, 18, 60, 30, 60, 58, 61, 79, 60, 100, 74, 33, 90, 34], bar: [93, 34] }],
  throw: [{ p: [60, 18, 60, 30, 60, 58, 61, 79, 60, 100, 63, 14, 63, 0], bar: [63, -3] }, { p: [84, 50, 76, 54, 48, 60, 56, 82, 54, 100, 78, 72, 76, 88], bar: [76, 94] }],
  curl: [{ p: ST, bar: [62, 64] }, { p: [60, 18, 60, 30, 60, 58, 61, 79, 60, 100, 63, 46, 70, 32], bar: [71, 30] }],
  core: [{ p: [98, 70, 88, 76, 56, 82, 36, 88, 16, 94, 88, 96, 100, 96] }],
  carry: [{ p: ST, bar: [62, 66] }],
  stretch: [{ p: ST }, { p: [64, 30, 62, 42, 58, 72, 80, 78, 80, 100, 64, 26, 68, 10], k2: [44, 94], a2: [26, 96] }]
};
function figSVG(pose) {
  var p = pose.p, s = '';
  var L = function (a, b, c, d, w) { return '<line x1="' + a + '" y1="' + b + '" x2="' + c + '" y2="' + d + '" stroke-width="' + (w || 5) + '"/>'; };
  s += '<line x1="6" y1="102" x2="114" y2="102" stroke="var(--line2)" stroke-width="2"/>';
  if (pose.bench) s += '<rect x="26" y="68" width="60" height="6" rx="2" fill="var(--line2)" stroke="none"/><line x1="36" y1="74" x2="36" y2="102" stroke="var(--line2)" stroke-width="3"/><line x1="78" y1="74" x2="78" y2="102" stroke="var(--line2)" stroke-width="3"/>';
  if (pose.bench2) s += '<rect x="14" y="66" width="30" height="36" rx="3" fill="var(--line2)" stroke="none"/>';
  if (pose.step) s += '<rect x="40" y="' + (pose.toes ? 96 : 100) + '" width="26" height="8" rx="2" fill="var(--line2)" stroke="none" transform="translate(0,' + (pose.toes ? 4 : 2) + ')"/>';
  if (pose.top) s += '<line x1="36" y1="6" x2="84" y2="6" stroke="var(--line2)" stroke-width="4"/>';
  if (pose.k2) s += '<g opacity=".55">' + L(p[4], p[5], pose.k2[0], pose.k2[1]) + L(pose.k2[0], pose.k2[1], pose.a2[0], pose.a2[1]) + '</g>';
  s += L(p[2], p[3], p[4], p[5], 7) + L(p[4], p[5], p[6], p[7]) + L(p[6], p[7], p[8], p[9]) + L(p[8], p[9], p[8] + 9, p[9], 4);
  s += L(p[2], p[3], p[10], p[11], 4) + L(p[10], p[11], p[12], p[13], 4);
  s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="8" fill="currentColor" stroke="none"/>';
  if (pose.bar) s += '<circle cx="' + pose.bar[0] + '" cy="' + pose.bar[1] + '" r="6" fill="var(--blue)" stroke="none"/>';
  return '<svg viewBox="0 -14 120 122" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' + s + '</svg>';
}
function diagram(n) {
  var ps = POSES[exInfo(n).pat] || POSES.core;
  return '<div class="exdiag">' + ps.map(function (p, i) { return '<figure>' + figSVG(p) + '<figcaption>' + (ps.length === 1 ? 'Hold' : i === 0 ? 'Start' : 'Finish') + '</figcaption></figure>'; }).join(ps.length > 1 ? '<span class="arrow">→</span>' : '') + '</div>';
}

/* ---------- muscle map: front and back ---------- */
var MUSCLE_NAME = { quads: 'Quads', hams: 'Hamstrings', glutes: 'Glutes', calves: 'Calves', tib: 'Shins (tibialis)', adductors: 'Inner thigh', hipflex: 'Hip flexors', abs: 'Abs', obliques: 'Obliques', lowback: 'Lower back', lats: 'Lats', traps: 'Traps', upperback: 'Upper back', chest: 'Chest', delts: 'Shoulders', rdelts: 'Rear shoulders', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms' };
function muscleMap(pri, sec) {
  var cls = function (k) { return pri.indexOf(k) >= 0 ? 'p' : sec.indexOf(k) >= 0 ? 's' : ''; };
  var el = function (k, cx, cy, rx, ry) { return '<ellipse class="' + cls(k) + '" cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '"/>'; };
  var pair = function (k, c, dx, cy, rx, ry) { return el(k, c - dx, cy, rx, ry) + el(k, c + dx, cy, rx, ry); };
  var body = function (c) { return '<g class="body"><circle cx="' + c + '" cy="13" r="9"/><rect x="' + (c - 4) + '" y="20" width="8" height="8"/><path d="M' + (c - 20) + ' 28 Q' + c + ' 22 ' + (c + 20) + ' 28 L' + (c + 17) + ' 84 Q' + c + ' 92 ' + (c - 17) + ' 84 Z"/><rect x="' + (c - 33) + '" y="28" width="11" height="38" rx="5.500"/><rect x="' + (c + 22) + '" y="28" width="11" height="38" rx="5.500"/><rect x="' + (c - 36) + '" y="62" width="10" height="34" rx="5"/><rect x="' + (c + 26) + '" y="62" width="10" height="34" rx="5"/><rect x="' + (c - 20) + '" y="82" width="19" height="56" rx="9"/><rect x="' + (c + 1) + '" y="82" width="19" height="56" rx="9"/><rect x="' + (c - 18) + '" y="134" width="14" height="52" rx="7"/><rect x="' + (c + 4) + '" y="134" width="14" height="52" rx="7"/></g>'; };
  var f = 52, b = 158;
  var s = '<svg class="musc" viewBox="0 0 210 204" role="img" aria-label="Muscles worked">' + body(f) + body(b);
  /* front */
  s += pair('delts', f, 23, 33, 7, 6) + pair('chest', f, 9, 41, 9, 7) + pair('biceps', f, 27.5, 49, 5, 10) + pair('forearms', f, 31, 76, 4.5, 12) + '<rect class="' + cls('abs') + '" x="' + (f - 8) + '" y="50" width="16" height="28" rx="5"/>' + pair('obliques', f, 14, 63, 3.5, 11) + pair('hipflex', f, 9, 87, 6, 4.5) + pair('quads', f, 11, 112, 7.5, 20) + pair('adductors', f, 3, 104, 3, 13) + pair('tib', f, 11, 158, 4.5, 17);
  /* back */
  s += '<path class="' + cls('traps') + '" d="M' + b + ' 22 L' + (b + 15) + ' 33 L' + b + ' 52 L' + (b - 15) + ' 33 Z"/>' + pair('rdelts', b, 23, 33, 7, 6) + pair('upperback', b, 10, 44, 6, 7) + pair('lats', b, 13, 60, 6.5, 13) + pair('triceps', b, 27.5, 49, 5, 10) + pair('forearms', b, 31, 76, 4.5, 12) + '<rect class="' + cls('lowback') + '" x="' + (b - 6) + '" y="64" width="12" height="18" rx="4"/>' + pair('glutes', b, 9.5, 92, 9, 9) + pair('hams', b, 11, 118, 7.5, 16) + pair('calves', b, 11, 154, 6, 15);
  s += '<text x="' + f + '" y="200" text-anchor="middle">Front</text><text x="' + b + '" y="200" text-anchor="middle">Back</text></svg>';
  return s + '<div class="legend" style="justify-content:center"><span><i class="dot" style="background:var(--red)"></i>Main: ' + pri.map(function (k) { return MUSCLE_NAME[k] || k; }).join(', ') + '</span>' + (sec.length ? '<span><i class="dot" style="background:var(--amber)"></i>Also: ' + sec.map(function (k) { return MUSCLE_NAME[k] || k; }).join(', ') + '</span>' : '') + '</div>';
}

/* ---------- exercise sheet ---------- */
function exBtn(n, extra) { return '<button class="exlink" data-act="sheet" data-arg="' + jattr(Object.assign({ sheet: 'exinfo', n: n }, extra || {})) + '">' + esc(n) + '<span class="info">i</span></button>'; }
SHEETS.exinfo = function (a) {
  var e = exInfo(a.n), inWk = a.i != null && App.wk && App.wk.ex[a.i];
  var orig = a.orig || (inWk && App.wk.ex[a.i].orig) || null;
  var subs = subsFor(orig || a.n).filter(function (x) { return x !== a.n; });
  if (orig && orig !== a.n) subs.unshift(orig);
  var h = liftHistory(a.n), best = h.reduce(function (m, x) { return Math.max(m, x.e1); }, 0);
  return '<h3>' + esc(a.n) + '</h3><div class="tagsrow">' + (e.eq ? '<i>' + esc(e.eq) + '</i>' : '') + (e.deep ? '<i class="deep">Deep stretch</i>' : '') + (best ? '<i>Your e1RM ' + best + ' lb</i>' : '') + '</div>' +
    diagram(a.n) + '<p class="tiny muted" style="text-align:center">Simple movement diagram. <a href="https://www.youtube.com/results?search_query=' + encodeURIComponent(a.n + ' proper form') + '" target="_blank" rel="noopener">Watch a video demo ↗</a></p>' +
    '<h4>How to do it</h4><ol class="num small">' + e.how.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' +
    '<h4>Form tips</h4><ul class="plain small">' + e.tips.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
    '<h4>Muscles worked</h4>' + muscleMap(e.pri, e.sec) +
    (subs.length ? '<h4>No equipment today? Swap it</h4><p class="tiny muted">' + (inWk ? 'Tap one to use it in this workout.' : 'Tap one to use it from now on in place of this exercise.') + '</p><div class="stack tight">' + subs.map(function (s) { var x = exInfo(s); return '<button class="btn sublink" data-act="ex-sub" data-arg="' + jattr({ from: orig || a.n, to: s, i: a.i }) + '"><span>' + esc(s) + (s === orig ? ' (the planned lift)' : '') + '</span><span class="tiny muted">' + esc(x.eq || '') + '</span></button>'; }).join('') + '</div>' +
      (inWk ? '<label class="check" style="margin-top:8px"><input type="checkbox" id="sub-always"> Always use my swap in future workouts</label>' : '') : '') +
    '<div class="btns" style="margin-top:6px">' + (h.length ? '<button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'exhist', n: a.n }) + '">My history</button>' : '') + '<button class="btn ghost" data-act="sheet-close">Close</button></div>';
};
ACTIONS['ex-sub'] = function (a) {
  var back = a.to === a.from;
  if (a.i != null && App.wk && App.wk.ex[a.i]) {
    var x = App.wk.ex[a.i], always = $('#sub-always') && $('#sub-always').checked, prev = liftHistory(a.to, App.wk.date).pop();
    x.n = a.to; x.orig = back ? null : a.from; x.cue = back ? ((findEx(a.to) || {}).cue || '') : 'Your swap for ' + a.from + '.';
    x.sets.forEach(function (s, j) { if (!s.done) { var p = prev && (prev.sets[j] || prev.sets[prev.sets.length - 1]); s.w = p && p.w ? p.w : ''; } });
    App.wk.touched = true; wkSave();
    if (always || back) Store.edit('subs', a.from, function (S) { S.subs = S.subs || {}; if (back) delete S.subs[a.from]; else S.subs[a.from] = a.to; });
    closeSheet(); render(); toast(back ? 'Back to ' + a.to : 'Swapped to ' + a.to + (always ? ' from now on' : ' for today'));
    return;
  }
  Store.edit('subs', a.from, function (S) { S.subs = S.subs || {}; if (back) delete S.subs[a.from]; else S.subs[a.from] = a.to; });
  closeSheet(); toast(back ? 'Back to ' + a.to : a.to + ' will replace ' + a.from);
};
ACTIONS['sub-clear'] = function (a) { Store.edit('subs', a.from, function (S) { if (S.subs) delete S.subs[a.from]; }); toast('Swap removed'); };

/* session listing with tappable exercises and your swaps applied */
moduleBody = function (key, lp, v) {
  var m = E.liftMod(key, v); if (!m) return '';
  var subs = st().subs || {};
  return m.blocks.map(function (b) {
    return '<div class="block-h"><span>' + esc(b.t) + '</span><span>' + b.min + ' min</span></div>' + b.ex.map(function (e) {
      var n = subs[e.n] || e.n;
      return '<div class="ex"><div class="n">' + exBtn(n, subs[e.n] ? { orig: e.n } : null) + (subs[e.n] ? '<div class="tiny muted">your swap for ' + esc(e.n) + '</div>' : '') + '</div><div class="rx">' + esc(e.rx[lp]) + (e.rest[lp] && e.rest[lp] !== '–' ? '<div class="tiny muted">rest ' + esc(e.rest[lp]) + '</div>' : '') + '</div><div class="cue">' + esc(subs[e.n] ? exInfo(n).tips[0] : e.cue) + '</div></div>';
    }).join('');
  }).join('');
};
VIEWS.strength = function () {
  var w = App.week, prof = st().profile || {};
  var wkPart = w && w.days ? w.days.map(function (d) { return d.parts.filter(function (x) { return x.type === 'strength'; })[0]; }).filter(Boolean)[0] : null;
  var lp = App.ui.lp != null ? App.ui.lp : wkPart ? wkPart.lp : 0;
  var curV = E.liftVar(w ? w.n : 1), v = App.ui.lv != null ? App.ui.lv : curV;
  var mods = ['A', 'B', 'C', 'UB', 'HT', 'ACT'].filter(function (k) { return E.LIFT[k]; });
  var sel = App.args[0] && E.LIFT[App.args[0]] ? App.args[0] : App.ui.mod;
  var has = !!E.LIFT_VARS[sel], m = E.liftMod(sel, v), total = m.blocks.reduce(function (a, b) { return a + b.min; }, 0);
  var html = '<div class="pagehead"><h1>Strength</h1><p>Every gym day runs about 45 minutes in the same order: a dynamic stretch, explosive lifts, heavy full-body compound lifts, then muscle-specific finishers. Days A, B and C are all full-body but lead with a different pattern, and each has three versions that rotate every four weeks so you keep progressing. Tap any exercise for how to do it, the muscles it works and swaps.</p></div>';
  html += '<div class="seg" role="group" aria-label="Phase">' + E.LIFT_PHASES.map(function (p, i) { return '<button data-act="lp" data-arg="' + jattr({ lp: i }) + '" aria-pressed="' + (i === lp) + '">' + p.k + '</button>'; }).join('') + '</div><p class="small muted">' + esc(E.LIFT_PHASES[lp].d) + '</p>';
  html += '<div class="chips">' + mods.map(function (k) { return '<button class="chip" data-act="mod" data-arg="' + jattr({ mod: k }) + '" aria-pressed="' + (k === sel) + '">' + (k.length === 1 ? 'Day ' + k + ': ' : '') + E.LIFT[k].name + '</button>'; }).join('') + '</div>';
  if (has) html += '<div class="seg" role="group" aria-label="Version">' + [0, 1, 2].map(function (i) { return '<button data-act="ui" data-arg="' + jattr({ k: 'lv', v: i }) + '" aria-pressed="' + (i === v) + '">Version ' + (i + 1) + (i === curV ? ' · now' : '') + '</button>'; }).join('') + '</div><p class="tiny muted">You are on version ' + (curV + 1) + ' for plan weeks ' + (Math.floor(((w ? w.n : 1) - 1) / 4) * 4 + 1) + '–' + (Math.floor(((w ? w.n : 1) - 1) / 4) * 4 + 4) + '. The next version starts automatically after that.</p>';
  html += '<section class="card t-strength" style="border-left:4px solid var(--c)"><h2>' + esc(sel.length === 1 ? 'Strength ' + sel + ': ' + m.name : m.name) + '</h2><p class="small muted">' + total + ' min · ' + esc(m.focus) + '</p>' + moduleBody(sel, lp, v) +
    '<div class="btns" style="margin-top:10px"><a class="btn sm primary" href="#/workout/' + App.today + '/' + sel + '">Start this workout today</a></div></section>';
  var subs = st().subs || {}, sk = Object.keys(subs);
  if (sk.length) html += '<section class="card"><h3>Your swaps</h3>' + sk.map(function (k) { return '<div class="list-item"><div class="n small"><b>' + esc(subs[k]) + '</b></div><div class="d"><button class="btn sm ghost" data-act="sub-clear" data-arg="' + jattr({ from: k }) + '">Undo</button></div><div class="c">instead of ' + esc(k) + '</div></div>'; }).join('') + '</section>';
  html += '<section class="card"><h3>How the app tailors lifting</h3><ul class="plain small" style="margin-top:6px"><li><b>Heavy means heavy.</b> Compound lifts work up to sets of 3–6 at an effort that leaves two reps in reserve; research on runners finds near-maximal loads improve running economy most.</li><li><b>Full body, staggered.</b> Squat, hinge and single-leg patterns lead on different days, each paired with a push and a pull, so no pattern is hit hard twice in a row.</li><li><b>Deep ranges.</b> Many lifts are chosen or cued for a loaded stretch (deep squats, Romanian deadlifts, split squats, dead hangs, deficit calf raises), which builds flexibility along with strength.</li><li><b>It keeps changing.</b> Exercises rotate every four weeks and the sets, reps and loads follow your running phase: Base, Build, Peak, Light.</li><li><b>Running comes first.</b> Heavy days go on key-run days after the run, never the day before the long run. Low readiness turns the day light.</li><li><b>Shins built in.</b> Every day ends with calf, Achilles or tibialis work.</li></ul></section>';
  return html;
};
/* workout screen: dynamic stretch checklist on top, tappable exercise names, swap from the menu */
var _workout4 = VIEWS.workout;
VIEWS.workout = function () {
  var h = _workout4(), w = App.wk; if (!w) return h;
  h = h.replace(/(<section class="card excard" id="ex(\d+)"><div class="spread"><div style="min-width:0">)<h3>([\s\S]*?)<\/h3>/g, function (m, pre, i) { var x = w.ex[+i]; return pre + '<h3>' + exBtn(x.n, { i: +i }) + '</h3>'; });
  var m = E.liftMod(w.key, w.v), dyn = m && m.blocks[0] && m.blocks[0].ex.every(function (x) { return x.wu; }) ? m.blocks[0] : null;
  if (dyn && !w.edit) {
    var card = '<section class="card"><div class="spread"><h3>' + esc(dyn.t) + '</h3><span class="small muted">' + dyn.min + ' min · not logged</span></div>' + dyn.ex.map(function (x) { return '<div class="ex"><div class="n">' + exBtn(x.n) + '</div><div class="rx">' + esc(x.rx[0].replace(/^1×/, '')) + '</div><div class="cue">' + esc(x.cue) + '</div></div>'; }).join('') + '</section>';
    var at = h.indexOf('<section class="card excard" id="ex0"');
    if (at >= 0) h = h.slice(0, at) + card + h.slice(at);
  }
  return h;
};
var _exmenu = SHEETS.exmenu;
SHEETS.exmenu = function (a) {
  return _exmenu(a).replace(/<button class="btn" data-act="sheet" data-arg="[^"]*">Substitute exercise<\/button>/, '<button class="btn" data-act="sheet" data-arg="' + jattr({ sheet: 'exinfo', n: App.wk.ex[a.i].n, i: a.i }) + '">How to do it, muscles and swaps</button><button class="btn" data-act="sheet" data-arg="' + jattr({ sheet: 'exadd', swap: a.i }) + '">Swap for something else…</button>');
};

/* ---------- 1RM: calculator, calculated from your lifts, or entered by you ---------- */
function ormFormulas(w, r) { w = +w; r = +r; if (!(w > 0 && r > 0)) return null; if (r === 1) return { epley: w, brzycki: w, lombardi: w, avg: w }; var e = w * (1 + r / 30), b = r < 37 ? w * 36 / (37 - r) : e, l = w * Math.pow(r, 0.1); return { epley: e, brzycki: b, lombardi: l, avg: (e + b + l) / 3 }; }
function ormOf(n) {
  /* your entered 1RM if it is from the last 12 weeks, otherwise the best calculated from sets in the last 8 weeks */
  var t = App.today, man = (st().orm || []).filter(function (o) { return o.n === n; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
  var calc = 0, cd = null; liftHistory(n).forEach(function (h) { if (E.diffD(h.date, t) <= 56 && h.e1 > calc) { calc = h.e1; cd = h.date; } });
  var useMan = man && E.diffD(man.date, t) <= 84 && man.w >= calc * 0.9;
  return { manual: man || null, calc: calc || null, calcDate: cd, use: useMan ? man.w : (calc || (man ? man.w : null)), src: useMan ? 'entered' : calc ? 'calculated' : man ? 'entered' : null };
}
var PCT = [[100, 1], [95, 2], [90, 4], [85, 6], [80, 8], [75, 10], [70, 12], [65, 15]];
SHEETS.ormcalc = function (a) {
  sheetCtx.n = a.n || '';
  return '<h3>1RM calculator</h3><p class="small muted">Enter a set you did with good form (ideally 2–10 reps). The calculator estimates the most you could lift once.</p>' +
    '<label class="f">Exercise<input class="i" id="oc-n" data-dl="oc-list" autocomplete="off" value="' + esc(a.n || '') + '" placeholder="e.g. Back squat"></label><datalist id="oc-list">' + allLiftNames().map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
    '<div class="grid2"><label class="f">Weight (lb)<input class="i" id="oc-w" type="number" step="2.5" inputmode="decimal" value="' + (a.w || '') + '"></label><label class="f">Reps<input class="i" id="oc-r" type="number" min="1" max="20" inputmode="numeric" value="' + (a.r || '') + '"></label></div><div id="oc-out">' + ormOut(a.w, a.r) + '</div>' +
    '<div class="btns"><button class="btn primary" data-act="oc-save">Save as my 1RM</button><button class="btn" data-act="sheet" data-arg="' + jattr({ sheet: 'orm', n: a.n }) + '">Enter a tested 1RM</button><button class="btn ghost" data-act="sheet-close">Close</button></div><p class="err" id="shErr"></p>';
};
function ormOut(w, r) {
  var f = ormFormulas(w, r);
  if (!f) return '<p class="empty">Enter weight and reps.</p>';
  var one = Math.round(f.avg);
  return '<div class="grid4" style="margin-top:4px"><div class="metric good"><span>Estimated 1RM</span><b>' + one + '</b><em>average</em></div><div class="metric"><span>Epley</span><b>' + Math.round(f.epley) + '</b></div><div class="metric"><span>Brzycki</span><b>' + Math.round(f.brzycki) + '</b></div><div class="metric"><span>Lombardi</span><b>' + Math.round(f.lombardi) + '</b></div></div>' +
    '<div class="scroll"><table class="t" style="margin-top:8px"><thead><tr><th>% of 1RM</th><th class="num">Weight</th><th class="num">About</th></tr></thead><tbody>' + PCT.map(function (p) { return '<tr><td>' + p[0] + '%</td><td class="num">' + Math.round(one * p[0] / 100 / 5) * 5 + ' lb</td><td class="num">' + p[1] + ' rep' + (p[1] > 1 ? 's' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' + (+r > 10 ? '<p class="tiny muted">Estimates from more than 10 reps are rough. A set of 3–6 is more accurate.</p>' : '');
}
document.addEventListener('input', function (e) { if (e.target.id === 'oc-w' || e.target.id === 'oc-r') { var o = $('#oc-out'); if (o) o.innerHTML = ormOut($('#oc-w').value, $('#oc-r').value); } });
ACTIONS['oc-save'] = function () {
  var n = $('#oc-n').value.trim(), w = +$('#oc-w').value, r = +$('#oc-r').value, f = ormFormulas(w, r);
  if (!n || !f) { $('#shErr').textContent = 'Enter the exercise, weight and reps.'; return; }
  var o = { id: uid(), n: n, w: Math.round(f.avg), raw: w, r: r, date: App.today, calc: r > 1 };
  Store.edit('orm', o.id, function (S) { S.orm.push(o); });
  closeSheet(); toast(n + ' 1RM saved: ' + o.w + ' lb');
};
var _progStrength4 = progStrength;
progStrength = function () {
  var h = _progStrength4();
  h = h.replace('<button class="btn" data-act="sheet" data-arg="' + jattr({ sheet: 'orm' }) + '">Record a 1RM</button>', '<button class="btn" data-act="sheet" data-arg="' + jattr({ sheet: 'ormcalc' }) + '">1RM calculator</button>');
  var by = liftSeriesAll(), names = {}; Object.keys(by).forEach(function (n) { names[n] = 1; }); (st().orm || []).forEach(function (o) { names[o.n] = 1; });
  var rows = Object.keys(names).map(function (n) { return { n: n, o: ormOf(n) }; }).filter(function (x) { return x.o.use; }).sort(function (a, b) { return b.o.use - a.o.use; });
  var card = '<div class="sechead"><h2>Your 1RMs</h2><button data-act="sheet" data-arg="' + jattr({ sheet: 'orm' }) + '">Enter one</button></div><section class="card">' + (rows.length ? '<div class="scroll"><table class="t"><thead><tr><th>Lift</th><th class="num">Calculated</th><th class="num">Entered</th><th class="num">Using</th></tr></thead><tbody>' + rows.map(function (x) { return '<tr><td><button class="exlink" data-act="sheet" data-arg="' + jattr({ sheet: 'ormcalc', n: x.n }) + '">' + esc(x.n) + '</button></td><td class="num">' + (x.o.calc || '–') + '</td><td class="num">' + (x.o.manual ? x.o.manual.w : '–') + '</td><td class="num"><b>' + x.o.use + '</b></td></tr>'; }).join('') + '</tbody></table></div><p class="tiny muted" style="margin-top:8px">In lb. "Calculated" is from your best set in the last 8 weeks (weight × (1 + reps ÷ 30)). A 1RM you enter is used for 12 weeks unless your lifts show you have passed it.</p>' : '<p class="empty">Log sets, use the calculator, or enter a 1RM you already know.</p>') + '</section>';
  var at = h.indexOf('<div class="sechead"><h2>Top estimated 1RM');
  if (at < 0) at = h.indexOf('<section class="card"><h3>No sets logged yet');
  return at >= 0 ? h.slice(0, at) + card + h.slice(at) : h + card;
};
/* percent of 1RM in the next-step advice */
var _overloadHTML = overloadHTML;
overloadHTML = function (x, i, date, lp) {
  var h = _overloadHTML(x, i, date, lp), o = ormOf(x.n), ov = overload(x.n, x.rx, date, lp);
  if (o.use && ov.w) h = h.replace('</p>', ' <span class="muted">That is about ' + Math.round(ov.w / o.use * 100) + '% of your ' + o.use + ' lb 1RM.</span></p>');
  return h;
};

/* ---------- race-time estimator (Jack Daniels VDOT) ---------- */
var EST_D = [['1mi', '1 mile'], ['5k', '5K'], ['10k', '10K'], ['15k', '15K'], ['10mi', '10 mile'], ['half', 'Half marathon'], ['full', 'Marathon']];
function estTable(v) { return '<div class="scroll"><table class="t" style="margin-top:6px"><thead><tr><th>Distance</th><th class="num">Estimated time</th><th class="num">Pace /mi</th></tr></thead><tbody>' + EST_D.map(function (d) { var mi2 = E.DIST[d[0]].mi, s = E.predict(v, mi2); return '<tr><td>' + d[1] + '</td><td class="num">' + E.clock(s) + '</td><td class="num">' + pace(s / mi2) + '</td></tr>'; }).join('') + '</tbody></table></div>'; }
function estimatorCard() {
  var an = App.an || {}, S = an.sources || {}, A = an.anchor, rows = [];
  if (S.race) rows.push(['Race or time trial', mi(S.race.mi) + ' mi in ' + E.clock(S.race.sec), S.race]);
  if (an.effort) rows.push(['Best recent effort', E.clock(an.effort.sec) + ' for ' + (E.DIST[an.effort.key] ? E.DIST[an.effort.key].label : mi(an.effort.mi) + ' mi') + ' inside a run', an.effort]);
  if (S.lt) rows.push(['Lactate threshold', pace(S.lt.ltPace) + '/mi' + (S.lt.ltHr ? ' at ' + S.lt.ltHr + ' bpm' : ''), S.lt]);
  if (S.vo2) rows.push(['Garmin VO2 max', String(S.vo2.vo2), S.vo2]);
  var html = '<section class="card"><h3>Race time estimates</h3><p class="small muted">Jack Daniels\' VDOT method: one fitness number from your running, converted to equivalent times at every distance. The app reads your recent runs and Garmin health data, then uses the strongest evidence.</p>';
  html += '<div class="spread" style="margin-top:8px"><span class="pill solid">VDOT ' + (an.vNow ? an.vNow.toFixed(1) : '–') + '</span><span class="tiny muted">' + (A ? 'from ' + ({ race: 'your race result', lt: 'your threshold', effort: 'your best recent effort', vo2: 'Garmin VO2 max' }[A.src]) + ', ' + fmtD(A.date) : 'from your plan settings') + '</span></div>';
  if (an.vNow) html += estTable(an.vNow);
  if (rows.length) html += '<h4 style="margin-top:12px">What it is based on</h4><div class="scroll"><table class="t"><thead><tr><th>Evidence</th><th>Value</th><th class="num">VDOT</th><th class="num">Date</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr' + (A && r[2] === A ? ' style="font-weight:800"' : '') + '><td>' + r[0] + (A && r[2] === A ? ' ✓' : '') + '</td><td>' + esc(r[1]) + '</td><td class="num">' + r[2].v.toFixed(1) + '</td><td class="num">' + fmtD(r[2].date, { month: 'short', day: 'numeric' }) + '</td></tr>'; }).join('') + '</tbody></table></div><p class="tiny muted" style="margin-top:6px">Priority: a race in the last 12 weeks, then the better of your threshold and your best recent effort, then VO2 max at half weight. A fast stretch inside a training run is a floor: you would race faster. Marathon estimates assume you have done the long runs.</p>';
  html += '<h4 style="margin-top:12px">Try your own result</h4><div class="grid2"><label class="f">Distance<select class="i" id="est-d">' + EST_D.map(function (d) { return '<option value="' + d[0] + '"' + (d[0] === '5k' ? ' selected' : '') + '>' + d[1] + '</option>'; }).join('') + '</select></label><label class="f">Time<input class="i" id="est-t" placeholder="22:48"></label></div><div id="est-out"></div></section>';
  return html;
}
function estCalc() {
  var o = $('#est-out'); if (!o) return;
  var t = E.parseClock($('#est-t').value), d = E.DIST[$('#est-d').value];
  if (!(t > 0)) { o.innerHTML = ''; return; }
  var v = E.vdotOf(d.mi, t);
  o.innerHTML = v > 15 && v < 90 ? '<p class="small" style="margin-top:8px"><b>VDOT ' + v.toFixed(1) + '.</b> Equivalent performances:</p>' + estTable(v) + '<p class="tiny muted">To make this your fitness, log the run as a race or time trial on its day.</p>' : '<p class="err">That time looks off.</p>';
}
document.addEventListener('input', function (e) { if (e.target.id === 'est-t') estCalc(); });
document.addEventListener('change', function (e) { if (e.target.id === 'est-d') estCalc(); });
var _fitness4 = VIEWS.fitness;
VIEWS.fitness = function () {
  var h = _fitness4(), at = h.indexOf('<section class="card"><h3>How this sets your paces');
  var c = estimatorCard();
  return at >= 0 ? h.slice(0, at) + c + h.slice(at) : h + c;
};
TITLES.fitness = 'Fitness & race estimates';

/* ---------- rating prompt: never ask about a run you already rated on Garmin ---------- */
var _rateCard4 = rateCard;
rateCard = function () {
  var logs = st().logs || {}, t = App.today, now = Date.now(), items = [];
  for (var i = 0; i < 4; i++) {
    var d = E.addD(t, -i), l = logs[d]; if (!l) continue;
    ['run', 'xrun'].forEach(function (k) {
      var r = l[k]; if (!r || r.skip || !(+r.mi > 0) || r.noAsk) return;
      if (r.rpe) return;                                        /* effort is already rated; feel is optional */
      var g = r.gid ? gAct(r.gid) : null;
      if (g && (g.rpe || g.feel)) return;                       /* rated on the watch or in Garmin Connect */
      if (g && g.start) { var ended = new Date(g.start.replace(' ', 'T')).getTime() + (g.durS || 0) * 1000; if (now - ended < 4 * 3600 * 1000) return; }   /* give your Garmin rating time to sync */
      items.push({ date: d, slot: k, r: r });
    });
  }
  if (!items.length) return '';
  return '<section class="card"><h3>How did it go?</h3><p class="small muted">No rating came through from Garmin for ' + (items.length > 1 ? 'these runs' : 'this run') + '. Answer here, or rate it in Garmin Connect and it will sync.</p>' + items.slice(0, 2).map(function (it) {
    var r = it.r, arg = { date: it.date, slot: it.slot };
    return '<div style="margin-top:12px"><div class="spread small"><b>' + E.fmtDate(it.date, { weekday: 'short' }) + ' · ' + esc(r.name || 'Run') + '</b><span class="mono muted">' + mi(r.mi) + ' mi' + (r.mi && r.sec ? ' · ' + pace(r.sec / r.mi) + '/mi' : '') + '</span></div><div class="eyebrow" style="margin-top:8px">How did you feel?</div>' + feelRow(r.feel, arg) + '<div class="eyebrow" style="margin-top:8px">Perceived effort</div>' + effortRow(r.rpe, arg) + '<div class="btns" style="margin-top:6px"><button class="btn sm ghost" data-act="rate-skip" data-arg="' + jattr(arg) + '">Don\'t ask about this run</button></div></div>';
  }).join('') + '</section>';
};
ACTIONS['rate-skip'] = function (a) { Store.edit('logs', a.date, function (S) { var r = S.logs[a.date] && S.logs[a.date][a.slot]; if (r) r.noAsk = 1; }); };
