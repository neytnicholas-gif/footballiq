import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { ScoutGame } from '@/components/scout-game'
import { ProAccessGate } from '@/components/membership/pro-access-gate'

export default function Page() {
	return (
		<main className="min-h-screen bg-background">
			<SiteHeader />
			<section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
				<div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Scout Vision</p>
					<h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Read evidence. Judge projection. Justify recommendation.</h1>
					<p className="mt-3 max-w-3xl text-muted-foreground">Start with the standard free dossiers below. Pro users can then run the complete Scout Room report-builder experience.</p>
				</div>

				<div className="mt-6 grid gap-5 lg:grid-cols-[1.18fr_0.82fr]">
					<div>
						<h2 className="mb-3 text-xl font-black tracking-tight">Standard Scout Vision (Free)</h2>
						<ScoutGame />
					</div>

					<div className="space-y-4">
						<ProAccessGate
							title="Scout Room: Player Evaluation"
							copy="A full premium workflow with dossier synthesis, judgement capture, structured report, and expert-style debrief."
							variant="preview"
							preview={
								<div className="rounded-xl border border-border bg-background/70 p-3">
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Premium preview</p>
									<ul className="mt-2 space-y-1 text-sm text-muted-foreground">
										<li>• Fictional player dossier with contextual signals</li>
										<li>• Strength and concern selection</li>
										<li>• Confidence-based recommendation</li>
										<li>• Observation to recommendation debrief structure</li>
									</ul>
								</div>
							}
						>
							<div className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
								<p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Pro module available now</p>
								<h3 className="mt-2 text-2xl font-black tracking-tight">Launch Scout Room</h3>
								<p className="mt-2 text-sm text-muted-foreground">Complete premium scouting assessment with structured analysis reveal.</p>
								<Link href="/academy/scout/scout-room-player-evaluation" className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Open module</Link>
							</div>
						</ProAccessGate>
						<Link href="/academy/scout" className="inline-flex text-sm font-semibold text-primary">Open Scout Academy pathway</Link>
					</div>
				</div>
			</section>
		</main>
	)
}
