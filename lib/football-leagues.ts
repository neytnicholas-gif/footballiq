export type FootballLeague = {
  key: string
  name: string
  shortName: string
  country: string
  countryCode: string
  confederation: 'UEFA' | 'CONCACAF' | 'CONMEBOL' | 'AFC'
  tier: 1 | 2 | 3 | 4
  identityClue: string
  cultureClue: string
  sportmonksAliases: string[]
}

export type LeagueWorldQuestion = {
  prompt: string
  options: string[]
  answer: number
  explanation: string
}

/**
 * The knowledge game is deliberately broader than the three-league Player
 * Market. These are competition names and stable pyramid facts, not copied
 * editorial questions or provider-owned imagery.
 */
export const footballLeagues: FootballLeague[] = [
  { key: 'premier-league', name: 'Premier League', shortName: 'Premier League', country: 'England', countryCode: 'ENG', confederation: 'UEFA', tier: 1, identityClue: "England's highest national division", cultureClue: 'The North London, Manchester and Merseyside derbies can all appear here', sportmonksAliases: ['Premier League'] },
  { key: 'championship', name: 'EFL Championship', shortName: 'Championship', country: 'England', countryCode: 'ENG', confederation: 'UEFA', tier: 2, identityClue: "England's second national division", cultureClue: 'Clubs chase promotion from here to the Premier League', sportmonksAliases: ['Championship'] },
  { key: 'league-one', name: 'EFL League One', shortName: 'League One', country: 'England', countryCode: 'ENG', confederation: 'UEFA', tier: 3, identityClue: "England's third national division", cultureClue: 'This is the third step of the nationwide English Football League pyramid', sportmonksAliases: ['League One'] },
  { key: 'league-two', name: 'EFL League Two', shortName: 'League Two', country: 'England', countryCode: 'ENG', confederation: 'UEFA', tier: 4, identityClue: "England's fourth national division", cultureClue: 'This is the fourth and lowest nationwide EFL division', sportmonksAliases: ['League Two'] },
  { key: 'la-liga', name: 'La Liga', shortName: 'La Liga', country: 'Spain', countryCode: 'ESP', confederation: 'UEFA', tier: 1, identityClue: "Spain's highest national division", cultureClue: 'El Clasico is played here when Barcelona and Real Madrid meet', sportmonksAliases: ['La Liga'] },
  { key: 'segunda-division', name: 'Segunda Division', shortName: 'Segunda', country: 'Spain', countryCode: 'ESP', confederation: 'UEFA', tier: 2, identityClue: "Spain's second national division", cultureClue: 'Promotion from this competition leads to La Liga', sportmonksAliases: ['La Liga 2', 'Segunda Division'] },
  { key: 'ligue-1', name: 'Ligue 1', shortName: 'Ligue 1', country: 'France', countryCode: 'FRA', confederation: 'UEFA', tier: 1, identityClue: "France's highest national division", cultureClue: 'Le Classique belongs here when Marseille face Paris Saint-Germain', sportmonksAliases: ['Ligue 1'] },
  { key: 'bundesliga', name: 'Bundesliga', shortName: 'Bundesliga', country: 'Germany', countryCode: 'DEU', confederation: 'UEFA', tier: 1, identityClue: "Germany's highest national division", cultureClue: 'Its champions lift the Meisterschale', sportmonksAliases: ['Bundesliga'] },
  { key: '2-bundesliga', name: '2. Bundesliga', shortName: '2. Bundesliga', country: 'Germany', countryCode: 'DEU', confederation: 'UEFA', tier: 2, identityClue: "Germany's second national division", cultureClue: 'Clubs can win promotion from here to the Bundesliga', sportmonksAliases: ['2. Bundesliga'] },
  { key: 'serie-a', name: 'Serie A', shortName: 'Serie A', country: 'Italy', countryCode: 'ITA', confederation: 'UEFA', tier: 1, identityClue: "Italy's highest national division", cultureClue: 'Winning this competition means winning the Scudetto', sportmonksAliases: ['Serie A'] },
  { key: 'serie-b', name: 'Serie B', shortName: 'Serie B', country: 'Italy', countryCode: 'ITA', confederation: 'UEFA', tier: 2, identityClue: "Italy's second national division", cultureClue: 'Promotion from this competition leads to Serie A', sportmonksAliases: ['Serie B'] },
  { key: 'eredivisie', name: 'Eredivisie', shortName: 'Eredivisie', country: 'Netherlands', countryCode: 'NLD', confederation: 'UEFA', tier: 1, identityClue: "The Netherlands' highest national division", cultureClue: 'Ajax, PSV and Feyenoord are strongly associated with this competition', sportmonksAliases: ['Eredivisie'] },
  { key: 'primeira-liga', name: 'Primeira Liga', shortName: 'Primeira Liga', country: 'Portugal', countryCode: 'PRT', confederation: 'UEFA', tier: 1, identityClue: "Portugal's highest national division", cultureClue: "Portugal's traditional Big Three compete for this title", sportmonksAliases: ['Liga Portugal', 'Primeira Liga'] },
  { key: 'belgian-pro-league', name: 'Belgian Pro League', shortName: 'Pro League', country: 'Belgium', countryCode: 'BEL', confederation: 'UEFA', tier: 1, identityClue: "Belgium's highest national division", cultureClue: "Belgium's national champion is decided through this competition", sportmonksAliases: ['Pro League', 'First Division A'] },
  { key: 'scottish-premiership', name: 'Scottish Premiership', shortName: 'Scottish Prem', country: 'Scotland', countryCode: 'SCO', confederation: 'UEFA', tier: 1, identityClue: "Scotland's highest national division", cultureClue: 'The Old Firm meeting between Celtic and Rangers belongs here', sportmonksAliases: ['Premiership'] },
  { key: 'super-lig', name: 'Super Lig', shortName: 'Super Lig', country: 'Turkey', countryCode: 'TUR', confederation: 'UEFA', tier: 1, identityClue: "Turkey's highest national division", cultureClue: "Istanbul's major clubs contest fierce derbies in this competition", sportmonksAliases: ['Super Lig'] },
  { key: 'mls', name: 'Major League Soccer', shortName: 'MLS', country: 'United States and Canada', countryCode: 'USA', confederation: 'CONCACAF', tier: 1, identityClue: 'The leading cross-border league in the United States and Canada', cultureClue: 'Clubs are split into Eastern and Western conferences before the playoffs', sportmonksAliases: ['Major League Soccer'] },
  { key: 'liga-mx', name: 'Liga MX', shortName: 'Liga MX', country: 'Mexico', countryCode: 'MEX', confederation: 'CONCACAF', tier: 1, identityClue: "Mexico's highest national division", cultureClue: 'Its season is traditionally divided into short tournaments', sportmonksAliases: ['Liga MX'] },
  { key: 'brasileirao-serie-a', name: 'Brasileirao Serie A', shortName: 'Brasileirao', country: 'Brazil', countryCode: 'BRA', confederation: 'CONMEBOL', tier: 1, identityClue: "Brazil's highest national division", cultureClue: 'The national champions of Brazil win this competition', sportmonksAliases: ['Serie A', 'Brasileiro Serie A'] },
  { key: 'liga-profesional', name: 'Liga Profesional Argentina', shortName: 'Liga Profesional', country: 'Argentina', countryCode: 'ARG', confederation: 'CONMEBOL', tier: 1, identityClue: "Argentina's highest national division", cultureClue: "Argentina's principal national league title is decided here", sportmonksAliases: ['Superliga', 'Liga Profesional Argentina'] },
  { key: 'saudi-pro-league', name: 'Saudi Pro League', shortName: 'Saudi Pro League', country: 'Saudi Arabia', countryCode: 'SAU', confederation: 'AFC', tier: 1, identityClue: "Saudi Arabia's highest national division", cultureClue: "Saudi Arabia's national league champions are crowned here", sportmonksAliases: ['Pro League'] },
  { key: 'j1-league', name: 'J1 League', shortName: 'J1 League', country: 'Japan', countryCode: 'JPN', confederation: 'AFC', tier: 1, identityClue: "Japan's highest professional division", cultureClue: 'This is the top level of the Japanese J.League system', sportmonksAliases: ['J-League', 'J1 League'] },
  { key: 'a-league-men', name: 'A-League Men', shortName: 'A-League', country: 'Australia and New Zealand', countryCode: 'AUS', confederation: 'AFC', tier: 1, identityClue: 'The leading professional league for clubs from Australia and New Zealand', cultureClue: 'Its championship is settled through a finals series', sportmonksAliases: ['A-League'] },
  { key: 'danish-superliga', name: 'Danish Superliga', shortName: 'Superliga', country: 'Denmark', countryCode: 'DNK', confederation: 'UEFA', tier: 1, identityClue: "Denmark's highest national division", cultureClue: "Denmark's national league champions are crowned here", sportmonksAliases: ['Superliga'] },
]

const tierLabels: Record<FootballLeague['tier'], string> = {
  1: 'Top division',
  2: 'Second tier',
  3: 'Third tier',
  4: 'Fourth tier',
}

function optionSet(correct: string, pool: string[], seed: number) {
  const unique = [...new Set(pool)].filter((option) => option !== correct)
  const choices = [correct]
  for (let offset = 0; choices.length < 4 && offset < unique.length * 2; offset += 1) {
    const candidate = unique[(seed + offset * 5) % unique.length]
    if (candidate && !choices.includes(candidate)) choices.push(candidate)
  }
  const shift = seed % choices.length
  const options = [...choices.slice(shift), ...choices.slice(0, shift)]
  return { options, answer: options.indexOf(correct) }
}

export function getLeagueWorldQuestions(key: string): LeagueWorldQuestion[] {
  const leagueIndex = footballLeagues.findIndex((item) => item.key === key)
  const league = footballLeagues[leagueIndex]
  if (!league) return []

  const country = optionSet(league.country, footballLeagues.map((item) => item.country), leagueIndex + 2)
  const tier = optionSet(tierLabels[league.tier], Object.values(tierLabels), leagueIndex + 1)
  const confederation = optionSet(league.confederation, ['UEFA', 'CONCACAF', 'CONMEBOL', 'AFC'], leagueIndex + 3)
  const identity = optionSet(league.name, footballLeagues.map((item) => item.name), leagueIndex + 4)
  const culture = optionSet(league.name, footballLeagues.map((item) => item.name), leagueIndex + 7)

  return [
    { prompt: `Where is ${league.name} played?`, ...country, explanation: `${league.name} is played in ${league.country}.` },
    { prompt: `Where does ${league.name} sit in its football pyramid?`, ...tier, explanation: `${league.name} is a ${tierLabels[league.tier].toLowerCase()} competition.` },
    { prompt: `Which football confederation covers ${league.name}?`, ...confederation, explanation: `${league.name} belongs to the ${league.confederation} region.` },
    { prompt: `Which competition is ${league.identityClue.toLowerCase()}?`, ...identity, explanation: `That competition is ${league.name}.` },
    { prompt: `Which competition matches this clue: ${league.cultureClue}?`, ...culture, explanation: `The clue points to ${league.name}.` },
  ]
}

export function footballLeagueByKey(key: string) {
  return footballLeagues.find((league) => league.key === key)
}

export function predictionLeagueKey(name: string, countryName = '') {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const normalizedCountry = countryName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  return footballLeagues.find((league) => {
    const countryMatches = !normalizedCountry
      || league.country.toLowerCase().includes(normalizedCountry)
      || normalizedCountry.includes(league.country.split(' and ')[0]!.toLowerCase())
    return countryMatches && league.sportmonksAliases.some((alias) => alias.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === normalizedName)
  })
}
