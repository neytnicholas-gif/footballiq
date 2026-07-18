'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { SiteHeader } from '@/components/site-header'
import { ModeCard } from '@/components/mode-card'
import { ComingSoonCard } from '@/components/coming-soon-card'
import { useState } from 'react'

export default function QuizzesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('all')

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-24 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="h-40 animate-pulse rounded-3xl bg-secondary/60" />
        </div>
      </div>
    )
  }

  if (!user) {
    router.replace('/login')
    return null
  }

  const quizzes = [
    {
      id: 'football-duels',
      title: 'Football Duels',
      description: 'Rate player decisions in real-game situations. Predict the rating of plays.',
      category: 'football-duels',
      available: true,
      href: '/quizzes/football-duels',
    },
    {
      id: 'refereeing',
      title: 'Refereeing',
      description: 'Make the call as a referee. Learn the rules through interactive scenarios.',
      category: 'refereeing',
      available: false,
    },
    {
      id: 'scouting',
      title: 'Scouting',
      description: 'Analyze player performance and potential. Build your scouting reports.',
      category: 'scouting',
      available: false,
    },
    {
      id: 'stats-tactics',
      title: 'Stats & Tactics',
      description: 'Test your knowledge of football statistics and tactical formations.',
      category: 'stats-tactics',
      available: false,
    },
    {
      id: 'history',
      title: 'Football History',
      description: 'Test your knowledge of legendary moments and historical figures in football.',
      category: 'history',
      available: false,
    },
  ]

  const filteredQuizzes = activeTab === 'all' ? quizzes : quizzes.filter((q) => q.category === activeTab)

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <div className="pt-24 px-4 pb-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold">Quiz Modes</h1>
            <p className="mt-2 text-muted-foreground">Choose a quiz mode to test your football knowledge</p>
          </div>

          {/* Category Tabs */}
          <div className="mb-8 flex flex-wrap gap-2">
            {['All', 'Football Duels', 'Refereeing', 'Scouting', 'Stats & Tactics', 'History'].map((tab) => {
              const tabId = tab.toLowerCase().replace(/ & /, '-').replace(/ /g, '-')
              const isActive = activeTab === (tab === 'All' ? 'all' : tabId)

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab === 'All' ? 'all' : tabId)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-background'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}
                >
                  {tab}
                </button>
              )
            })}
          </div>

          {/* Quiz Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredQuizzes.map((quiz) =>
              quiz.available ? (
                <ModeCard
                  key={quiz.id}
                  title={quiz.title}
                  description={quiz.description}
                  href={quiz.href}
                  isClickable={true}
                />
              ) : (
                <ComingSoonCard
                  key={quiz.id}
                  title={quiz.title}
                  description={quiz.description}
                />
              )
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
