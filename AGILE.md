# How this works

*Written for two people: Shardul, who does the work, and his father, who oversees it.
Neither of you needs to have met Agile before.*

---

## 1. Where Agile came from, and what it's actually for

In the 1990s, software was built the way a building is built: spend months writing a
complete plan, then months building exactly that plan, and find out at the very end
whether it was the right thing. It failed constantly, because you learn the most
important things *while* doing the work, and by then the plan is set in stone.

In 2001 a group of programmers wrote down the alternative. The core of it is one idea:

> **Work in short fixed cycles. Finish something real in each one. Then look at what
> actually happened and adjust.**

That is the whole thing. Everything else — the vocabulary, the ceremonies, the charts —
exists to serve that one idea. When a practice stops serving it, drop the practice.

Two dialects you'll hear about. **Scrum** works in fixed two-week blocks called sprints.
**Kanban** has no blocks at all — work flows continuously, and the discipline comes from
limiting how many things you're allowed to have in progress at once. Krama is a hybrid,
because a pure version of either would break here: Shardul has hard deadlines he doesn't
control, and commitments to other people that don't fit neatly into sprints.

---

## 2. The structure, top to bottom

**Goal.** One sentence, six to twelve months out. There is only ever one. If everything is
important, nothing is. *Currently: land a role in the global AI market.*

**Epic.** A large body of work that serves the goal — usually one project or one skill.
Epics don't have deadlines; they have milestones. Ten is already a lot.

**Milestone.** A dated checkpoint you can point at and say "reached" or "not reached", with
no argument. "Make progress on the portfolio" is not a milestone. "Bag End live on
shardul.date" is. Krama distinguishes two kinds, and the difference matters more than
anything else on the roadmap:

- **Circles — hard deadlines.** Someone else set the date. It does not move. Everything
  else bends around these.
- **Diamonds — your own milestones.** You chose the date. It *can* move — but moving it
  should be a decision made out loud, not something that quietly happens.

**Sprint.** Two weeks. You decide at the start what goes in, and then **you do not change
it**. This rule feels arbitrary and it is the single most valuable rule here — see §5.

**Task.** Something finishable in a day or two, with an unambiguous "done". If you can't
say what done looks like, it isn't a task yet, it's a topic.

---

## 3. The numbers, and why they're worth trusting

**Estimate.** Your honest guess at how many hours a task will take. It will be wrong. That
is fine and expected — the estimates are not the point, the *pattern* in the errors is.

**Capacity.** How many hours you actually have. Krama computes it: working days in the
sprint × focused hours per day, **minus the hours your meetings and commitments already
claim**. This is the part most personal planners get wrong — they let you plan a full week
of work and a full week of meetings in the same week, and then act surprised.

Set "hours per day" honestly. Not hours awake — hours of real, focused project work. For
most people that's four to six, and claiming eight is how plans die.

**Velocity.** How many hours of committed work you *actually finished* per sprint. After
three sprints this becomes the most useful number you have, because it is measured rather
than hoped. When velocity says 34 hours and your instinct says 60, velocity is right.

**Burndown.** Work remaining plotted against days remaining, with a straight line showing
the pace that finishes on time. Its entire job is to tell you you're behind on **day four**,
while you can still do something about it, instead of on day thirteen.

**WIP limit.** The most things you're allowed to have in progress at once. Default is three.
Half-finished work is worth nothing; six things at 50% is worth less than three things done.

---

## 4. The rhythm — four moments every two weeks

### Planning · start of sprint · ~1 hour · together

1. Open **Sprint**. Look at the capacity number.
2. Open **Backlog**. Pull tasks in one at a time, watching committed hours climb.
3. Stop when committed hours reach capacity. **Stop. Do not pull in one more.**
4. Write one sentence as the sprint goal — what will be true in two weeks that isn't now.

If you've closed three sprints, plan against your velocity, not against capacity. Capacity
is what you have; velocity is what you actually convert.

### Daily check · 5 minutes · alone

Open **Today**. Three questions: what did I finish, what am I on now, what is stuck? Move a
card. Close it. That's the whole ceremony — if it's taking twenty minutes, you're
re-planning, and re-planning mid-sprint is exactly what the sprint boundary exists to stop.

### Review · end of sprint · together

Open **Review**. **Show the finished work** — open the site, run the script, read the
resume out loud. This is a demo, not a status report, and the difference is everything: a
status report can be talked around, a demo cannot.

Then be blunt about what wasn't finished. It goes back to the backlog. Nothing is punished;
it's data about the estimates.

### Retrospective · same sitting · 15 minutes

Not *what* got done — ***how it went***. What slowed you down? What was estimated badly?
What kept getting interrupted? Pick **one** thing to change next sprint and write it in the
Review tab. One. A list of ten changes is a list of zero changes.

---

## 5. The rules worth actually keeping

**Don't change the sprint mid-sprint.** New ideas go to the backlog. If something genuinely
cannot wait, something else comes *out* — capacity is fixed, so a swap is honest and an
addition is a lie. This rule is what converts a plan into a commitment.

**Meetings are not tasks.** They're commitments. Add them as commitments, and Krama takes
their hours out of capacity before you plan.

**Finish before you start.** Respect the WIP limit.

**One goal.** When a new project appears, the question isn't "is this interesting?" — it's
"does this serve the goal more than what it would displace?" Usually the answer is no, and
the honest move is to write it down and not start it.

---

## 6. What this will not do

Being straight about it, because oversold process is worse than no process.

Most of Scrum is machinery for coordinating six to nine people who need to stay out of each
other's way. Working alone, most of that vocabulary is overhead. Three things carry nearly
all the value here:

1. **The fixed boundary.** Every two weeks you're forced to stop and re-decide instead of
   drifting between forty-five half-projects. Drift is the actual failure mode.
2. **Measured velocity.** After three sprints you know your real capacity. This is the
   antidote to optimistic planning, which is what kills solo plans far more often than
   laziness does.
3. **A scheduled review with another person.** Knowing you will have to *show finished work*
   to your father on a fixed date changes what you do on the fourteen days in between.

If you only keep one of the three, keep the third.

Agile also won't tell you *what* to build, won't make a bad goal good, and won't survive if
the sprint boundary isn't respected. It's a feedback loop, not a strategy.

---

## 7. For Papa

You have full edit rights — you can change anything in here. But the role that actually
helps is not manager. In Agile terms it's **stakeholder**, and it has three jobs:

- **Set what matters most.** When the backlog has forty items, which five matter this month?
  This is the highest-value thing you do, and it's a judgement Shardul is worse-placed to
  make than you are.
- **Receive the demo.** Every two weeks, make him *show* you finished work. Ask "can I see
  it?" rather than "how's it going?" — the second question is answerable with words.
- **Hold the deadline.** When a diamond milestone slips, ask why out loud. Sometimes the
  answer is good. The point is that it gets said.

The most useful habit: **comment on tasks**. Every comment gathers in the Review tab, so
nothing said in one sitting is lost by the next.

And one thing worth *not* doing: don't move his cards day to day. The daily board is his,
and a plan he owns will outlast a plan handed to him.
