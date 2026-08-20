import { describe, expect, it } from 'vitest'
import {
  coreDuelPacks,
  duelPacks,
  DUEL_CORE_PACKS_PER_THEME,
  DUEL_RESERVE_PACKS_PER_THEME,
  getDuelPackDifficulty,
  getDuelThemeId,
  isDuelReservePack,
  reserveDuelPacks,
} from '@/lib/duel-packs'
import { higherLowerDecks, higherLowerItems } from '@/lib/game-data'
import { getCareerRound, getWhoAmIRound, playerGuessMatches, playerKnowledgeProfiles } from '@/lib/player-knowledge-bank'
import { verifyQuizReward } from '@/lib/quiz-rules'

const completionKey='cqk:quick-game-test:run-123456789012345678901234'
function seededShuffle<T>(items:T[],seed:number){const copy=[...items];let value=seed||1;for(let index=copy.length-1;index>0;index-=1){value=(value*9301+49297)%233280;const randomIndex=Math.floor((value/233280)*(index+1));[copy[index],copy[randomIndex]]=[copy[randomIndex]!,copy[index]!]}return copy}

describe('expanded quick-game libraries',()=>{
  it('ships ten core and three reserve packs for every duel theme',()=>{
    expect(coreDuelPacks).toHaveLength(100)
    expect(reserveDuelPacks).toHaveLength(30)
    expect(duelPacks).toHaveLength(130)
    expect(new Set(duelPacks.map(pack=>pack.id)).size).toBe(130)
    expect(duelPacks.every(pack=>pack.questions.length===10)).toBe(true)
    expect(higherLowerDecks).toHaveLength(10)
    expect(higherLowerDecks.every(deck=>deck.items.length===14)).toBe(true)
    expect(higherLowerItems).toHaveLength(140)
    expect(playerKnowledgeProfiles).toHaveLength(100)
    expect(new Set(playerKnowledgeProfiles.map(player=>player.answer)).size).toBe(100)
  })

  it('does not pad the larger libraries with repeated cards or pairings',()=>{
    const packsByTheme=new Map<string,typeof duelPacks>()
    for(const pack of duelPacks){
      const theme=getDuelThemeId(pack.id)
      packsByTheme.set(theme,[...(packsByTheme.get(theme)??[]),pack])
    }
    expect(packsByTheme.size).toBe(10)
    for(const packs of packsByTheme.values()){
      expect(packs).toHaveLength(DUEL_CORE_PACKS_PER_THEME+DUEL_RESERVE_PACKS_PER_THEME)
      expect(packs.filter(pack=>isDuelReservePack(pack.id))).toHaveLength(DUEL_RESERVE_PACKS_PER_THEME)
      const pairings=packs.flatMap(pack=>pack.questions.map(question=>[question.left.name,question.right.name].sort().join(' :: ')))
      expect(new Set(pairings).size).toBe(130)
    }
    for(const deck of higherLowerDecks){
      expect(new Set(deck.items.map(item=>item.name)).size).toBe(14)
      expect(deck.items.every(item=>item.detail.trim().length>0&&Number.isFinite(item.value))).toBe(true)
    }
    expect(new Set(playerKnowledgeProfiles.map(player=>[player.nationality,player.role,player.clubs.join(' > '),player.signature,player.landmark].join(' :: '))).size).toBe(100)
  })

  it('offers two distinct stat themes at every difficulty with no tied duels',()=>{
    const themesByDifficulty=new Map<string,Set<string>>()
    for(const pack of duelPacks){
      const difficulty=getDuelPackDifficulty(pack.id)
      const theme=getDuelThemeId(pack.id)
      const themes=themesByDifficulty.get(difficulty)??new Set<string>()
      themes.add(theme)
      themesByDifficulty.set(difficulty,themes)
      expect(pack.questions.every(question=>question.left.value!==question.right.value)).toBe(true)
    }
    expect([...themesByDifficulty.values()].map(themes=>themes.size)).toEqual([2,2,2,2,2])
  })

  it('keeps ten short career and mystery rounds with complete learning content',()=>{
    for(let round=1;round<=10;round+=1){
      const careers=getCareerRound(round)
      const mysteries=getWhoAmIRound(round)
      expect(careers).toHaveLength(10)
      expect(mysteries).toHaveLength(10)
      expect(careers.every(question=>question.clubs.length>=1&&question.hint.length>3)).toBe(true)
      expect(mysteries.every(question=>question.clues.length===4&&question.clues.every(Boolean))).toBe(true)
    }
    expect(playerGuessMatches('Andres Iniesta',getWhoAmIRound(2)[1]!)).toBe(true)
  })

  it('server-verifies every career, mystery and higher/lower session',()=>{
    for(let round=1;round<=10;round+=1){
      const career=getCareerRound(round)
      const careerResult=verifyQuizReward({quizId:`career-path-${round}`,score:10,total:10,completionKey,proof:{kind:'career',round,answers:career.map(question=>question.answer)}})
      expect(careerResult.score).toBe(10)

      const mystery=getWhoAmIRound(round)
      const mysteryResult=verifyQuizReward({quizId:`who-am-i-${round}`,score:40,total:40,completionKey,proof:{kind:'who-am-i',round,answers:mystery.map(question=>({guess:question.answer,clues:1}))}})
      expect(mysteryResult.score).toBe(40)
    }

    for(const [deckIndex,definition] of higherLowerDecks.entries()){
      const seed=48157+deckIndex*101
      const deck=seededShuffle(definition.items,seed)
      const answers=deck.slice(1).map((right,index)=>right.value>=deck[index]!.value)
      const result=verifyQuizReward({quizId:`higher-lower-${definition.id}`,score:13,total:13,completionKey,proof:{kind:'higher-lower',deckId:definition.id,deckSeed:seed,answers}})
      expect(result.score).toBe(13)
    }
  })

  it('rejects mismatched quick-game session proofs',()=>{
    const career=getCareerRound(1)
    expect(()=>verifyQuizReward({quizId:'career-path-2',score:10,total:10,completionKey,proof:{kind:'career',round:1,answers:career.map(question=>question.answer)}})).toThrow('wrong round')
    const definition=higherLowerDecks[0]!
    expect(()=>verifyQuizReward({quizId:`higher-lower-${definition.id}`,score:0,total:13,completionKey,proof:{kind:'higher-lower',deckId:higherLowerDecks[1]!.id,deckSeed:48157,answers:[false]}})).toThrow('unknown deck')
  })
})
