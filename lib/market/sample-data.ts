import { toMarketSlug } from '@/lib/market/provider'
import type { MarketPlayer, MarketSeasonStats } from '@/lib/market/types'

type SampleSeed = {
	name: string
	club: string
	position: 'GK' | 'DEF' | 'MID' | 'FWD'
	nationality: string
	age: number
	current: number
	previous: number
	opening: number
	form: 'hot' | 'steady' | 'cool'
	role: 'secure' | 'rotation' | 'risk'
	note: string
}

const seeds: SampleSeed[] = [
	{ name: 'Lucas Vale', club: 'Northbridge FC', position: 'GK', nationality: 'Portugal', age: 27, current: 6200000, previous: 6100000, opening: 5900000, form: 'steady', role: 'secure', note: 'Shot-stopping baseline has stayed strong over recent weeks.' },
	{ name: 'Mateo Ryder', club: 'Kingsport Athletic', position: 'GK', nationality: 'Argentina', age: 25, current: 7100000, previous: 7000000, opening: 6800000, form: 'hot', role: 'secure', note: 'Undervalued profile due to elite save volume and consistent starts.' },
	{ name: 'Daniel Hart', club: 'Riverside Albion', position: 'GK', nationality: 'England', age: 29, current: 5400000, previous: 5400000, opening: 5200000, form: 'steady', role: 'rotation', note: 'Value is stable while role security remains mixed.' },
	{ name: 'Tariq Ibrahim', club: 'Southgate City', position: 'GK', nationality: 'Morocco', age: 31, current: 4800000, previous: 4700000, opening: 4500000, form: 'steady', role: 'secure', note: 'Low entry price with steady minute security.' },
	{ name: 'Sean Doyle', club: 'Westhaven FC', position: 'GK', nationality: 'Ireland', age: 24, current: 5000000, previous: 4900000, opening: 4700000, form: 'hot', role: 'rotation', note: 'Upside exists if he keeps the starting role.' },
	{ name: 'Aron Veseli', club: 'Metro Stars', position: 'GK', nationality: 'Albania', age: 28, current: 5600000, previous: 5700000, opening: 5500000, form: 'cool', role: 'secure', note: 'Recent dip may offer a value-entry window.' },
	{ name: 'Leon Costa', club: 'Harbor United', position: 'DEF', nationality: 'Spain', age: 26, current: 8600000, previous: 8400000, opening: 7900000, form: 'hot', role: 'secure', note: 'Sustained ball-winning output supports current rise.' },
	{ name: 'Owen Byrne', club: 'Northbridge FC', position: 'DEF', nationality: 'Ireland', age: 28, current: 6700000, previous: 6800000, opening: 6400000, form: 'cool', role: 'secure', note: 'Minor pullback despite stable starts and minutes.' },
	{ name: 'Kai Mensah', club: 'Kingsport Athletic', position: 'DEF', nationality: 'Ghana', age: 23, current: 7300000, previous: 7200000, opening: 7000000, form: 'steady', role: 'secure', note: 'Reliable minutes keep downside limited.' },
	{ name: 'Julian Rossi', club: 'Riverside Albion', position: 'DEF', nationality: 'Italy', age: 27, current: 9100000, previous: 9000000, opening: 8500000, form: 'hot', role: 'secure', note: 'Defensive consistency and role security remain high.' },
	{ name: 'Milan Kovac', club: 'Southgate City', position: 'DEF', nationality: 'Croatia', age: 30, current: 6400000, previous: 6500000, opening: 6200000, form: 'cool', role: 'secure', note: 'Short-term weakness but long-run value still intact.' },
	{ name: 'Samir Latif', club: 'Harbor United', position: 'DEF', nationality: 'Tunisia', age: 25, current: 5900000, previous: 5900000, opening: 5600000, form: 'steady', role: 'rotation', note: 'Rotation risk limits upside despite fair pricing.' },
	{ name: 'Noah Clarke', club: 'Easton Rovers', position: 'DEF', nationality: 'England', age: 22, current: 5200000, previous: 5100000, opening: 5000000, form: 'steady', role: 'secure', note: 'Low-cost entry with incremental value movement.' },
	{ name: 'Yuta Saito', club: 'Metro Stars', position: 'DEF', nationality: 'Japan', age: 24, current: 7800000, previous: 7600000, opening: 7200000, form: 'hot', role: 'secure', note: 'Momentum and clean-sheet trend support higher ceiling.' },
	{ name: 'Joao Pires', club: 'Coastal Wanderers', position: 'DEF', nationality: 'Portugal', age: 29, current: 6100000, previous: 6200000, opening: 6000000, form: 'cool', role: 'rotation', note: 'Recent value dip reflects uncertain starts.' },
	{ name: 'Viktor Havel', club: 'Northbridge FC', position: 'DEF', nationality: 'Czech Republic', age: 27, current: 7000000, previous: 6900000, opening: 6600000, form: 'steady', role: 'secure', note: 'Consistent base profile with gradual upside.' },
	{ name: 'Elias Noor', club: 'Kingsport Athletic', position: 'DEF', nationality: 'Sweden', age: 23, current: 5800000, previous: 5700000, opening: 5400000, form: 'hot', role: 'rotation', note: 'Early momentum but role security remains moderate.' },
	{ name: 'Bruno Kael', club: 'Riverside Albion', position: 'DEF', nationality: 'Brazil', age: 21, current: 6000000, previous: 5900000, opening: 5600000, form: 'hot', role: 'risk', note: 'High-upside option if he keeps starting opportunities.' },
	{ name: 'Kieran Sol', club: 'Southgate City', position: 'DEF', nationality: 'Scotland', age: 28, current: 6500000, previous: 6600000, opening: 6400000, form: 'cool', role: 'secure', note: 'Temporary softness despite stable defensive volume.' },
	{ name: 'Adrian Fonseca', club: 'Northbridge FC', position: 'MID', nationality: 'Uruguay', age: 26, current: 10200000, previous: 10000000, opening: 9600000, form: 'hot', role: 'secure', note: 'Creative output and minutes profile signal sustained demand.' },
	{ name: 'Liam Murphy', club: 'Kingsport Athletic', position: 'MID', nationality: 'Scotland', age: 24, current: 9300000, previous: 9200000, opening: 8800000, form: 'steady', role: 'secure', note: 'Reliable production makes this a stable investment.' },
	{ name: 'Enzo Marin', club: 'Riverside Albion', position: 'MID', nationality: 'France', age: 25, current: 11400000, previous: 11200000, opening: 10500000, form: 'hot', role: 'secure', note: 'Undervalued relative to consistent elite final-third output.' },
	{ name: 'Rafael Nunes', club: 'Southgate City', position: 'MID', nationality: 'Brazil', age: 24, current: 12300000, previous: 12000000, opening: 11500000, form: 'hot', role: 'secure', note: 'High form and secure role justify premium value.' },
	{ name: 'Dario Petrov', club: 'Harbor United', position: 'MID', nationality: 'Serbia', age: 29, current: 8100000, previous: 8200000, opening: 7900000, form: 'cool', role: 'secure', note: 'Quiet weeks may present a patient entry point.' },
	{ name: 'Felix Adams', club: 'Easton Rovers', position: 'MID', nationality: 'United States', age: 23, current: 7600000, previous: 7500000, opening: 7200000, form: 'steady', role: 'rotation', note: 'Attractive price if minutes trend improves.' },
	{ name: 'Omar Khaled', club: 'Metro Stars', position: 'MID', nationality: 'Egypt', age: 27, current: 9800000, previous: 9600000, opening: 9100000, form: 'hot', role: 'secure', note: 'Rising form and key-pass volume are driving demand.' },
	{ name: 'Tomas Belik', club: 'Westhaven FC', position: 'MID', nationality: 'Czech Republic', age: 30, current: 6800000, previous: 6700000, opening: 6400000, form: 'steady', role: 'secure', note: 'Low-volatility holding with predictable output.' },
	{ name: 'Alexei Volkov', club: 'Coastal Wanderers', position: 'MID', nationality: 'Ukraine', age: 26, current: 7900000, previous: 7800000, opening: 7400000, form: 'steady', role: 'secure', note: 'Solid balance of security and value.' },
	{ name: 'Nikolai Frisk', club: 'Northbridge FC', position: 'MID', nationality: 'Denmark', age: 22, current: 6900000, previous: 6800000, opening: 6400000, form: 'hot', role: 'risk', note: 'Early breakout profile with volatility risk.' },
	{ name: 'Mason Oduro', club: 'Kingsport Athletic', position: 'MID', nationality: 'Ghana', age: 24, current: 8400000, previous: 8300000, opening: 7900000, form: 'steady', role: 'secure', note: 'Balanced profile suits medium-risk portfolios.' },
	{ name: 'Pablo Mena', club: 'Riverside Albion', position: 'MID', nationality: 'Chile', age: 28, current: 8700000, previous: 8800000, opening: 8600000, form: 'cool', role: 'rotation', note: 'Value has eased as role certainty dipped.' },
	{ name: 'Andre Silva Jr', club: 'Northbridge FC', position: 'FWD', nationality: 'Brazil', age: 24, current: 13700000, previous: 13500000, opening: 12800000, form: 'hot', role: 'secure', note: 'Premium upside backed by consistent end-product.' },
	{ name: 'Matias Orozco', club: 'Kingsport Athletic', position: 'FWD', nationality: 'Chile', age: 26, current: 11900000, previous: 11600000, opening: 10800000, form: 'hot', role: 'secure', note: 'Momentum remains strong with repeated returns.' },
	{ name: 'Ivan Keller', club: 'Riverside Albion', position: 'FWD', nationality: 'Germany', age: 28, current: 9500000, previous: 9400000, opening: 9000000, form: 'steady', role: 'secure', note: 'Dependable starter profile with steady demand.' },
	{ name: 'Youssef Ammar', club: 'Southgate City', position: 'FWD', nationality: 'Algeria', age: 25, current: 8800000, previous: 8700000, opening: 8300000, form: 'steady', role: 'rotation', note: 'Good price point but role fluctuations cap ceiling.' },
	{ name: 'Jonas Holm', club: 'Harbor United', position: 'FWD', nationality: 'Denmark', age: 27, current: 11200000, previous: 11000000, opening: 10300000, form: 'hot', role: 'secure', note: 'Strong form and secure starts support upward trend.' },
	{ name: 'Mika Reyes', club: 'Easton Rovers', position: 'FWD', nationality: 'Mexico', age: 22, current: 7400000, previous: 7300000, opening: 7000000, form: 'steady', role: 'risk', note: 'High-upside budget investment with role uncertainty.' },
	{ name: 'Hamza Benali', club: 'Metro Stars', position: 'FWD', nationality: 'Morocco', age: 29, current: 6600000, previous: 6500000, opening: 6200000, form: 'steady', role: 'rotation', note: 'Affordable option with moderate minute volatility.' },
	{ name: 'Ruben Larsen', club: 'Westhaven FC', position: 'FWD', nationality: 'Norway', age: 26, current: 10400000, previous: 10200000, opening: 9700000, form: 'hot', role: 'secure', note: 'Rising conversion trend makes this an attractive hold.' },
	{ name: 'Diego Tello', club: 'Coastal Wanderers', position: 'FWD', nationality: 'Spain', age: 23, current: 8300000, previous: 8200000, opening: 7800000, form: 'steady', role: 'secure', note: 'Steady returns with room for valuation growth.' },
	{ name: 'Arman Ghali', club: 'Northbridge FC', position: 'FWD', nationality: 'Iran', age: 21, current: 7200000, previous: 7100000, opening: 6700000, form: 'hot', role: 'risk', note: 'Emerging profile with high variance week to week.' },
	{ name: 'Stefan Kuyt', club: 'Kingsport Athletic', position: 'FWD', nationality: 'Netherlands', age: 30, current: 7900000, previous: 8000000, opening: 7700000, form: 'cool', role: 'rotation', note: 'Recent cooling could become a contrarian entry point.' },
	{ name: 'Lorenzo Bassi', club: 'Riverside Albion', position: 'DEF', nationality: 'Italy', age: 25, current: 6900000, previous: 6800000, opening: 6500000, form: 'steady', role: 'secure', note: 'Defensive stability supports predictable returns.' },
	{ name: 'Petr Novak', club: 'Southgate City', position: 'DEF', nationality: 'Czech Republic', age: 24, current: 5700000, previous: 5600000, opening: 5300000, form: 'hot', role: 'rotation', note: 'Improving trend with moderate role risk priced in.' },
	{ name: 'Rico Amani', club: 'Harbor United', position: 'MID', nationality: 'Kenya', age: 23, current: 7300000, previous: 7200000, opening: 6800000, form: 'steady', role: 'secure', note: 'Low-entry midfield hold with healthy minutes floor.' },
	{ name: 'Evan Reid', club: 'Easton Rovers', position: 'DEF', nationality: 'Wales', age: 27, current: 6200000, previous: 6300000, opening: 6100000, form: 'cool', role: 'secure', note: 'Short-term softness despite durable role security.' },
	{ name: 'Toby Marsh', club: 'Metro Stars', position: 'GK', nationality: 'England', age: 22, current: 4700000, previous: 4800000, opening: 4600000, form: 'cool', role: 'risk', note: 'Low valuation reflects uncertain start probability.' },
	{ name: 'Nico Parra', club: 'Westhaven FC', position: 'MID', nationality: 'Colombia', age: 25, current: 8800000, previous: 8700000, opening: 8200000, form: 'hot', role: 'secure', note: 'Consistent chance creation supports continued demand.' },
	{ name: 'Arda Yilmaz', club: 'Coastal Wanderers', position: 'DEF', nationality: 'Turkey', age: 26, current: 6600000, previous: 6500000, opening: 6200000, form: 'steady', role: 'secure', note: 'Balanced risk-return profile for portfolio depth.' },
	{ name: 'Sven Muller', club: 'Westhaven FC', position: 'GK', nationality: 'Germany', age: 30, current: 5300000, previous: 5200000, opening: 5000000, form: 'steady', role: 'secure', note: 'Veteran baseline with low weekly volatility.' },
]

function movement(current: number, previous: number) {
	if (current > previous) return 'rising' as const
	if (current < previous) return 'falling' as const
	return 'flat' as const
}

export function buildSampleMarketPlayers(): MarketPlayer[] {
	const now = new Date().toISOString()
	return seeds.map((seed, index) => ({
		id: index + 1,
		slug: toMarketSlug(seed.name),
		display_name: seed.name,
		short_name: seed
			.name
			.split(' ')
			.map((part, partIndex) => (partIndex === 0 ? `${part.charAt(0)}.` : part))
			.join(' '),
		club_name: seed.club,
		position: seed.position,
		age: seed.age,
		nationality: seed.nationality,
		active: true,
		current_value: seed.current,
		previous_value: seed.previous,
		opening_season_value: seed.opening,
		value_updated_at: now,
		data_updated_at: now,
		data_source_label: 'Back Your Eye simulated dataset',
		source_reference: 'fiq-sim-v1',
		provenance_status: 'owner_seed_demo',
		owner_verified: true,
		is_trade_locked: false,
		trade_lock_reason: null,
		trade_lock_started_at: null,
		trade_lock_ends_at: null,
		value_trend: movement(seed.current, seed.previous),
		recent_form_indicator: seed.form,
		role_security_indicator: seed.role,
		availability_status: 'available',
		decision_support_note: seed.note,
		matchweek_performance_history: [
			{ week: 1, rating: seed.form === 'hot' ? 7.6 : seed.form === 'steady' ? 6.9 : 6.3, minutes: seed.role === 'secure' ? 90 : seed.role === 'rotation' ? 72 : 58 },
			{ week: 2, rating: seed.form === 'hot' ? 7.8 : seed.form === 'steady' ? 7.0 : 6.2, minutes: seed.role === 'secure' ? 88 : seed.role === 'rotation' ? 70 : 55 },
			{ week: 3, rating: seed.form === 'hot' ? 7.5 : seed.form === 'steady' ? 6.8 : 6.1, minutes: seed.role === 'secure' ? 90 : seed.role === 'rotation' ? 74 : 60 },
		],
		created_at: now,
		updated_at: now,
	}))
}

export function buildSampleSeasonStats(players: MarketPlayer[]): MarketSeasonStats[] {
	const now = new Date().toISOString()
	return players.map((player, index) => {
		const secure = player.role_security_indicator === 'secure'
		const rotation = player.role_security_indicator === 'rotation'
		const minutes = secure ? 2520 : rotation ? 2160 : 1740
		const ratingBase = player.recent_form_indicator === 'hot' ? 7.45 : player.recent_form_indicator === 'steady' ? 6.92 : 6.38
		return {
			id: index + 1,
			player_id: player.id,
			season: '2026',
			competition_label: 'Back Your Eye Sim League',
			appearances: secure ? 31 : rotation ? 28 : 23,
			starts: secure ? 29 : rotation ? 24 : 17,
			minutes,
			goals: player.position === 'FWD' ? 11 : player.position === 'MID' ? 6 : 1,
			assists: player.position === 'MID' ? 7 : player.position === 'FWD' ? 4 : 1,
			clean_sheets: player.position === 'GK' || player.position === 'DEF' ? 9 : null,
			yellow_cards: player.position === 'DEF' ? 5 : 3,
			red_cards: 0,
			shots: player.position === 'FWD' ? 58 : player.position === 'MID' ? 36 : null,
			shots_on_target: player.position === 'FWD' ? 26 : player.position === 'MID' ? 15 : null,
			chances_created: player.position === 'MID' ? 41 : player.position === 'FWD' ? 20 : null,
			key_passes: player.position === 'MID' ? 52 : player.position === 'FWD' ? 18 : null,
			passes_completed: player.position === 'MID' ? 1432 : player.position === 'DEF' ? 1280 : 820,
			pass_accuracy: player.position === 'MID' ? 86.2 : player.position === 'DEF' ? 84.3 : 78.1,
			tackles: player.position === 'DEF' || player.position === 'MID' ? 47 : null,
			interceptions: player.position === 'DEF' || player.position === 'MID' ? 39 : null,
			clearances: player.position === 'DEF' ? 91 : null,
			blocks: player.position === 'DEF' ? 17 : null,
			saves: player.position === 'GK' ? 89 : null,
			goals_conceded: player.position === 'GK' ? 34 : player.position === 'DEF' ? 39 : null,
			expected_goals: player.position === 'FWD' ? 10.2 : player.position === 'MID' ? 5.1 : null,
			expected_assists: player.position === 'MID' ? 6.8 : player.position === 'FWD' ? 3.1 : null,
			average_rating: Number(ratingBase.toFixed(2)),
			data_source: 'Back Your Eye simulated dataset',
			source_reference: 'fiq-sim-v1',
			provenance_status: 'owner_seed_demo',
			owner_verified: true,
			last_verified_at: now,
			created_at: now,
			updated_at: now,
		}
	})
}
