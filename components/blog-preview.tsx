import { ArrowRight } from 'lucide-react'
import { Reveal } from '@/components/reveal'

const articles = [
  {
    image: '/images/blog-striker.png',
    tag: 'Talent ID',
    title: 'What Makes A Great Youth Striker?',
    description:
      'The movement, mentality and finishing traits scouts look for long before the goals arrive.',
  },
  {
    image: '/images/blog-scout.png',
    tag: 'Analysis',
    title: 'How Scouts Watch A Match',
    description:
      'A behind-the-scenes look at what professional scouts track when the ball is nowhere near the player.',
  },
  {
    image: '/images/blog-mistakes.png',
    tag: 'Development',
    title: '5 Mistakes Young Scouts Make',
    description:
      'From over-valuing highlight moments to ignoring the intangibles — avoid these common traps.',
  },
]

export function BlogPreview() {
  return (
    <section id="blog" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <span className="text-sm font-medium uppercase tracking-widest text-primary">
            Football Analysis
          </span>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Learn the game beyond the scoreline
          </h2>
        </div>
        <a
          href="#blog"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-foreground"
        >
          View all articles
          <ArrowRight className="size-4" />
        </a>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        {articles.map((article, i) => (
          <Reveal
            key={article.title}
            as="article"
            delay={i * 100}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <img
                src={article.image || '/placeholder.svg'}
                alt={article.title}
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute left-3 top-3 rounded-full bg-background/70 px-3 py-1 text-xs font-medium backdrop-blur">
                {article.tag}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-6">
              <h3 className="text-lg font-semibold leading-snug tracking-tight">
                {article.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {article.description}
              </p>
              <a
                href="#blog"
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors group-hover:gap-3"
              >
                Read More
                <ArrowRight className="size-4 transition-transform" />
              </a>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
