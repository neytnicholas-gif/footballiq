import { QuizFriendLeagues } from '@/components/quiz-friend-leagues'
import { SiteHeader } from '@/components/site-header'

export default function QuizLeaguesPage(){
  return <main className="min-h-screen bg-[#07111f] text-slate-100"><SiteHeader/><section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-11"><QuizFriendLeagues/></section></main>
}
