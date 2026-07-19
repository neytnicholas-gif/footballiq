export type HigherLowerItem = { name: string; value: number; detail: string }
export type WhoAmIQuestion = { answer: string; clues: string[] }
export type CareerQuestion = { answer: string; clubs: string[]; hint: string }
export type RefereeQuestion = { scenario: string; options: string[]; answer: number; explanation: string }
export type ScoutQuestion = { title: string; profile: string[]; options: string[]; answer: number; explanation: string }

export const higherLowerItems: HigherLowerItem[] = [
  { name: 'Thierry Henry', value: 175, detail: 'Premier League goals' },
  { name: 'Frank Lampard', value: 177, detail: 'Premier League goals' },
  { name: 'Sergio Agüero', value: 184, detail: 'Premier League goals' },
  { name: 'Wayne Rooney', value: 208, detail: 'Premier League goals' },
  { name: 'Harry Kane', value: 213, detail: 'Premier League goals' },
  { name: 'Mohamed Salah', value: 157, detail: 'Premier League goals in the starter dataset' },
  { name: 'Robin van Persie', value: 144, detail: 'Premier League goals' },
  { name: 'Raheem Sterling', value: 123, detail: 'Premier League goals in the starter dataset' },
  { name: 'Son Heung-min', value: 120, detail: 'Premier League goals in the starter dataset' },
  { name: 'Cristiano Ronaldo', value: 103, detail: 'Premier League goals' },
  { name: 'Olivier Giroud', value: 90, detail: 'Premier League goals' },
  { name: 'Carlos Tevez', value: 84, detail: 'Premier League goals' },
  { name: 'Luis Suárez', value: 69, detail: 'Premier League goals' },
  { name: 'David Silva', value: 60, detail: 'Premier League goals' },
]

export const whoAmIQuestions: WhoAmIQuestion[] = [
  { answer: 'Kevin De Bruyne', clues: ['I am Belgian.', 'I played for Wolfsburg before becoming a Premier League star.', 'I am known for elite chance creation and crossing.', 'I became a central figure at Manchester City.'] },
  { answer: 'Didier Drogba', clues: ['I represented an African national team.', 'I played in France before moving to England.', 'I scored in a Champions League final.', 'I became a Chelsea icon.'] },
  { answer: 'Luka Modrić', clues: ['I am a midfielder from Croatia.', 'I played for Tottenham before moving to Spain.', 'I won the Ballon d’Or in 2018.', 'I became a Real Madrid legend.'] },
  { answer: 'Andrés Iniesta', clues: ['I came through La Masia.', 'I was a small, technical midfielder.', 'I scored the winning goal in a World Cup final.', 'I spent most of my career at Barcelona.'] },
  { answer: 'Virgil van Dijk', clues: ['I am a Dutch centre-back.', 'I played in Scotland and for Southampton.', 'I joined Liverpool for a record fee for a defender at the time.', 'I captained my national team.'] },
  { answer: 'Robert Lewandowski', clues: ['I am Polish.', 'I starred for both Dortmund and Bayern Munich.', 'I once scored five goals in nine minutes.', 'I later joined Barcelona.'] },
  { answer: 'Eden Hazard', clues: ['I am Belgian.', 'I won Ligue 1 before moving to England.', 'I was known for dribbling from the left.', 'My best club years came at Chelsea.'] },
  { answer: 'Sergio Ramos', clues: ['I am Spanish.', 'I began as a right-back before becoming a centre-back.', 'I scored a famous late equaliser in a Champions League final.', 'I captained Real Madrid.'] },
  { answer: 'Mohamed Salah', clues: ['I am Egyptian.', 'I played for Basel and Roma.', 'My first spell in England was not my breakthrough.', 'I became a prolific Liverpool forward.'] },
  { answer: 'Manuel Neuer', clues: ['I am German.', 'I started at Schalke.', 'I changed expectations of a goalkeeper’s role outside the box.', 'I became a Bayern Munich captain.'] },
]

export const careerQuestions: CareerQuestion[] = [
  { answer: 'Zlatan Ibrahimović', clubs: ['Malmö', 'Ajax', 'Juventus', 'Inter', 'Barcelona', 'Milan', 'PSG', 'Manchester United', 'LA Galaxy'], hint: 'Swedish striker' },
  { answer: 'Nicolas Anelka', clubs: ['PSG', 'Arsenal', 'Real Madrid', 'Liverpool', 'Manchester City', 'Fenerbahçe', 'Bolton', 'Chelsea'], hint: 'French forward' },
  { answer: 'Arjen Robben', clubs: ['Groningen', 'PSV', 'Chelsea', 'Real Madrid', 'Bayern Munich'], hint: 'Dutch winger' },
  { answer: 'Cesc Fàbregas', clubs: ['Arsenal', 'Barcelona', 'Chelsea', 'Monaco', 'Como'], hint: 'Spanish midfielder' },
  { answer: 'Samuel Eto’o', clubs: ['Real Madrid', 'Mallorca', 'Barcelona', 'Inter', 'Anzhi', 'Chelsea', 'Everton'], hint: 'Cameroonian striker' },
  { answer: 'Ángel Di María', clubs: ['Rosario Central', 'Benfica', 'Real Madrid', 'Manchester United', 'PSG', 'Juventus'], hint: 'Argentine winger' },
  { answer: 'Yaya Touré', clubs: ['Beveren', 'Metalurh Donetsk', 'Olympiacos', 'Monaco', 'Barcelona', 'Manchester City'], hint: 'Ivorian midfielder' },
  { answer: 'Thierry Henry', clubs: ['Monaco', 'Juventus', 'Arsenal', 'Barcelona', 'New York Red Bulls'], hint: 'French forward' },
  { answer: 'Xabi Alonso', clubs: ['Real Sociedad', 'Liverpool', 'Real Madrid', 'Bayern Munich'], hint: 'Spanish midfielder' },
  { answer: 'Edinson Cavani', clubs: ['Danubio', 'Palermo', 'Napoli', 'PSG', 'Manchester United', 'Valencia', 'Boca Juniors'], hint: 'Uruguayan striker' },
]

export const refereeQuestions: RefereeQuestion[] = [
  { scenario: 'A defender deliberately handles the ball on the goal line and prevents a certain goal. What is the correct decision?', options: ['Penalty only', 'Penalty and yellow card', 'Penalty and red card', 'Indirect free kick'], answer: 2, explanation: 'Deliberately denying a goal by handball is a sending-off offence, with a penalty if it occurs inside the penalty area.' },
  { scenario: 'An attacker is fouled in the penalty area while attempting to play the ball. The defender makes a genuine attempt to challenge for it and denies an obvious goal-scoring opportunity.', options: ['Penalty and red card', 'Penalty and yellow card', 'Penalty only', 'Indirect free kick and yellow card'], answer: 1, explanation: 'For a genuine attempt to play/challenge for the ball inside the penalty area, DOGSO is generally reduced from red to yellow.' },
  { scenario: 'A player removes their shirt while celebrating a goal.', options: ['No action', 'Verbal warning', 'Yellow card', 'Red card'], answer: 2, explanation: 'Removing the shirt during a goal celebration is a mandatory caution.' },
  { scenario: 'A goalkeeper controls the ball with the hands for too long under the current competition rules used by this quiz.', options: ['Play on forever', 'Direct free kick', 'Indirect free kick or the competition’s current restart sanction', 'Penalty kick'], answer: 2, explanation: 'The sanction depends on the applicable edition/competition implementation; the key principle is that the keeper cannot retain hand control indefinitely.' },
  { scenario: 'A substitute enters the field without permission and interferes with play.', options: ['Play on', 'Stop play, caution the substitute and restart as required', 'Send off the captain', 'Only warn the coach'], answer: 1, explanation: 'Unauthorised entry is misconduct. Interference requires play to be stopped and the correct disciplinary and restart action taken.' },
  { scenario: 'A player uses excessive force in a tackle and endangers the safety of an opponent.', options: ['No card', 'Yellow card', 'Red card', 'Drop ball only'], answer: 2, explanation: 'Serious foul play involving excessive force or endangering safety is a sending-off offence.' },
  { scenario: 'The ball accidentally touches an attacker’s hand and immediately goes to a teammate who scores.', options: ['Always disallow', 'Always allow', 'Judge under the current handball law; accidental contact by the non-scorer is not automatically an offence', 'Award an indirect free kick'], answer: 2, explanation: 'Accidental handball by a teammate is not automatically punished solely because a goal follows; the actual handball criteria still matter.' },
  { scenario: 'A defender carelessly trips an opponent outside the penalty area.', options: ['Direct free kick, no card automatically required', 'Indirect free kick and yellow', 'Penalty', 'Red card'], answer: 0, explanation: 'A careless trip is a direct-free-kick offence. Careless alone does not require a card.' },
  { scenario: 'A player commits a reckless tackle.', options: ['No card', 'Yellow card', 'Red card in every case', 'Only a warning'], answer: 1, explanation: 'Reckless challenges require a caution.' },
  { scenario: 'Two players from the same team collide and one suffers a serious head injury while play continues.', options: ['Always wait until the ball is out', 'Stop play immediately for serious injury', 'Award a free kick', 'Send off the other player'], answer: 1, explanation: 'The referee should stop play for a serious injury, especially a suspected head injury, even when no offence occurred.' },
]

export const scoutQuestions: ScoutQuestion[] = [
  { title: 'The explosive winger', profile: ['17 years old', 'Repeatedly beats the full-back 1v1', 'Creates separation but final ball is inconsistent', 'Tracks back with good intensity', 'Decision-making drops when rushed'], options: ['Strong follow', 'Follow', 'Do not follow'], answer: 0, explanation: 'The repeatable separation, age and work rate justify strong follow-up. Final-ball consistency is coachable and should be monitored over more matches.' },
  { title: 'The early-maturing striker', profile: ['15 years old', 'Physically dominates smaller defenders', 'Limited combination play', 'Most chances come from transitions', 'Movement in the box is promising'], options: ['Strong follow', 'Follow with maturity caution', 'Do not follow'], answer: 1, explanation: 'There is enough to monitor, but the physical advantage may distort current performance. Reassess technical and perceptual qualities against stronger opposition.' },
  { title: 'The progressive centre-back', profile: ['16 years old', 'Breaks lines with passes', 'Defends large spaces calmly', 'Occasionally overcommits when stepping out', 'Communicates consistently'], options: ['Strong follow', 'Follow', 'Do not follow'], answer: 0, explanation: 'Line-breaking ability, space defending and communication form a high-upside profile. The stepping decisions need targeted observation.' },
  { title: 'The safe midfielder', profile: ['18 years old', 'Very high pass completion', 'Rarely receives on the half-turn', 'Few progressive actions', 'Positionally disciplined'], options: ['Strong follow', 'Follow for role fit', 'Do not follow'], answer: 1, explanation: 'The profile may fit a specific controlling role, but pass completion alone is not evidence of high potential. Context and role demands matter.' },
  { title: 'The high-volume goalkeeper', profile: ['17 years old', 'Makes many saves', 'Team concedes many shots', 'Strong reactions', 'Distribution under pressure is inconsistent'], options: ['Strong follow', 'Follow', 'Do not follow'], answer: 1, explanation: 'Save volume is context-dependent. Reactions are positive, but claim selection, positioning and distribution need a larger sample.' },
  { title: 'The late-developing full-back', profile: ['18 years old', 'Average pace', 'Excellent timing when overlapping', 'Reliable 1v1 defender', 'Consistently scans before receiving'], options: ['Strong follow', 'Follow', 'Do not follow'], answer: 0, explanation: 'Scanning, timing and defensive reliability are repeatable qualities that can outweigh merely average raw pace.' },
  { title: 'The highlight-reel number 10', profile: ['16 years old', 'Two spectacular assists', 'Low involvement for long periods', 'Does not press consistently', 'Technical ceiling appears high'], options: ['Strong follow', 'Follow and gather more evidence', 'Do not follow'], answer: 1, explanation: 'The ceiling is interesting, but two highlights are insufficient. Observe off-ball availability, work rate and repeatability before upgrading.' },
  { title: 'The dominant ball-winner', profile: ['17 years old', 'Wins many duels', 'Often arrives late', 'Receives frequent cautions', 'Simple but secure passing'], options: ['Strong follow', 'Follow with discipline focus', 'Do not follow'], answer: 1, explanation: 'Duel ability is valuable, but timing and discipline can limit progression. The next observation should separate aggression from poor decision-making.' },
  { title: 'The small technical winger', profile: ['14 years old', 'Excellent first touch', 'Avoids contact', 'Sees through passes early', 'Struggles to sustain intensity'], options: ['Strong follow', 'Follow', 'Do not follow'], answer: 0, explanation: 'At 14, technical and perceptual quality deserves patience. Physical confidence and intensity can change significantly through development.' },
  { title: 'The productive older youth', profile: ['19 years old', 'Scores regularly at a lower youth level', 'Limited acceleration', 'Good penalty-box timing', 'Has not yet faced senior football'], options: ['Strong follow', 'Follow toward senior test', 'Do not follow'], answer: 1, explanation: 'The next question is translation. Recommend a senior or higher-level test rather than relying on youth production alone.' },
]
