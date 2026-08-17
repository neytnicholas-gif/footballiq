export type OddOneOutDifficulty = 'Starter' | 'Sharp' | 'Expert'

export type OddOneOutQuestion = {
  id: string
  kind: 'odd-one-out'
  difficulty: OddOneOutDifficulty
  prompt: string
  options: string[]
  answer: string
  explanation: string
  takeaway: string
}

type OddChoice = {
  label: string
  reason: string
}

type OddGroup = {
  difficulty: OddOneOutDifficulty
  prompt: string
  members: string[]
  outsiders: [OddChoice, OddChoice, OddChoice, OddChoice]
  connection: string
  takeaway: string
}

const oddGroups: OddGroup[] = [
  {
    difficulty: 'Starter',
    prompt: 'Which option is not a way to restart play?',
    members: ['Throw-in', 'Goal kick', 'Corner kick', 'Kick-off', 'Direct free kick', 'Indirect free kick'],
    outsiders: [
      { label: 'Yellow card', reason: 'a disciplinary sanction, not a restart' },
      { label: 'Substitution', reason: 'a player change, not a restart' },
      { label: 'Advantage', reason: 'a decision to let play continue, not a restart' },
      { label: "Captain's armband", reason: 'player equipment, not a restart' },
    ],
    connection: 'put the ball back into play after a stoppage',
    takeaway: 'First identify how play stopped, then choose the correct restart.',
  },
  {
    difficulty: 'Starter',
    prompt: 'Which one is not normally a defensive position?',
    members: ['Centre-back', 'Right-back', 'Left-back', 'Wing-back', 'Sweeper', 'Goalkeeper'],
    outsiders: [
      { label: 'Centre-forward', reason: 'primarily an attacking position' },
      { label: 'Winger', reason: 'primarily a wide attacking position' },
      { label: 'Number ten', reason: 'an advanced creative role' },
      { label: 'False nine', reason: 'a type of centre-forward role' },
    ],
    connection: 'normally begin in the team’s defensive unit or deepest line',
    takeaway: 'Use the player’s usual starting line and main job.',
  },
  {
    difficulty: 'Starter',
    prompt: 'Which one is not a midfield role?',
    members: ['Defensive midfielder', 'Central midfielder', 'Attacking midfielder', 'Box-to-box midfielder', 'Deep-lying playmaker', 'Mezzala'],
    outsiders: [
      { label: 'Goalkeeper', reason: 'the player who protects the goal' },
      { label: 'Centre-back', reason: 'a central defender' },
      { label: 'Centre-forward', reason: 'a central attacker' },
      { label: 'Assistant referee', reason: 'a match official, not a playing role' },
    ],
    connection: 'are recognised midfield jobs',
    takeaway: 'Midfield roles connect defence, possession and attack in different ways.',
  },
  {
    difficulty: 'Starter',
    prompt: 'Which one is not an attacking role?',
    members: ['Centre-forward', 'Winger', 'Second striker', 'Inside forward', 'False nine', 'Target forward'],
    outsiders: [
      { label: 'Goalkeeper', reason: 'the deepest defensive role' },
      { label: 'Centre-back', reason: 'a central defensive role' },
      { label: 'Holding midfielder', reason: 'a midfield role that usually protects behind the attack' },
      { label: 'Referee', reason: 'a match official, not a player position' },
    ],
    connection: 'are used to create or finish attacks',
    takeaway: 'Attacking roles threaten goal in different spaces and ways.',
  },
  {
    difficulty: 'Starter',
    prompt: 'Which clue is not useful goalkeeper performance evidence?',
    members: ['Starting position', 'Handling decisions', 'Claiming crosses', 'Sweeping behind the defence', 'Passing under pressure', 'Communication'],
    outsiders: [
      { label: 'Boot colour', reason: 'a style choice that says nothing about performance' },
      { label: 'Squad number', reason: 'an identifier, not evidence of how the goalkeeper played' },
      { label: 'Social-media followers', reason: 'a popularity measure, not match evidence' },
      { label: 'Goal celebration style', reason: 'unrelated to the goalkeeper’s core actions' },
    ],
    connection: 'show how the goalkeeper performs the role',
    takeaway: 'Judge actions that prevent danger or help the team use the ball.',
  },
  {
    difficulty: 'Starter',
    prompt: 'Which clue does not belong in a centre-back assessment?',
    members: ['Aerial duels', 'Cover position', 'Body shape when defending', 'Control of the defensive line', 'Box defending', 'Passing through pressure'],
    outsiders: [
      { label: 'Corner-flag colour', reason: 'part of the venue, not player evidence' },
      { label: 'Boot brand', reason: 'a commercial choice, not football performance' },
      { label: 'Favourite celebration', reason: 'unrelated to centre-back performance' },
      { label: 'Number of fan chants', reason: 'a popularity clue, not role evidence' },
    ],
    connection: 'help assess a centre-back’s defending or build-up play',
    takeaway: 'Watch how the defender protects space, handles duels and starts attacks.',
  },
  {
    difficulty: 'Starter',
    prompt: 'Which clue does not belong in a full-back assessment?',
    members: ['One-versus-one defending', 'Recovery runs', 'Overlapping runs', 'Underlapping runs', 'Back-post awareness', 'Wide ball progression'],
    outsiders: [
      { label: 'Coin-toss result', reason: 'a match event the full-back does not control' },
      { label: 'Colour of the goal net', reason: 'venue detail, not performance evidence' },
      { label: 'Half-time music', reason: 'entertainment, not role evidence' },
      { label: 'Shirt sponsor size', reason: 'kit design, not football performance' },
    ],
    connection: 'show how a full-back defends or supports the wide channel',
    takeaway: 'A modern full-back is judged both without and with the ball.',
  },
  {
    difficulty: 'Starter',
    prompt: 'Which clue does not belong in a midfielder assessment?',
    members: ['Scanning before receiving', 'Body shape on the ball', 'Line-breaking passes', 'Resistance to pressure', 'Counter-press position', 'Control of tempo'],
    outsiders: [
      { label: 'Haircut', reason: 'appearance, not midfield performance' },
      { label: 'Pre-match playlist', reason: 'personal taste, not match evidence' },
      { label: 'Shirt-sleeve length', reason: 'kit preference, not role evidence' },
      { label: 'Autograph length', reason: 'unrelated to football performance' },
    ],
    connection: 'show how a midfielder receives, decides and connects play',
    takeaway: 'Midfield quality often appears before the ball arrives.',
  },
  {
    difficulty: 'Starter',
    prompt: 'Which clue does not belong in a winger assessment?',
    members: ['One-versus-one threat', 'Runs behind the defence', 'Holding useful width', 'Combination play', 'Back-post arrivals', 'Counter-press reactions'],
    outsiders: [
      { label: 'Corner-seat number', reason: 'a stadium detail, not player evidence' },
      { label: 'Sock colour preference', reason: 'appearance, not winger performance' },
      { label: 'Interview backdrop', reason: 'media presentation, not match evidence' },
      { label: 'Warm-up bib number', reason: 'an identifier, not role performance' },
    ],
    connection: 'show how a winger stretches, creates or finishes attacks',
    takeaway: 'Track the winger’s threat on the ball and movement away from it.',
  },
  {
    difficulty: 'Starter',
    prompt: 'Which clue does not belong in a striker assessment?',
    members: ['Movement in the box', 'Link play', 'Runs behind', 'Shot selection', 'Pressing angle', 'Occupying centre-backs'],
    outsiders: [
      { label: 'Match-poster design', reason: 'marketing, not striker performance' },
      { label: 'Tunnel position', reason: 'pre-match organisation, not role evidence' },
      { label: 'Boot-lace colour', reason: 'appearance, not finishing or movement evidence' },
      { label: 'Name length', reason: 'an identity detail, not football performance' },
    ],
    connection: 'show how a striker creates space, links play or threatens goal',
    takeaway: 'A striker contributes through movement and decisions as well as goals.',
  },
  {
    difficulty: 'Starter',
    prompt: 'Which one is not a useful training habit?',
    members: ['Complete a proper warm-up', 'Stay hydrated', 'Plan recovery', 'Train with a clear objective', 'Increase load gradually', 'Review useful feedback'],
    outsiders: [
      { label: 'Ignore pain and continue', reason: 'an unsafe response to a possible injury' },
      { label: 'Skip every water break', reason: 'poor hydration practice' },
      { label: 'Choose random drills with no aim', reason: 'activity without a learning objective' },
      { label: 'Treat sleep as unimportant', reason: 'poor recovery practice' },
    ],
    connection: 'support safe, purposeful development',
    takeaway: 'Good practice has a purpose and leaves room for recovery.',
  },
  {
    difficulty: 'Starter',
    prompt: 'Which one is not helpful communication between team-mates?',
    members: ['Call for the ball', 'Warn about pressure', 'Point to a free runner', 'Confirm who is marking', 'Organise the defensive line', 'Praise a good action'],
    outsiders: [
      { label: 'Insult a team-mate after a mistake', reason: 'harmful rather than helpful communication' },
      { label: 'Stay silent when a runner is free', reason: 'withholding useful information' },
      { label: 'Shout two opposite instructions', reason: 'confusing rather than clear communication' },
      { label: 'Blame someone during live play', reason: 'a distraction that does not solve the next action' },
    ],
    connection: 'give useful information or support',
    takeaway: 'The best call is early, short and useful.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which action usually does not help a team escape a high press?',
    members: ['Create a spare player', 'Use the goalkeeper', 'Switch the point of attack', 'Use a third-player combination', 'Offer a bounce pass', 'Create width and depth'],
    outsiders: [
      { label: 'Hide behind the same marker', reason: 'removes a passing option' },
      { label: 'Crowd every player into one lane', reason: 'makes the press easier to compact' },
      { label: 'Force a blind pass into pressure', reason: 'ignores the information needed to escape' },
      { label: 'Stand still and wait for space', reason: 'does not change the pressing picture' },
    ],
    connection: 'create a free player, route or angle against pressure',
    takeaway: 'Move the press, then use the space it leaves.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which action does not belong in a coordinated team press?',
    members: ['Curve the first pressing run', 'Cover the nearest short pass', 'Protect the central route', 'Squeeze the defensive line up', 'Narrow the far side', 'Jump on a shared trigger'],
    outsiders: [
      { label: 'Sprint at the ball independently', reason: 'an isolated action that can open easy passes' },
      { label: 'Leave the centre completely open', reason: 'gives the opponent the most dangerous route' },
      { label: 'Keep the back line far behind', reason: 'stretches the pressing team vertically' },
      { label: 'Let every player choose a different trigger', reason: 'removes the shared timing a press needs' },
    ],
    connection: 'help the team press as one connected unit',
    takeaway: 'One player applies pressure while the rest remove the next options.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which one is not a normal pressing trigger?',
    members: ['A poor first touch', 'A slow backwards pass', 'A receiver facing their own goal', 'A bouncing pass', 'The ball moving toward the touchline', 'An underhit pass'],
    outsiders: [
      { label: 'The crowd becomes louder', reason: 'noise, not a change in the opponent’s control or options' },
      { label: 'The scoreboard graphic changes', reason: 'broadcast information, not a pressing cue' },
      { label: 'A player changes boots', reason: 'equipment, not a live pressing cue' },
      { label: 'The coin toss is remembered', reason: 'unrelated to the current phase of play' },
    ],
    connection: 'can signal that the ball carrier or receiver is vulnerable',
    takeaway: 'Press when the opponent’s control, view or escape route is limited.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which action does not help a team create width?',
    members: ['Winger holds the touchline', 'Full-back overlaps', 'Wide centre-back carries outside', 'Ball is switched to the far side', 'Opposite winger stays wide', 'Full-back offers outside the block'],
    outsiders: [
      { label: 'Every attacker crowds the centre', reason: 'removes rather than creates width' },
      { label: 'Both wingers stand beside the striker', reason: 'leaves neither side stretched' },
      { label: 'The full-back runs into the same central lane', reason: 'duplicates space instead of opening the outside' },
      { label: 'The far-side player follows the ball inside', reason: 'closes the space needed for a switch' },
    ],
    connection: 'stretch the opposition across the pitch',
    takeaway: 'Width makes the defending team cover a larger distance.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which movement does not help create attacking depth?',
    members: ['Striker runs behind', 'Winger threatens the channel', 'Midfielder runs beyond the ball', 'Forward pins the last defender', 'Opposite winger attacks the far side', 'Runner starts on the defender’s blind side'],
    outsiders: [
      { label: 'Every attacker comes toward the ball', reason: 'leaves nobody threatening behind the defence' },
      { label: 'All forwards stand on the same short line', reason: 'removes different heights from the attack' },
      { label: 'The deepest runner stops before the space opens', reason: 'ends the threat behind the line' },
      { label: 'Three players wait beside the passer', reason: 'adds support but no depth' },
    ],
    connection: 'threaten space behind or pin the last line',
    takeaway: 'One player can come short when another threatens long.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which action usually harms a counter-attack?',
    members: ['Take a secure first touch', 'Scan for runners', 'Use different running lanes', 'Release the ball at the right moment', 'Carry into open space', 'Keep support behind the ball'],
    outsiders: [
      { label: 'Every runner crowds the ball', reason: 'removes the width and depth of the break' },
      { label: 'Turn backwards despite clear space ahead', reason: 'allows the defence time to recover' },
      { label: 'Delay every forward run', reason: 'removes options for the ball carrier' },
      { label: 'Send all cover players beyond the ball', reason: 'leaves the team open if possession is lost' },
    ],
    connection: 'help the team attack quickly while keeping useful spacing',
    takeaway: 'Fast attacks still need scanning, spacing and timing.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which choice weakens rest defence while your team attacks?',
    members: ['Keep cover behind the ball', 'Control central space', 'Stagger supporting players', 'Track the opponent’s outlets', 'Use an alert goalkeeper position', 'Balance the far side'],
    outsiders: [
      { label: 'Send every player into the penalty area', reason: 'leaves no protection against the counter' },
      { label: 'Let both centre-backs overlap together', reason: 'removes the normal central cover' },
      { label: 'Ignore the opponent’s fastest outlet', reason: 'leaves a clear transition route' },
      { label: 'Place all support ahead of the ball', reason: 'removes the stagger needed after a turnover' },
    ],
    connection: 'protect the team before possession is lost',
    takeaway: 'Good counter protection begins during your own attack.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which response does not help after losing the ball?',
    members: ['Nearest player delays the attack', 'Protect the central route', 'Recover goal-side', 'Track the first forward runner', 'Restore compact distances', 'Decide together whether to press or drop'],
    outsiders: [
      { label: 'Stop and complain to the referee', reason: 'takes a player out of the defensive transition' },
      { label: 'Everyone chases the ball', reason: 'leaves other runners and spaces free' },
      { label: 'Turn away from the opponent’s runners', reason: 'loses information about the immediate threat' },
      { label: 'Keep the lines stretched apart', reason: 'gives the opponent space to play through' },
    ],
    connection: 'slow the counter or rebuild the team’s defensive shape',
    takeaway: 'Delay the ball, protect the middle and recover together.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which action does not help after winning the ball?',
    members: ['Secure the first touch', 'Scan before releasing', 'Attack open space', 'Make a forward run', 'Support behind the ball', 'Use the temporary overload'],
    outsiders: [
      { label: 'Wait for every defender to recover', reason: 'gives away the transition advantage' },
      { label: 'All runners use the same lane', reason: 'makes the attack easy to defend' },
      { label: 'Pass forward without looking', reason: 'risks wasting the turnover' },
      { label: 'Leave the ball carrier alone', reason: 'removes passing and protection options' },
    ],
    connection: 'help turn regained possession into a controlled attack',
    takeaway: 'Win it, see the picture, then attack the best space.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which choice does not help break down a low block?',
    members: ['Switch the play', 'Create a cut-back', 'Run through a half-space', 'Build an overload', 'Use a third-player move', 'Recycle and attack again'],
    outsiders: [
      { label: 'Repeat the same hopeful cross without changing shape', reason: 'offers the defence the same picture each time' },
      { label: 'Crowd every attacker into one central spot', reason: 'makes the block even more compact' },
      { label: 'Remove all players from the far side', reason: 'takes away the threat of a switch' },
      { label: 'Force the first gap whether it is open or not', reason: 'ignores patience and better routes' },
    ],
    connection: 'move, stretch or disorganise a compact defence',
    takeaway: 'Change the picture before forcing the final action.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which choice does not create a useful overload?',
    members: ['Move an extra player toward the area', 'Draw a defender before passing', 'Offer a new supporting angle', 'Use a third-player run', 'Rotate positions', 'Isolate a team-mate on the far side'],
    outsiders: [
      { label: 'Crowd the ball without spacing', reason: 'adds bodies but not useful passing options' },
      { label: 'Stand in the same line as the marker', reason: 'does not create a free angle' },
      { label: 'Bring the far-side player into the same crowd', reason: 'removes the isolated threat elsewhere' },
      { label: 'Move an extra player where the opponent already has cover', reason: 'adds no local advantage' },
    ],
    connection: 'help create a numerical or positional advantage',
    takeaway: 'An overload only matters when it creates a free player or route.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which action does not belong in a third-player combination?',
    members: ['First player passes forward', 'Second player offers a bounce', 'Third player moves beyond the receiver', 'Second player sets the ball', 'Third player arrives from a new angle', 'Runner starts away from the marker’s view'],
    outsiders: [
      { label: 'Receiver hides behind the same marker', reason: 'removes the link needed for the combination' },
      { label: 'All three players stand on one flat line', reason: 'removes the passing angles between them' },
      { label: 'Third player waits beside the first passer', reason: 'does not attack the space beyond the receiver' },
      { label: 'Second player turns into pressure every time', reason: 'ignores the safer set to the free runner' },
    ],
    connection: 'link one pass to a different runner receiving next',
    takeaway: 'The third player moves while the first two connect the pass.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which choice does not help a successful switch of play?',
    members: ['Secure possession first', 'Attract pressure to one side', 'Offer a supporting pass', 'Keep a diagonal option open', 'Move the ball quickly across', 'Hold width on the far side'],
    outsiders: [
      { label: 'Switch toward the side with more defenders', reason: 'moves the ball into pressure rather than away from it' },
      { label: 'Let the far-side player drift into the crowd', reason: 'removes the target of the switch' },
      { label: 'Force a long pass before the ball is controlled', reason: 'raises risk before the switch is ready' },
      { label: 'Allow every passing angle to close', reason: 'leaves no route across the pitch' },
    ],
    connection: 'draw pressure and then reach the freer side',
    takeaway: 'A switch works because the far side stays available.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which choice is not a sensible way to protect a late lead?',
    members: ['Protect the centre', 'Keep a forward outlet', 'Use safe possession moments', 'Stop counters with fair positioning', 'Stay compact', 'Manage legal restarts calmly'],
    outsiders: [
      { label: 'Put every player on the goal line', reason: 'concedes all space and offers no route out' },
      { label: 'Delay restarts illegally', reason: 'risks sanctions and gives away control' },
      { label: 'Clear every ball without looking', reason: 'can return possession immediately' },
      { label: 'Leave the opponent’s best runner untracked', reason: 'ignores the clearest transition threat' },
    ],
    connection: 'reduce danger while preserving some control',
    takeaway: 'Protecting a lead still needs an outlet and good decisions.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which choice usually does not help when chasing an equaliser?',
    members: ['Add a runner into the box', 'Keep enough rest defence', 'Take quick legal restarts', 'Stretch the pitch', 'Increase risk at the right time', 'Use a fresh attacking profile'],
    outsiders: [
      { label: 'Remove every covering player immediately', reason: 'creates uncontrolled counter-attack risk' },
      { label: 'Shoot from anywhere without checking options', reason: 'confuses urgency with poor shot choice' },
      { label: 'Crowd all attackers into one lane', reason: 'makes the attack easier to defend' },
      { label: 'Slow every restart without reason', reason: 'wastes the time the team needs' },
    ],
    connection: 'increase attacking threat without abandoning all structure',
    takeaway: 'Be urgent, but add risk deliberately rather than randomly.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which action does not help a team defend crosses?',
    members: ['Pressure the crosser', 'Protect the near-post zone', 'Control the central zone', 'Track the far-post runner', 'Follow late arrivals', 'Prepare for the second ball'],
    outsiders: [
      { label: 'Every defender follows the ball', reason: 'leaves runners and zones unprotected' },
      { label: 'Allow the crosser unlimited time', reason: 'makes the delivery easier and more accurate' },
      { label: 'Ignore the far-post attacker', reason: 'leaves a common finishing route free' },
      { label: 'Stop after the first clearance', reason: 'abandons the second phase of the attack' },
    ],
    connection: 'reduce the quality of the delivery or protect its targets',
    takeaway: 'Defend the crosser, the box and the second ball.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which action does not improve the occupation of the box for a cross?',
    members: ['Near-post run', 'Central run', 'Far-post run', 'Edge-of-box arrival', 'Staggered timing', 'Crosser looks up before delivery'],
    outsiders: [
      { label: 'Every attacker runs to the same spot', reason: 'lets one defender cover several runners' },
      { label: 'All runners arrive before the crosser is ready', reason: 'loses the timing of the delivery' },
      { label: 'Nobody attacks the far side', reason: 'leaves an important finishing zone empty' },
      { label: 'The crosser delivers without looking', reason: 'ignores the position and movement of the targets' },
    ],
    connection: 'give the delivery several targets at different heights or zones',
    takeaway: 'Good box occupation uses different spaces and timings.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which choice does not help a team defend compactly?',
    members: ['Keep short distances between lines', 'Shift across together', 'Protect central space', 'Communicate along the line', 'Tuck in on the weak side', 'Connect pressure with cover'],
    outsiders: [
      { label: 'One defender steps out with no support', reason: 'opens a gap behind the pressure' },
      { label: 'Midfield and defence move in opposite directions', reason: 'stretches the block apart' },
      { label: 'Far-side players stay beside the touchline', reason: 'leaves central gaps while the ball is elsewhere' },
      { label: 'Each player follows only the ball', reason: 'ignores team-mates, opponents and protected space' },
    ],
    connection: 'keep the block connected around the ball and dangerous spaces',
    takeaway: 'Compact defending is about shared distances, not just numbers back.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which action does not help build from the goalkeeper?',
    members: ['Centre-backs split', 'Pivot offers an angle', 'Full-backs provide width', 'Goalkeeper scans', 'Team draws the first press', 'Players identify the spare route'],
    outsiders: [
      { label: 'Every receiver faces away from the ball', reason: 'removes clear receiving options' },
      { label: 'Midfielders hide on the same line', reason: 'reduces the angles through pressure' },
      { label: 'Goalkeeper kicks blindly before scanning', reason: 'chooses an action without reading the picture' },
      { label: 'All defenders stand beside one corner flag', reason: 'collapses the build-up into one crowded space' },
    ],
    connection: 'create information, spacing or a free route in build-up',
    takeaway: 'Build-up starts with shape and scanning before the pass.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which action does not help a player receive between the lines?',
    members: ['Scan before the pass', 'Move into a visible lane', 'Receive on the half-turn', 'Use nearby support', 'Protect the ball from pressure', 'Prepare the next action'],
    outsiders: [
      { label: 'Stand still behind the marker', reason: 'keeps the passing lane hidden' },
      { label: 'Face away without checking pressure', reason: 'removes information for the first touch' },
      { label: 'Move onto the same line as the passer', reason: 'reduces the angle through the block' },
      { label: 'Wait until the ball arrives before deciding', reason: 'makes the action slower under pressure' },
    ],
    connection: 'help the receiver become visible and play the next action',
    takeaway: 'Arrive where the passer can see you and know the next picture early.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which choice does not help create a dangerous cut-back?',
    members: ['Reach the byline under control', 'Look up before passing', 'Use runners in different zones', 'Add an edge-of-box arrival', 'Occupy central defenders', 'Keep counter-attack cover'],
    outsiders: [
      { label: 'Every runner stands on the goal line', reason: 'leaves the cut-back zone empty' },
      { label: 'Pass backwards without checking the target', reason: 'turns the action into a guess' },
      { label: 'All midfielders stay behind halfway', reason: 'removes later arrivals around the box' },
      { label: 'The ball carrier reaches the byline with no support', reason: 'offers no target for the cut-back' },
    ],
    connection: 'create the passing lane, targets or protection for a cut-back',
    takeaway: 'The pass becomes dangerous when runners arrive in different zones.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which movement does not give useful support to the ball carrier?',
    members: ['Offer a forward option', 'Provide a safe bounce pass', 'Make an overlapping run', 'Move into an inside angle', 'Hold width on the far side', 'Keep cover behind the ball'],
    outsiders: [
      { label: 'All team-mates run away in the same direction', reason: 'leaves the ball carrier with one predictable picture' },
      { label: 'Nearest player hides behind a defender', reason: 'removes the easiest support option' },
      { label: 'Two players occupy exactly the same spot', reason: 'duplicates rather than expands the options' },
      { label: 'Every player moves beyond the ball', reason: 'removes the safe pass and counter protection' },
    ],
    connection: 'give the ball carrier a different route, angle or layer of protection',
    takeaway: 'Support should exist ahead, beside and behind the ball.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which choice does not belong in a prepared attacking set piece?',
    members: ['Assign clear roles', 'Use a delivery cue', 'Vary the runs', 'Use legal screens', 'Prepare for the second ball', 'Keep counter-attack cover'],
    outsiders: [
      { label: 'Let everyone invent a different routine after the whistle', reason: 'removes the shared timing and roles' },
      { label: 'Send every player ahead of the ball', reason: 'leaves no protection if possession is lost' },
      { label: 'Begin runs before the taker is ready', reason: 'breaks the timing of the delivery' },
      { label: 'Ignore where the second ball may land', reason: 'abandons a common continuation of the attack' },
    ],
    connection: 'make the routine coordinated and protect what follows',
    takeaway: 'A set piece needs roles, timing and a plan for the next phase.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which choice does not belong in a prepared defensive set piece?',
    members: ['Agree the marking plan', 'Protect key zones', 'Track blocking movements', 'Keep the goalkeeper’s route clear', 'Prepare for the second ball', 'Keep a useful outlet'],
    outsiders: [
      { label: 'Every defender watches only the ball', reason: 'loses runners and blocking movements' },
      { label: 'Change the marking plan without telling anyone', reason: 'creates confusion at the delivery' },
      { label: 'Stand in the goalkeeper’s path', reason: 'makes it harder to attack the ball' },
      { label: 'Relax after the first contact', reason: 'abandons the second phase' },
    ],
    connection: 'help the team protect the first delivery and what happens next',
    takeaway: 'Defend the delivery, the runners and the second ball.',
  },
  {
    difficulty: 'Expert',
    prompt: 'Which one is not a main DOGSO consideration?',
    members: ['Distance between the offence and goal', 'General direction of play', 'Likelihood of keeping or gaining control', 'Location and number of defenders and attackers'],
    outsiders: [
      { label: 'How loudly the crowd appeals', reason: 'not part of the denial-of-an-obvious-goal-scoring-opportunity test' },
      { label: 'The attacker’s shirt number', reason: 'unrelated to the opportunity' },
      { label: 'The exact minute on the clock', reason: 'not one of the main DOGSO factors' },
      { label: 'The player’s reputation', reason: 'irrelevant to the facts of the opportunity' },
    ],
    connection: 'help the referee judge whether the goal-scoring opportunity was obvious',
    takeaway: 'Judge the opportunity from distance, direction, control and the positions of defenders and attackers.',
  },
  {
    difficulty: 'Expert',
    prompt: 'Which situation does not make an offside-positioned player active by itself?',
    members: ['Playing a team-mate’s pass', 'Challenging an opponent for the ball', 'Blocking an opponent’s line of vision', 'Attempting to play a nearby ball and affecting an opponent', 'Making an obvious action that affects an opponent', 'Gaining an advantage from a rebound or deflection'],
    outsiders: [
      { label: 'Simply standing in an offside position', reason: 'not an offence without involvement in active play' },
      { label: 'Walking away without affecting anyone', reason: 'no involvement in the play or an opponent' },
      { label: 'Having only an arm beyond the line', reason: 'the arms are not considered for offside position' },
      { label: 'Standing inside the player’s own half', reason: 'not an offside position' },
    ],
    connection: 'can amount to active involvement in play',
    takeaway: 'Offside position and offside offence are different decisions.',
  },
  {
    difficulty: 'Expert',
    prompt: 'Which one is not normally a caution offence?',
    members: ['Delaying the restart', 'Dissent', 'Entering without permission', 'Failing to respect the required distance', 'Persistent offences', 'Unsporting behaviour'],
    outsiders: [
      { label: 'A fair shoulder challenge', reason: 'legal football contact' },
      { label: 'Scoring a legal goal', reason: 'a normal outcome of play' },
      { label: 'Taking a legal throw-in', reason: 'a correct restart' },
      { label: 'Winning the coin toss', reason: 'not misconduct' },
    ],
    connection: 'are recognised reasons a player may be cautioned',
    takeaway: 'A caution punishes misconduct, not an ordinary legal action.',
  },
  {
    difficulty: 'Expert',
    prompt: 'Which one is not a sending-off offence?',
    members: ['Serious foul play', 'Violent conduct', 'Biting or spitting at someone', 'Offensive, insulting or abusive language or action', 'Receiving a second caution', 'Certain DOGSO offences'],
    outsiders: [
      { label: 'A careless foul', reason: 'a direct-free-kick offence without automatic misconduct' },
      { label: 'Being in an offside position', reason: 'not misconduct and not an offence by itself' },
      { label: 'Misplacing a pass', reason: 'a football mistake, not misconduct' },
      { label: 'A fair shoulder charge', reason: 'legal contact when performed fairly' },
    ],
    connection: 'can require a red card under the Laws',
    takeaway: 'Separate a football mistake, a foul and serious misconduct.',
  },
  {
    difficulty: 'Expert',
    prompt: 'Which one is not normally a direct-free-kick offence?',
    members: ['Charging an opponent', 'Jumping at an opponent', 'Kicking an opponent', 'Pushing an opponent', 'Striking an opponent', 'Tripping an opponent'],
    outsiders: [
      { label: 'Offside', reason: 'punished with an indirect free kick' },
      { label: 'Dangerous play without contact', reason: 'normally punished with an indirect free kick' },
      { label: 'The ball crossing the touchline', reason: 'followed by a throw-in, not a free kick' },
      { label: 'The ball crossing the goal line untouched by an offence', reason: 'followed by a goal kick or corner kick' },
    ],
    connection: 'are physical offences that can produce a direct free kick when committed carelessly or worse',
    takeaway: 'The nature of the offence determines the restart.',
  },
  {
    difficulty: 'Expert',
    prompt: 'Which clue is not enough by itself to penalise handball?',
    members: ['Deliberate movement of hand or arm toward the ball', 'Hand or arm makes the body unnaturally bigger', 'Player scores directly with the hand or arm'],
    outsiders: [
      { label: 'The ball touches an arm', reason: 'contact alone does not automatically make a handball offence' },
      { label: 'The crowd appeals', reason: 'an emotional reaction, not a Law consideration' },
      { label: 'The player looks surprised', reason: 'not enough evidence by itself' },
      { label: 'The shirt sleeve is a bright colour', reason: 'appearance, not a handball consideration' },
    ],
    connection: 'can support a handball offence decision',
    takeaway: 'Arm contact is the start of the decision, not automatically the end.',
  },
  {
    difficulty: 'Expert',
    prompt: 'Which one is not a useful consideration before playing advantage?',
    members: ['Severity of the offence', 'Position of the offence', 'Chance of an immediate attack', 'Possession with real benefit', 'Whether misconduct needs attention', 'The next few seconds of play'],
    outsiders: [
      { label: 'The scoreboard font', reason: 'presentation, not match advantage' },
      { label: 'The offender’s boot colour', reason: 'appearance, not a football consideration' },
      { label: 'How many television cameras are present', reason: 'unrelated to the benefit for the fouled team' },
      { label: 'Which team has louder fans', reason: 'not part of judging the immediate benefit' },
    ],
    connection: 'help the referee judge whether continuing gives a better outcome',
    takeaway: 'Advantage needs a real and immediate football benefit.',
  },
  {
    difficulty: 'Expert',
    prompt: 'Which step does not belong in a sound referee decision process?',
    members: ['Observe the action', 'Identify any offence', 'Consider advantage', 'Choose any sanction', 'Signal the decision', 'Manage the restart'],
    outsiders: [
      { label: 'Copy the loudest appeal', reason: 'noise cannot replace the referee’s observation' },
      { label: 'Guess before seeing the contact', reason: 'a conclusion made without the needed evidence' },
      { label: 'Check social media first', reason: 'unrelated to the live decision' },
      { label: 'Choose the card before identifying the offence', reason: 'puts sanction before the facts' },
    ],
    connection: 'move from evidence to decision and restart',
    takeaway: 'Observe first; sanction and restart only after the offence is clear.',
  },
  {
    difficulty: 'Expert',
    prompt: 'Which task does not belong to an assistant referee?',
    members: ['Signal when the ball leaves the field', 'Judge offside involvement', 'Help with substitutions', 'Report unseen misconduct', 'Watch the goalkeeper at a penalty kick', 'Assist the referee with match control'],
    outsiders: [
      { label: 'Choose the team’s formation', reason: 'a coaching decision' },
      { label: 'Set a player’s transfer fee', reason: 'a club decision, not officiating' },
      { label: 'Award the player-of-the-match prize', reason: 'not part of officiating the game' },
      { label: 'Run the team’s half-time talk', reason: 'a coaching responsibility' },
    ],
    connection: 'are part of assisting the referee team',
    takeaway: 'Assistant referees supply information and signals, not team decisions.',
  },
  {
    difficulty: 'Expert',
    prompt: 'Which one does not belong in the correct penalty-kick setup?',
    members: ['Ball stationary on the penalty mark', 'Kicker clearly identified', 'Goalkeeper facing the kicker on the goal line', 'Other players outside the penalty area', 'Other players behind the penalty mark', 'Other players at least 9.15 metres away'],
    outsiders: [
      { label: 'Goalkeeper waits beside the corner flag', reason: 'the goalkeeper must be positioned at the goal' },
      { label: 'Ball rolls before the whistle', reason: 'the ball must be stationary for the restart' },
      { label: 'Attacking team-mates stand in the six-yard area', reason: 'other players must remain outside the penalty area' },
      { label: 'Referee gives no signal', reason: 'the kick is taken after the referee’s signal' },
    ],
    connection: 'are required parts of setting up a penalty kick',
    takeaway: 'Check the ball, kicker, goalkeeper and every other player before the signal.',
  },
  {
    difficulty: 'Expert',
    prompt: 'Which one does not belong in a legal throw-in?',
    members: ['Face the field', 'Use both hands', 'Deliver from behind and over the head', 'Take it from where the ball left', 'Keep part of each foot on or outside the touchline', 'Opponents stay at least two metres away'],
    outsiders: [
      { label: 'Throw with one hand', reason: 'the ball must be delivered with both hands' },
      { label: 'Take it from anywhere on the touchline', reason: 'the throw belongs where the ball left the field' },
      { label: 'Lift both feet clear of the ground at release', reason: 'the feet must meet the Law at the moment of delivery' },
      { label: 'Face away from the field', reason: 'the thrower must face the field' },
    ],
    connection: 'are requirements or conditions of a proper throw-in',
    takeaway: 'Watch the place, feet, hands and delivery.',
  },
  {
    difficulty: 'Expert',
    prompt: 'Which one does not belong in the correct goal-kick procedure?',
    members: ['Ball is stationary', 'Ball is inside the goal area', 'A defending player kicks it', 'Opponents begin outside the penalty area', 'Ball is in play when kicked and clearly moves', 'An opponent still leaving cannot interfere'],
    outsiders: [
      { label: 'The goalkeeper must always take it', reason: 'any defending player may take the goal kick' },
      { label: 'The ball must leave the penalty area first', reason: 'that old requirement no longer applies' },
      { label: 'The kick must come from the penalty mark', reason: 'it is taken from within the goal area' },
      { label: 'An opponent may stand beside the ball', reason: 'opponents must begin outside the penalty area' },
    ],
    connection: 'describe the modern goal-kick procedure',
    takeaway: 'Use the current Law, not an old version of the goal-kick rule.',
  },
  {
    difficulty: 'Expert',
    prompt: 'Which one does not belong in the correct corner-kick procedure?',
    members: ['Ball placed in the nearest corner area', 'Corner flag stays in place', 'Opponents remain 9.15 metres away', 'Ball is stationary', 'Attacking team takes the kick', 'Ball is in play when kicked and clearly moves'],
    outsiders: [
      { label: 'Defending team takes the kick', reason: 'a corner is awarded to the attacking team' },
      { label: 'Ball is placed on the penalty mark', reason: 'the ball belongs in the nearest corner area' },
      { label: 'Ball is thrown with both hands', reason: 'a corner is taken with a kick' },
      { label: 'Ball must reach the penalty area', reason: 'it only needs to be kicked and clearly move' },
    ],
    connection: 'are part of taking a corner kick correctly',
    takeaway: 'Check the corner area, distance and moment the ball enters play.',
  },
  {
    difficulty: 'Expert',
    prompt: 'Which one does not belong in the correct kick-off procedure?',
    members: ['Ball starts on the centre mark', 'Ball is stationary', 'Referee gives a signal', 'Opponents stay 9.15 metres away', 'Players begin in their own half except the kicker', 'Ball is in play when kicked and clearly moves'],
    outsiders: [
      { label: 'Kicker may touch the ball twice in a row', reason: 'another player must touch it before the kicker plays it again' },
      { label: 'Ball starts on the penalty mark', reason: 'the kick-off begins at the centre mark' },
      { label: 'No referee signal is needed', reason: 'the referee signals for the kick-off' },
      { label: 'Opponents may stand beside the ball', reason: 'they must respect the required distance' },
    ],
    connection: 'are part of a correct kick-off',
    takeaway: 'The centre mark, player positions, signal and first touch all matter.',
  },
  {
    difficulty: 'Expert',
    prompt: 'Which clue does not help judge the severity of a challenge?',
    members: ['Speed of the challenge', 'Force used', 'Point of contact', 'Use of studs', 'Level of control', 'Danger to the opponent’s safety'],
    outsiders: [
      { label: 'Volume of the crowd', reason: 'reaction, not evidence about the challenge' },
      { label: 'Player’s shirt number', reason: 'unrelated to speed, force or danger' },
      { label: 'Player’s transfer value', reason: 'irrelevant to the nature of the contact' },
      { label: 'Player’s reputation', reason: 'not evidence from this challenge' },
    ],
    connection: 'describe the action and its danger',
    takeaway: 'Judge the challenge in front of you, not the noise or the name.',
  },
  {
    difficulty: 'Expert',
    prompt: 'Which statement does not belong with correct offside basics?',
    members: ['Position is judged when a team-mate plays or touches the ball', 'Head, body and feet can count for position', 'Hands and arms do not count for position', 'A player level with the second-last opponent is not offside', 'A player must be in the opponents’ half', 'Position alone is not an offence'],
    outsiders: [
      { label: 'Flag every player standing beyond a defender', reason: 'position alone does not make an offence' },
      { label: 'Count the player’s arm as the nearest body part', reason: 'hands and arms are excluded for offside position' },
      { label: 'Judge the position when the player receives the ball', reason: 'the relevant moment is the team-mate’s play or touch' },
      { label: 'A player can be offside inside their own half', reason: 'offside position requires being in the opponents’ half' },
    ],
    connection: 'state a correct foundation of the offside Law',
    takeaway: 'Freeze the right moment, then judge position and involvement separately.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which item does not belong in a balanced scouting report?',
    members: ['Repeatable strength', 'Clear concern', 'Specific evidence', 'Missing evidence', 'Role projection', 'Final recommendation'],
    outsiders: [
      { label: 'One viral clip as final proof', reason: 'too small and selective a sample' },
      { label: 'A conclusion with no evidence', reason: 'an unsupported judgement' },
      { label: 'Only positive actions', reason: 'an incomplete and biased picture' },
      { label: 'A hidden uncertainty', reason: 'something the decision-maker needs to see clearly' },
    ],
    connection: 'help a decision-maker understand the player and the remaining uncertainty',
    takeaway: 'Good scouting separates evidence, interpretation and uncertainty.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which detail is not useful match context for evaluating a player?',
    members: ['Quality of the opposition', 'Player’s assigned role', 'Score state', 'Size of the sample', 'Team’s playing style', 'Phase of the match'],
    outsiders: [
      { label: 'Boot colour', reason: 'appearance, not match context' },
      { label: 'Follower count', reason: 'popularity, not football context' },
      { label: 'Stadium snack price', reason: 'venue information unrelated to performance' },
      { label: 'Interview thumbnail', reason: 'media presentation, not match context' },
    ],
    connection: 'can change what an action means or how heavily it should be weighted',
    takeaway: 'The same action can mean something different in a different role or game state.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which habit does not reduce scouting bias?',
    members: ['Watch several matches', 'Compare players in similar roles', 'Write down what is unknown', 'Search for evidence against the first view', 'Use consistent criteria', 'Separate observation from interpretation'],
    outsiders: [
      { label: 'Make the first impression final', reason: 'locks the judgement before enough evidence arrives' },
      { label: 'Watch only highlight clips', reason: 'selects the most visible actions and hides the rest' },
      { label: 'Change the criteria for a favourite player', reason: 'makes the comparison unfair' },
      { label: 'Ignore evidence that challenges the report', reason: 'protects the opinion instead of testing it' },
    ],
    connection: 'make the evidence window broader and the judgement more consistent',
    takeaway: 'A strong opinion should survive an honest attempt to disprove it.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which clue is weakest for projecting player development?',
    members: ['Improvement across several matches', 'Response to a harder role', 'Repeating an action under pressure', 'Evidence of coachability', 'Speed of learning', 'Physical-maturation context'],
    outsiders: [
      { label: 'One easy match with no context', reason: 'too narrow a sample to show repeatable development' },
      { label: 'A single perfect highlight', reason: 'one outcome does not show the learning process' },
      { label: 'A rumour about potential', reason: 'a claim without observed development evidence' },
      { label: 'A prediction based only on age', reason: 'age alone does not explain how or whether the player is improving' },
    ],
    connection: 'show change, learning or transfer to a harder demand',
    takeaway: 'Development is a pattern over time, not one impressive moment.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which factor does not belong in a recruitment-fit decision?',
    members: ['Role the squad needs', 'Fit with the playing style', 'Level of competition', 'Availability and cost', 'Age and likely trajectory', 'Balance of the existing squad'],
    outsiders: [
      { label: 'Social-media hype alone', reason: 'attention without evidence of sporting fit' },
      { label: 'One scout’s favourite celebration', reason: 'personal taste unrelated to the squad need' },
      { label: 'Alphabetical order of surnames', reason: 'an administrative detail, not recruitment fit' },
      { label: 'Colour of the player’s current kit', reason: 'appearance, not role or level fit' },
    ],
    connection: 'help decide whether the player solves the club’s real need',
    takeaway: 'The best player is not always the best fit for this squad.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which step does not belong in a sound match-analysis workflow?',
    members: ['Define the question', 'Collect relevant clips or data', 'Record the context', 'Find repeat patterns', 'Test another explanation', 'Communicate an actionable finding'],
    outsiders: [
      { label: 'Cherry-pick only supporting clips', reason: 'hides evidence that could change the conclusion' },
      { label: 'Start with the final answer', reason: 'puts the conclusion before the investigation' },
      { label: 'Ignore the team’s game plan', reason: 'removes context needed to judge the action' },
      { label: 'Report a problem with no usable example', reason: 'makes the finding difficult to understand or act on' },
    ],
    connection: 'move from a clear question to evidence and an actionable answer',
    takeaway: 'Analysis should explain a repeat problem and help the team act.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which item is not useful performance evidence by itself?',
    members: ['Minutes and match context', 'Quality of chances', 'Actions per opportunity', 'Decision errors and successes', 'Trend across time', 'Comparison adjusted for role'],
    outsiders: [
      { label: 'One raw total with no context', reason: 'a number that does not explain opportunity, role or sample' },
      { label: 'Shirt-sales ranking', reason: 'commercial popularity, not football performance' },
      { label: 'Number of video likes', reason: 'audience reaction, not match evidence' },
      { label: 'Transfer rumour count', reason: 'media activity, not performance data' },
    ],
    connection: 'help place performance in its role, opportunity and time window',
    takeaway: 'A useful number needs a denominator and football context.',
  },
  {
    difficulty: 'Sharp',
    prompt: 'Which feature does not belong in a fair learning question?',
    members: ['One clear best answer', 'Plausible choices', 'Simple wording', 'A useful explanation', 'A short takeaway', 'Difficulty based on football thinking'],
    outsiders: [
      { label: 'A trick hidden in awkward wording', reason: 'tests guessing rather than football understanding' },
      { label: 'Two equally correct answers', reason: 'makes the result ambiguous' },
      { label: 'No explanation after the answer', reason: 'removes the learning step' },
      { label: 'A random fact unrelated to the prompt', reason: 'does not test the stated football idea' },
    ],
    connection: 'make a challenge clear, answerable and useful after the choice',
    takeaway: 'The challenge should come from football, not confusing language.',
  },
]

const memberCombinations: Record<number, number[][]> = {
  3: [[0, 1, 2], [0, 1, 2], [0, 1, 2], [0, 1, 2]],
  4: [[0, 1, 2], [1, 2, 3], [0, 2, 3], [0, 1, 3]],
  5: [[0, 1, 2], [1, 3, 4], [0, 2, 4], [0, 3, 4]],
  6: [[0, 1, 2], [1, 3, 4], [0, 4, 5], [2, 3, 5]],
}

function buildQuestion(group: OddGroup, groupIndex: number, variant: number, questionIndex: number): OddOneOutQuestion {
  const indexes = memberCombinations[group.members.length]
  if (!indexes) throw new Error(`Odd One Out group ${groupIndex + 1} must contain between three and six members.`)
  const options = indexes[variant]!.map((index) => group.members[index]!)
  const outsider = group.outsiders[variant]
  options.splice((groupIndex + variant) % 4, 0, outsider.label)

  return {
    id: `odd-${String(questionIndex + 1).padStart(3, '0')}`,
    kind: 'odd-one-out',
    difficulty: group.difficulty,
    prompt: group.prompt,
    options,
    answer: outsider.label,
    explanation: `${outsider.label} is ${outsider.reason}. The other three ${group.connection}.`,
    takeaway: group.takeaway,
  }
}

export const oddOneOutQuestionBank: OddOneOutQuestion[] = Array.from({ length: 4 }, (_, variant) => (
  oddGroups.map((group, groupIndex) => buildQuestion(group, groupIndex, variant, variant * oddGroups.length + groupIndex))
)).flat()

export const ODD_ONE_OUT_ROUND_SIZE = 12
export const ODD_ONE_OUT_ROUND_COUNT = oddOneOutQuestionBank.length / ODD_ONE_OUT_ROUND_SIZE

export const oddOneOutRoundNames = [
  'Football Foundations I', 'Team Tactics I', 'Match Solutions I', 'Laws of the Game I', 'Expert Decisions I',
  'Football Foundations II', 'Team Tactics II', 'Match Solutions II', 'Laws of the Game II', 'Expert Decisions II',
  'Football Foundations III', 'Team Tactics III', 'Match Solutions III', 'Laws of the Game III', 'Expert Decisions III',
  'Football Foundations IV', 'Team Tactics IV', 'Match Solutions IV', 'Laws of the Game IV', 'Expert Decisions IV',
] as const
