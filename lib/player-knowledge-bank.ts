import type { QuizDifficulty } from './quiz-difficulty'

export type WhoAmIQuestion={answer:string;aliases?:string[];clues:string[]}
export type CareerQuestion={answer:string;aliases?:string[];clubs:string[];hint:string}
type Profile={answer:string;aliases?:string[];nationality:string;role:string;clubs:string[];signature:string;landmark:string}
const p=(answer:string,nationality:string,role:string,clubs:string[],signature:string,landmark:string,aliases?:string[]):Profile=>({answer,nationality,role,clubs,signature,landmark,aliases})

/**
 * Editorial scope: selected senior clubs in chronological order, not every
 * loan, reserve side or short return. Facts are deliberately stable career
 * landmarks rather than live-season totals.
 */
export const playerKnowledgeProfiles:Profile[]=[
  p('Lionel Messi','Argentina','forward',['Barcelona','Paris Saint-Germain','Inter Miami'],'I am famous for close control, left-footed creation and scoring.','I captained Argentina to the 2022 World Cup.'),
  p('Cristiano Ronaldo','Portugal','forward',['Sporting CP','Manchester United','Real Madrid','Juventus','Al Nassr'],'I became known for elite movement, heading and goals.','I won the Champions League with two different clubs.'),
  p('Zinedine Zidane','France','midfielder',['Cannes','Bordeaux','Juventus','Real Madrid'],'I was an elegant playmaker with outstanding close control.','I scored twice in the 1998 World Cup final.'),
  p('Ronaldo Nazário','Brazil','striker',['Cruzeiro','PSV','Barcelona','Inter','Real Madrid','Milan','Corinthians'],'I combined explosive acceleration with calm finishing.','I scored both goals in the 2002 World Cup final.',['Ronaldo','R9']),
  p('Ronaldinho','Brazil','attacking midfielder',['Grêmio','Paris Saint-Germain','Barcelona','Milan','Flamengo','Atlético Mineiro'],'I was known for flair, no-look passes and free-kicks.','I won the 2005 Ballon d’Or.'),
  p('Neymar','Brazil','forward',['Santos','Barcelona','Paris Saint-Germain','Al Hilal'],'I became famous for dribbling and creativity from the left.','I won the 2015 Champions League with Barcelona.'),
  p('Kylian Mbappé','France','forward',['Monaco','Paris Saint-Germain','Real Madrid'],'My speed and runs behind made me a star while still a teenager.','I scored in the 2018 World Cup final.'),
  p('Erling Haaland','Norway','striker',['Bryne','Molde','Red Bull Salzburg','Borussia Dortmund','Manchester City'],'I am a powerful left-footed striker known for penalty-box movement.','I won a treble in my first season in England.'),
  p('Mohamed Salah','Egypt','forward',['Al Mokawloon','Basel','Chelsea','Fiorentina','Roma','Liverpool'],'I became a prolific right-sided forward cutting onto my left foot.','I scored in Liverpool’s 2019 Champions League final win.'),
  p('Kevin De Bruyne','Belgium','midfielder',['Genk','Chelsea','Werder Bremen','Wolfsburg','Manchester City'],'I am known for early crosses, through-balls and chance creation.','I became a central figure in Manchester City’s treble-winning side.'),
  p('Luka Modrić','Croatia','midfielder',['Dinamo Zagreb','Tottenham Hotspur','Real Madrid'],'I control matches with scanning, passing and outside-of-the-boot technique.','I won the 2018 Ballon d’Or.'),
  p('Andrés Iniesta','Spain','midfielder',['Barcelona','Vissel Kobe','Emirates Club'],'I came through La Masia and excelled in tight spaces.','I scored the winning goal in the 2010 World Cup final.',['Andres Iniesta']),
  p('Xavi','Spain','midfielder',['Barcelona','Al Sadd'],'I dictated tempo through positioning and short passing.','I started in Spain’s 2010 World Cup final victory.'),
  p('Sergio Busquets','Spain','holding midfielder',['Barcelona','Inter Miami'],'I made difficult midfield spaces look simple through positioning.','I won the 2010 World Cup and multiple Champions Leagues.'),
  p('Sergio Ramos','Spain','defender',['Sevilla','Real Madrid','Paris Saint-Germain','Sevilla'],'I moved from right-back to centre-back and became a major set-piece threat.','I scored a famous late equaliser in the 2014 Champions League final.'),
  p('Iker Casillas','Spain','goalkeeper',['Real Madrid','Porto'],'I was a quick-reacting goalkeeper who captained club and country.','I lifted the 2010 World Cup as Spain captain.'),
  p('Manuel Neuer','Germany','goalkeeper',['Schalke 04','Bayern Munich'],'I helped popularise the modern sweeper-keeper role.','I won the 2014 World Cup.'),
  p('Gianluigi Buffon','Italy','goalkeeper',['Parma','Juventus','Paris Saint-Germain','Juventus','Parma'],'My top-level career lasted across more than two decades.','I won the 2006 World Cup.'),
  p('Paolo Maldini','Italy','defender',['Milan'],'I played elite football at left-back and centre-back.','I won five European Cups or Champions Leagues with one club.'),
  p('Franco Baresi','Italy','defender',['Milan'],'I was a commanding sweeper and organiser.','I captained Milan through one of football’s great defensive eras.'),
  p('Fabio Cannavaro','Italy','defender',['Napoli','Parma','Inter','Juventus','Real Madrid','Juventus'],'I was an aggressive, athletic centre-back despite modest height.','I captained Italy to the 2006 World Cup and won that year’s Ballon d’Or.'),
  p('Andrea Pirlo','Italy','midfielder',['Brescia','Inter','Milan','Juventus','New York City FC'],'I controlled games from deep with passing and set pieces.','I won the 2006 World Cup.'),
  p('Francesco Totti','Italy','forward',['Roma'],'I played as a number ten, second striker and false nine.','I spent my entire senior club career with Roma.'),
  p('Alessandro Del Piero','Italy','forward',['Padova','Juventus','Sydney FC','Delhi Dynamos'],'I was known for curled finishes from the left side of the box.','I won the 2006 World Cup.'),
  p('Roberto Baggio','Italy','forward',['Vicenza','Fiorentina','Juventus','Milan','Bologna','Inter','Brescia'],'I was a creative forward famous for technique and free-kicks.','I won the 1993 Ballon d’Or.'),
  p('Gabriel Batistuta','Argentina','striker',['Newell’s Old Boys','River Plate','Boca Juniors','Fiorentina','Roma','Inter'],'I was a powerful finisher known as Batigol.','I won Serie A with Roma.'),
  p('Diego Maradona','Argentina','attacking midfielder',['Argentinos Juniors','Boca Juniors','Barcelona','Napoli','Sevilla','Newell’s Old Boys','Boca Juniors'],'I was a left-footed dribbler and creator who carried enormous attacking responsibility.','I captained Argentina to the 1986 World Cup.'),
  p('Pelé','Brazil','forward',['Santos','New York Cosmos'],'I was a teenage World Cup winner and prolific scorer.','I won three World Cups as a player.',['Pele']),
  p('Johan Cruyff','Netherlands','forward',['Ajax','Barcelona','Los Angeles Aztecs','Washington Diplomats','Levante','Ajax','Feyenoord'],'I became the playing symbol of Total Football.','I won three Ballon d’Or awards.'),
  p('Marco van Basten','Netherlands','striker',['Ajax','Milan'],'I was a technically complete striker whose career ended early through injury.','I scored a famous volley in the Euro 1988 final.'),
  p('Ruud Gullit','Netherlands','midfielder',['Haarlem','Feyenoord','PSV','Milan','Sampdoria','Chelsea'],'I could play across midfield, attack and defence.','I captained the Netherlands to the Euro 1988 title.'),
  p('Dennis Bergkamp','Netherlands','forward',['Ajax','Inter','Arsenal'],'I was a forward known for first touch, vision and control.','I scored a celebrated goal for the Netherlands against Argentina in 1998.'),
  p('Arjen Robben','Netherlands','winger',['Groningen','PSV','Chelsea','Real Madrid','Bayern Munich'],'I repeatedly cut in from the right onto my left foot.','I scored the winner in the 2013 Champions League final.'),
  p('Wesley Sneijder','Netherlands','midfielder',['Ajax','Real Madrid','Inter','Galatasaray','Nice'],'I was a creative midfielder and dangerous set-piece taker.','I won a treble with Inter in 2010.'),
  p('Clarence Seedorf','Netherlands','midfielder',['Ajax','Sampdoria','Real Madrid','Inter','Milan','Botafogo'],'I combined strength, technique and long-range shooting.','I won the Champions League with three different clubs.'),
  p('Edgar Davids','Netherlands','midfielder',['Ajax','Milan','Juventus','Barcelona','Inter','Tottenham Hotspur','Crystal Palace','Barnet'],'I was an intense ball-winning midfielder known for protective eyewear.','I won the 1995 Champions League with Ajax.'),
  p('Thierry Henry','France','forward',['Monaco','Juventus','Arsenal','Barcelona','New York Red Bulls'],'I became a devastating left-channel forward with pace and composure.','I won the World Cup, Euros and Champions League.'),
  p('Didier Drogba','Ivory Coast','striker',['Le Mans','Guingamp','Marseille','Chelsea','Shanghai Shenhua','Galatasaray','Chelsea','Montreal Impact','Phoenix Rising'],'I was a powerful striker renowned for major-match performances.','I equalised and scored in the shootout in the 2012 Champions League final.'),
  p('Samuel Eto’o','Cameroon','striker',['Real Madrid','Mallorca','Barcelona','Inter','Anzhi Makhachkala','Chelsea','Everton','Sampdoria'],'I was a rapid striker with elite movement.','I won consecutive trebles with Barcelona and Inter.'),
  p('George Weah','Liberia','forward',['Tonnerre Yaoundé','Monaco','Paris Saint-Germain','Milan','Chelsea','Manchester City','Marseille'],'I was a powerful, fast forward who later became a national president.','I won the 1995 Ballon d’Or.'),
  p('Patrick Vieira','France','midfielder',['Cannes','Milan','Arsenal','Juventus','Inter','Manchester City'],'I was a dominant central midfielder with long strides and strong ball-winning.','I captained Arsenal’s unbeaten 2003–04 league side.'),
  p('Claude Makélélé','France','holding midfielder',['Nantes','Marseille','Celta Vigo','Real Madrid','Chelsea','Paris Saint-Germain'],'My positional discipline helped name a defensive-midfield role.','I won league titles in Spain and England.',['Claude Makelele']),
  p('N’Golo Kanté','France','midfielder',['Boulogne','Caen','Leicester City','Chelsea','Al-Ittihad'],'I became famous for covering space, regaining possession and carrying forward.','I won consecutive Premier League titles with different clubs.',['N Golo Kante','N’Golo Kante','N Golo Kanté']),
  p('Antoine Griezmann','France','forward',['Real Sociedad','Atlético Madrid','Barcelona','Atlético Madrid'],'I link midfield and attack with movement and combination play.','I won the 2018 World Cup.'),
  p('Karim Benzema','France','striker',['Lyon','Real Madrid','Al-Ittihad'],'I developed from a linking forward into a leading scorer.','I won the 2022 Ballon d’Or.'),
  p('David Beckham','England','midfielder',['Manchester United','Real Madrid','LA Galaxy','Milan','Paris Saint-Germain'],'I was famous for crossing and free-kicks from the right.','I won league titles in four countries.'),
  p('Wayne Rooney','England','forward',['Everton','Manchester United','Everton','D.C. United','Derby County'],'I combined powerful shooting with creativity and work rate.','I became Manchester United’s record goalscorer.'),
  p('Steven Gerrard','England','midfielder',['Liverpool','LA Galaxy'],'I was a driving midfielder known for long shots and big moments.','I captained Liverpool to the 2005 Champions League.'),
  p('Frank Lampard','England','midfielder',['West Ham United','Chelsea','Manchester City','New York City FC'],'I was a high-scoring midfielder with late box runs.','I became Chelsea’s record goalscorer.'),
  p('Paul Scholes','England','midfielder',['Manchester United'],'I was known for passing range, timing and long shooting.','I spent my entire senior club career at Manchester United.'),
  p('Ryan Giggs','Wales','winger',['Manchester United'],'I moved from flying left winger to central creator.','I won 13 Premier League titles with one club.'),
  p('Eric Cantona','France','forward',['Auxerre','Marseille','Bordeaux','Montpellier','Nîmes','Leeds United','Manchester United'],'I was a charismatic creator and scorer who wore a raised collar.','I became a central figure in Manchester United’s 1990s rise.'),
  p('Alan Shearer','England','striker',['Southampton','Blackburn Rovers','Newcastle United'],'I was a powerful number nine with an iconic raised-arm celebration.','I remain the Premier League’s all-time leading scorer.'),
  p('Gareth Bale','Wales','winger',['Southampton','Tottenham Hotspur','Real Madrid','Tottenham Hotspur','Los Angeles FC'],'I changed from attacking left-back into an explosive forward.','I scored an overhead kick in the 2018 Champions League final.'),
  p('Cesc Fàbregas','Spain','midfielder',['Arsenal','Barcelona','Chelsea','Monaco','Como'],'I was a creative passer who became a Premier League captain while young.','I assisted the winning goal in the 2010 World Cup final.',['Cesc Fabregas']),
  p('Xabi Alonso','Spain','midfielder',['Real Sociedad','Liverpool','Real Madrid','Bayern Munich'],'I controlled games from deep with long passing.','I won the Champions League with two different clubs.'),
  p('Fernando Torres','Spain','striker',['Atlético Madrid','Liverpool','Chelsea','Milan','Atlético Madrid','Sagan Tosu'],'I was a fast striker nicknamed El Niño.','I scored the winning goal in the Euro 2008 final.'),
  p('Raúl','Spain','forward',['Real Madrid','Schalke 04','Al Sadd','New York Cosmos'],'I was a clever left-footed forward associated with the number seven.','I won three Champions Leagues with Real Madrid.',['Raul']),
  p('Luís Figo','Portugal','winger',['Sporting CP','Barcelona','Real Madrid','Inter'],'I was an elegant wide creator who crossed a famous rivalry.','I won the 2000 Ballon d’Or.',['Luis Figo']),
  p('Deco','Portugal','midfielder',['Corinthians Alagoano','Alverca','Salganeros','Porto','Barcelona','Chelsea','Fluminense'],'I was a creative midfielder who linked two great European club sides.','I won the Champions League with Porto and Barcelona.'),
  p('Zlatan Ibrahimović','Sweden','striker',['Malmö','Ajax','Juventus','Inter','Barcelona','Milan','Paris Saint-Germain','Manchester United','LA Galaxy','Milan'],'I combined height, acrobatics and technique.','I won league titles in the Netherlands, Italy, Spain and France.',['Zlatan Ibrahimovic','Zlatan']),
  p('Robert Lewandowski','Poland','striker',['Znicz Pruszków','Lech Poznań','Borussia Dortmund','Bayern Munich','Barcelona'],'I became an elite penalty-box striker in Germany.','I once scored five Bundesliga goals in nine minutes.'),
  p('Thomas Müller','Germany','forward',['Bayern Munich'],'I am known for finding space rather than relying on flashy dribbling.','I won the 2010 World Cup Golden Boot.',['Thomas Muller']),
  p('Philipp Lahm','Germany','defender',['Bayern Munich','Stuttgart','Bayern Munich'],'I excelled at both full-back positions and later in midfield.','I captained Germany to the 2014 World Cup.'),
  p('Toni Kroos','Germany','midfielder',['Bayern Munich','Bayer Leverkusen','Bayern Munich','Real Madrid'],'I controlled tempo with precise passing and set pieces.','I won six Champions Leagues and the 2014 World Cup.'),
  p('Miroslav Klose','Germany','striker',['Homburg','Kaiserslautern','Werder Bremen','Bayern Munich','Lazio'],'I was a penalty-box striker famous for World Cup goals.','I hold the men’s World Cup finals goals record.'),
  p('Lothar Matthäus','Germany','midfielder',['Borussia Mönchengladbach','Bayern Munich','Inter','Bayern Munich','MetroStars'],'I played as a driving midfielder and later sweeper.','I captained West Germany to the 1990 World Cup.',['Lothar Matthaus']),
  p('Franz Beckenbauer','Germany','defender',['Bayern Munich','New York Cosmos','Hamburg','New York Cosmos'],'I redefined the attacking sweeper role.','I won the World Cup as both player and manager.'),
  p('Gerd Müller','Germany','striker',['1861 Nördlingen','Bayern Munich','Fort Lauderdale Strikers'],'I was a compact penalty-box finisher with extraordinary reactions.','I scored the winner in the 1974 World Cup final.',['Gerd Muller']),
  p('Kaká','Brazil','midfielder',['São Paulo','Milan','Real Madrid','Milan','Orlando City'],'I carried the ball through midfield with long, graceful strides.','I won the 2007 Ballon d’Or.',['Kaka']),
  p('Rivaldo','Brazil','forward',['Santa Cruz','Mogi Mirim','Corinthians','Palmeiras','Deportivo La Coruña','Barcelona','Milan','Cruzeiro','Olympiacos','AEK Athens'],'I was a left-footed scorer and creator.','I won the 1999 Ballon d’Or and the 2002 World Cup.'),
  p('Roberto Carlos','Brazil','defender',['União São João','Palmeiras','Inter','Real Madrid','Fenerbahçe','Corinthians','Anzhi Makhachkala'],'I was a powerful attacking left-back with famous free-kicks.','I won the 2002 World Cup.'),
  p('Cafu','Brazil','defender',['São Paulo','Real Zaragoza','Palmeiras','Roma','Milan'],'I was an energetic attacking right-back.','I captained Brazil to the 2002 World Cup.'),
  p('Dani Alves','Brazil','defender',['Bahia','Sevilla','Barcelona','Juventus','Paris Saint-Germain','São Paulo','Barcelona','UNAM'],'I was a creative right-back who often moved into midfield.','I won multiple Champions Leagues with Barcelona.'),
  p('Marcelo','Brazil','defender',['Fluminense','Real Madrid','Olympiacos','Fluminense'],'I was a highly technical attacking left-back.','I won five Champions Leagues with Real Madrid.'),
  p('Vincent Kompany','Belgium','defender',['Anderlecht','Hamburg','Manchester City','Anderlecht'],'I was a commanding centre-back and leader.','I scored a famous long-range goal in the 2019 title race.'),
  p('Eden Hazard','Belgium','winger',['Lille','Chelsea','Real Madrid'],'I was a left-sided dribbler with a low centre of gravity.','I won league titles in France and England.'),
  p('Thibaut Courtois','Belgium','goalkeeper',['Genk','Chelsea','Atlético Madrid','Chelsea','Real Madrid'],'I am a tall goalkeeper known for reach and one-versus-one saves.','I was player of the match in the 2022 Champions League final.'),
  p('Virgil van Dijk','Netherlands','defender',['Groningen','Celtic','Southampton','Liverpool'],'I am a composed centre-back with pace and aerial strength.','I won the 2019 UEFA Men’s Player of the Year award.'),
  p('Sadio Mané','Senegal','forward',['Metz','Red Bull Salzburg','Southampton','Liverpool','Bayern Munich','Al Nassr'],'I became famous for pressing, runs behind and goals from wide.','I won the Champions League and Africa Cup of Nations.',['Sadio Mane']),
  p('Luis Suárez','Uruguay','striker',['Nacional','Groningen','Ajax','Liverpool','Barcelona','Atlético Madrid','Nacional','Grêmio','Inter Miami'],'I combined aggressive pressing, invention and elite finishing.','I won European Golden Shoes in two different leagues.',['Luis Suarez']),
  p('Edinson Cavani','Uruguay','striker',['Danubio','Palermo','Napoli','Paris Saint-Germain','Manchester United','Valencia','Boca Juniors'],'I was a hard-running striker with excellent penalty-box movement.','I became Paris Saint-Germain’s record scorer before that mark was later passed.'),
  p('Diego Forlán','Uruguay','forward',['Independiente','Manchester United','Villarreal','Atlético Madrid','Inter','Internacional','Cerezo Osaka','Peñarol'],'I was a two-footed forward with powerful long shooting.','I won the Golden Ball at the 2010 World Cup.',['Diego Forlan']),
  p('Radamel Falcao','Colombia','striker',['River Plate','Porto','Atlético Madrid','Monaco','Manchester United','Chelsea','Monaco','Galatasaray','Rayo Vallecano','Millonarios'],'I was nicknamed El Tigre and excelled at penalty-box movement.','I won the Europa League with Porto and Atlético Madrid.'),
  p('Sergio Agüero','Argentina','striker',['Independiente','Atlético Madrid','Manchester City','Barcelona'],'I was a low-centre-of-gravity striker with explosive finishing.','I scored Manchester City’s stoppage-time 2012 title-winning goal.',['Sergio Aguero','Kun Aguero']),
  p('Ángel Di María','Argentina','winger',['Rosario Central','Benfica','Real Madrid','Manchester United','Paris Saint-Germain','Juventus','Benfica'],'I am a left-footed creator who can play wide or inside.','I scored in both Copa América and World Cup final wins.',['Angel Di Maria']),
  p('Carlos Tevez','Argentina','forward',['Boca Juniors','Corinthians','West Ham United','Manchester United','Manchester City','Juventus','Boca Juniors','Shanghai Shenhua','Boca Juniors'],'I was an intense forward known for pressing and powerful finishing.','I won league titles with both Manchester clubs.'),
  p('Javier Mascherano','Argentina','midfielder',['River Plate','Corinthians','West Ham United','Liverpool','Barcelona','Hebei China Fortune','Estudiantes'],'I moved from holding midfield into centre-back at club level.','I won two Champions Leagues with Barcelona.'),
  p('David Silva','Spain','midfielder',['Valencia','Manchester City','Real Sociedad'],'I was a left-footed creator nicknamed Merlin.','I won four Premier League titles.'),
  p('Yaya Touré','Ivory Coast','midfielder',['Beveren','Metalurh Donetsk','Olympiacos','Monaco','Barcelona','Manchester City','Qingdao Huanghai'],'I could dominate midfield through power, carrying and technique.','I scored 20 league goals in Manchester City’s 2013–14 title season.',['Yaya Toure']),
  p('Petr Čech','Czech Republic','goalkeeper',['Chmel Blšany','Sparta Prague','Rennes','Chelsea','Arsenal'],'I was a commanding goalkeeper known for wearing protective headgear.','I hold the Premier League clean-sheet record.',['Petr Cech']),
  p('Andriy Shevchenko','Ukraine','striker',['Dynamo Kyiv','Milan','Chelsea','Dynamo Kyiv'],'I was a fast, complete striker.','I won the 2004 Ballon d’Or.'),
  p('Ruud van Nistelrooy','Netherlands','striker',['Den Bosch','Heerenveen','PSV','Manchester United','Real Madrid','Hamburg','Málaga'],'I was a ruthless penalty-box finisher.','I was Champions League top scorer in three separate seasons.',['Ruud van Nistelrooij']),
  p('Robin van Persie','Netherlands','forward',['Feyenoord','Arsenal','Manchester United','Fenerbahçe','Feyenoord'],'I was a left-footed forward known for volleys and technique.','I captained Arsenal before winning the league at Manchester United.'),
  p('Nicolas Anelka','France','forward',['Paris Saint-Germain','Arsenal','Real Madrid','Paris Saint-Germain','Liverpool','Manchester City','Fenerbahçe','Bolton Wanderers','Chelsea','Shanghai Shenhua','West Bromwich Albion','Mumbai City'],'I was a quick striker whose career crossed many major clubs.','I won the Premier League Golden Boot in 2008–09.'),
  p('Ashley Cole','England','defender',['Arsenal','Chelsea','Roma','LA Galaxy','Derby County'],'I was an elite one-versus-one left-back.','I won the Premier League with Arsenal and Chelsea.'),
  p('Patrice Evra','France','defender',['Marsala','Monza','Nice','Monaco','Manchester United','Juventus','Marseille','West Ham United'],'I was an energetic left-back and vocal leader.','I won the Champions League with Manchester United.'),
  p('Alisson Becker','Brazil','goalkeeper',['Internacional','Roma','Liverpool'],'I am a proactive goalkeeper known for one-versus-one saves and distribution.','I scored a headed goal for Liverpool in 2021.'),
  p('Hugo Lloris','France','goalkeeper',['Nice','Lyon','Tottenham Hotspur','Los Angeles FC'],'I am a quick left-footed goalkeeper and long-time captain.','I lifted the 2018 World Cup for France.'),
  p('Riyad Mahrez','Algeria','winger',['Quimper','Le Havre','Leicester City','Manchester City','Al-Ahli'],'I am a left-footed right winger known for first touch and disguise.','I won the Premier League with Leicester City and Manchester City.'),
  p('Jay-Jay Okocha','Nigeria','midfielder',['Borussia Neunkirchen','Eintracht Frankfurt','Fenerbahçe','Paris Saint-Germain','Bolton Wanderers','Qatar SC','Hull City'],'I was an entertainer famous for dribbling and tricks.','A popular saying claimed I was so good they named me twice.'),
  p('Michael Essien','Ghana','midfielder',['Bastia','Lyon','Chelsea','Real Madrid','Milan','Panathinaikos','Persib Bandung','Sabail'],'I was a powerful, versatile midfielder.','I won the Champions League with Chelsea.'),
  p('Sun Jihai','China','defender',['Dalian Shide','Crystal Palace','Manchester City','Sheffield United','Chengdu Blades','Guizhou Renhe'],'I was a versatile defender and an early Chinese Premier League regular.','I became a cult figure at Manchester City.'),
  p('Park Ji-sung','South Korea','midfielder',['Myongji University','Kyoto Purple Sanga','PSV','Manchester United','Queens Park Rangers'],'I was renowned for stamina, pressing and tactical discipline.','I became the first Asian player to win the Champions League.'),
  p('Tim Cahill','Australia','midfielder',['Millwall','Everton','New York Red Bulls','Shanghai Shenhua','Hangzhou Greentown','Melbourne City','Millwall','Jamshedpur'],'I was an attacking midfielder famous for heading and late box runs.','I scored at three World Cups.'),
  p('Hidetoshi Nakata','Japan','midfielder',['Bellmare Hiratsuka','Perugia','Roma','Parma','Bologna','Fiorentina','Bolton Wanderers'],'I was a stylish midfielder who succeeded in Serie A.','I won the Italian league with Roma.'),
].slice(0,100)

/**
 * Editorial recognisability tiers. These are deliberately explicit rather
 * than inferred from clue length: a short clue about an obscure player is not
 * automatically an easy football question.
 */
export const playerKnowledgeDifficultyTiers: Record<QuizDifficulty, readonly string[]> = {
  beginner: [
    'Lionel Messi','Cristiano Ronaldo','Zinedine Zidane','Ronaldo Nazário','Ronaldinho',
    'Neymar','Kylian Mbappé','Erling Haaland','Mohamed Salah','Kevin De Bruyne',
    'Luka Modrić','Andrés Iniesta','Xavi','Sergio Ramos','Manuel Neuer',
    'Gianluigi Buffon','Diego Maradona','Pelé','Thierry Henry','David Beckham',
  ],
  easy: [
    'Sergio Busquets','Iker Casillas','Paolo Maldini','Fabio Cannavaro','Andrea Pirlo',
    'Francesco Totti','Alessandro Del Piero','Roberto Baggio','Johan Cruyff','Marco van Basten',
    'Dennis Bergkamp','Arjen Robben','Didier Drogba','Karim Benzema','Wayne Rooney',
    'Steven Gerrard','Frank Lampard','Gareth Bale','Zlatan Ibrahimović','Robert Lewandowski',
  ],
  normal: [
    'Franco Baresi','Gabriel Batistuta','Ruud Gullit','Wesley Sneijder','Clarence Seedorf',
    'Patrick Vieira','N’Golo Kanté','Antoine Griezmann','Paul Scholes','Ryan Giggs',
    'Eric Cantona','Alan Shearer','Cesc Fàbregas','Xabi Alonso','Fernando Torres',
    'Raúl','Luís Figo','Thomas Müller','Toni Kroos','Roberto Carlos',
  ],
  hard: [
    'Samuel Eto’o','George Weah','Claude Makélélé','Philipp Lahm','Miroslav Klose',
    'Lothar Matthäus','Franz Beckenbauer','Gerd Müller','Kaká','Rivaldo',
    'Cafu','Dani Alves','Marcelo','Vincent Kompany','Eden Hazard',
    'Thibaut Courtois','Virgil van Dijk','Sadio Mané','Luis Suárez','Sergio Agüero',
  ],
  expert: [
    'Edgar Davids','Deco','Edinson Cavani','Diego Forlán','Radamel Falcao',
    'Ángel Di María','Carlos Tevez','Javier Mascherano','David Silva','Yaya Touré',
    'Petr Čech','Andriy Shevchenko','Ruud van Nistelrooy','Robin van Persie','Nicolas Anelka',
    'Ashley Cole','Patrice Evra','Alisson Becker','Hugo Lloris','Riyad Mahrez',
  ],
}

export const whoAmIQuestionBank:WhoAmIQuestion[]=playerKnowledgeProfiles.map(profile=>({
  answer:profile.answer,
  aliases:profile.aliases,
  clues:[`I represented ${profile.nationality}.`,`My selected senior club path includes ${profile.clubs.slice(0,3).join(', ')}.`,profile.signature,profile.landmark],
}))

export const careerQuestionBank:CareerQuestion[]=playerKnowledgeProfiles.map(profile=>({answer:profile.answer,aliases:profile.aliases,clubs:profile.clubs,hint:`${profile.nationality} ${profile.role}`}))

export const PLAYER_KNOWLEDGE_ROUND_SIZE=10
export const PLAYER_KNOWLEDGE_ROUND_COUNT=10
export const PLAYER_KNOWLEDGE_DIFFICULTY_ROUND_COUNT=2
export const playerKnowledgeRoundNames=['Modern Icons','Creators and Captains','Defensive Masters','European Greats','Premier League Icons','Global Stars','Midfield Controllers','Goals and Glory','Journeymen and Leaders','World Football Mix'] as const
export const playerKnowledgeDifficultyRoundNames=['First XI','Second XI'] as const
function roundSlice<T>(items:T[],round:number){if(!Number.isSafeInteger(round)||round<1||round>PLAYER_KNOWLEDGE_ROUND_COUNT)throw new Error('Player knowledge round is outside the available range.');const start=(round-1)*PLAYER_KNOWLEDGE_ROUND_SIZE;return items.slice(start,start+PLAYER_KNOWLEDGE_ROUND_SIZE)}
export function getWhoAmIRound(round:number){return roundSlice(whoAmIQuestionBank,round)}
export function getCareerRound(round:number){return roundSlice(careerQuestionBank,round)}

function difficultyRoundSlice<T extends { answer: string }>(items:T[],difficulty:QuizDifficulty,round:number){
  if(!Number.isSafeInteger(round)||round<1||round>PLAYER_KNOWLEDGE_DIFFICULTY_ROUND_COUNT)throw new Error('Difficulty round is outside the available range.')
  const allowed=new Set(playerKnowledgeDifficultyTiers[difficulty])
  const pool=items.filter((item)=>allowed.has(item.answer))
  if(pool.length!==20)throw new Error(`${difficulty} player-knowledge tier must contain exactly 20 players.`)
  const start=(round-1)*PLAYER_KNOWLEDGE_ROUND_SIZE
  return pool.slice(start,start+PLAYER_KNOWLEDGE_ROUND_SIZE)
}

export function getWhoAmIDifficultyPool(difficulty:QuizDifficulty){const allowed=new Set(playerKnowledgeDifficultyTiers[difficulty]);return whoAmIQuestionBank.filter((item)=>allowed.has(item.answer))}
export function getCareerDifficultyPool(difficulty:QuizDifficulty){const allowed=new Set(playerKnowledgeDifficultyTiers[difficulty]);return careerQuestionBank.filter((item)=>allowed.has(item.answer))}
export function getWhoAmIDifficultyRound(difficulty:QuizDifficulty,round:number){return difficultyRoundSlice(whoAmIQuestionBank,difficulty,round)}
export function getCareerDifficultyRound(difficulty:QuizDifficulty,round:number){return difficultyRoundSlice(careerQuestionBank,difficulty,round)}

export function normalisePlayerGuess(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')}
export function playerGuessMatches(value:string,question:{answer:string;aliases?:string[]}){const guess=normalisePlayerGuess(value);return [question.answer,...(question.aliases??[])].some(answer=>normalisePlayerGuess(answer)===guess)}
