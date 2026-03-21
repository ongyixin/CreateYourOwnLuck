Focus Group Mode — Technical Feature Description

Overview
Focus Group Mode is a multi-agent orchestration layer built on top of FitCheck's existing persona pipeline. Rather than isolated single-persona interviews, it spins up a structured discussion session between 4–6 simultaneously active AI agents — each grounded in the same scraped web evidence as the core ICP generation flow — and extracts quantified signals from the conversation that map directly to go-to-market decisions.
Each persona is weighted against real-world market proportions, drawn from public workforce data, LinkedIn audience distributions, and competitor review volume. This means every agent's response carries a market weight — turning a simulated focus group into a weighted PMF estimate against your actual addressable market.

Architecture
Each agent is instantiated with a distinct persona profile (goals, pains, objections, buying triggers, budget) plus the same brand/competitor evidence context. A lightweight orchestration layer manages turn order, inter-agent referencing, and response synthesis. Market weights are assigned at session initialisation by querying public workforce and industry data against the scraped brand context to estimate segment sizes within the relevant category.
One agent is always designated a near-miss adjacent profile — someone outside the core ICP whose conversion represents genuine addressable market expansion, weighted accordingly.
Sessions run in three phases: unprompted reaction (agents respond to the product stimulus cold), directed questioning (founder probes specific objections or claims), and synthesis (the orchestrator resolves the session into scored, market-weighted outputs).

Outputs That Connect to Business Decisions
Market-weighted PMF score — a single conversion likelihood number adjusted for how large each persona's real-world segment actually is, giving a defensible hypothesis for CAC/LTV modelling before any ad spend
ICP priority ranking — segments ranked by conversion likelihood × market size, telling a founder who to acquire first
Adjacent segment expansion estimate — quantifies the revenue sitting outside the core ICP and what specific objections need closing to unlock it
Objection frequency ranking — the top blockers weighted by the market share of the personas raising them, so a niche objection from a small segment doesn't outrank a mainstream one
Consensus signals — claims that landed across all profiles, adjusted for market weight, becoming the highest-confidence inputs for homepage copy and paid creative
Dead weight features — what generated no response, informing roadmap deprioritisation
The output is a structured Focus Group Report that gives a founder the same directional signal a qualitative research engagement would — derived from live web data, delivered in under five minutes. All market weight estimates are flagged as directional and sourced from public data, not primary research.

Example Session

Input: Founder pastes linear.app
FitCheck crawls Linear's site, pricing, competitor pages (Jira, Asana, Height), and Reddit threads where people discuss project management tooling. Personas and market weights are generated from that evidence plus public workforce distribution data.

The Room
Agent
Profile
Market Weight
Marcus
Engineering lead, 40-person Series A. Uses Jira, hates it, hasn't switched.
18% of TAM
Priya
Head of Product, bootstrapped SaaS. Manages sprints in Notion, feeling the pain.
22% of TAM
David
CTO, 12-person seed-stage. Actively evaluating tools, price-sensitive.
31% of TAM
Sandra
VP Eng, 200-person scaleup. Needs enterprise controls, SSO, audit logs. (Adjacent)
11% of TAM
Jordan
Developer at an agency. Tried Linear, went back to Trello. (Skeptic)
18% of TAM


Session
Founder drops Linear's homepage headline into the room:
"Linear is the new standard for modern software development teams."
Marcus: "That actually resonates. 'Modern' is doing a lot of work here but I know immediately it's not for my manager, it's for me."
Jordan: "I heard that two years ago. I tried it. The issue wasn't the product, it was that my whole team didn't adopt it. Ends up being a solo tool."
Priya: "That's my concern too. Notion works because everyone's already in it. Switching cost isn't the price, it's the re-onboarding."
David: "What's the pricing look like scaled to 15 engineers?"
Founder pastes the pricing page.
David: "$8 per seat is fine at my size. I'd pull the trigger if there's a decent free trial."
Sandra: "I don't see anything about SSO or permissions here. That's a non-starter for us. I'd need to loop in IT and that conversation dies without a security page."
Jordan: "This is clearly built for devs who control their own tools. The moment procurement gets involved you're in a different product category."

Focus Group Report
MARKET-WEIGHTED CONVERSION ESTIMATE

Agent    Profile                  Weight    Likelihood    Weighted Signal
Marcus   Eng Lead, Series A       18%       82/100        14.8
Priya    Head of Product, SMB     22%       61/100        13.4
David    CTO, Seed                31%       74/100        22.9
Sandra   VP Eng, Scaleup          11%       23/100        2.5
Jordan   Dev, Agency              18%       39/100        7.0

WEIGHTED PMF SCORE     60.6 / 100

ICP PRIORITY RANKING (conversion likelihood × market weight)
1. David   — CTO, Seed          highest weighted signal, largest segment
2. Marcus  — Eng Lead, Series A — high intent, needs urgency trigger
3. Priya   — Head of Product    — interested, blocked by adoption risk

ADJACENT SEGMENT SIGNAL
Sandra (11% of TAM) is currently unaddressed by the homepage.
A dedicated /enterprise or /security page would unlock this
segment without changing core product positioning.
Estimated reachable revenue impact: material, requires separate
sales motion.

TOP OBJECTIONS (weighted by segment size)
1. Team adoption risk          — Priya + Jordan = 40% of TAM
2. Missing enterprise controls — Sandra = 11% of TAM
3. Switching cost framing      — 40% of TAM, correlated with #1

CONSENSUS SIGNALS (what landed across the room)
— "Modern" read as dev-led, not PM-led — positive across core ICP
— Per-seat pricing felt fair at seed/Series A scale
— Speed and keyboard-first UX referenced unprompted by 3 agents

DEAD WEIGHT
— "New standard" framing dismissed as marketing noise by 4/5 agents
— Logo strip generated no response across any segment

RECOMMENDED ACTIONS
1. Lead with team adoption proof — affects 40% of your TAM
2. Build /enterprise page to unlock Sandra's segment
3. Replace "new standard" with a concrete outcome claim
4. Clarify free trial terms above the fold — blocking David's segment,
   your highest-weighted conversion opportunity

⚠ Market weights estimated from public workforce and LinkedIn
audience data. Treat as directional signal, not primary research.
Validate with real customer interviews before major spend decisions.



