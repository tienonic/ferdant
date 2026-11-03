# Reusable community packets for Ferdant

November 3, 2026. Proposed feature and experiment.

The strongest proposal is to let people copy and adapt resource packets for their communities. Useful adaptations could become reviewed starting points for other people, while their underlying resource records remain shared and maintainable.

Filtering by city, updating links and generating PDFs are ordinary automation. The earlier framing put too much emphasis on calling those features emergence. The distinctive possibility is that people discover useful combinations Ferdant's creator did not anticipate. The packet adaptation experiment below is the current priority; the search examples later in this document explain supporting capabilities.

This proposal applies ideas from Emergent Garden's [Emergent Complexity](https://www.youtube.com/watch?v=0HqUYpGQIfs), using the video's English captions. The video explains building blocks and their interaction rules at [3:09](https://www.youtube.com/watch?v=0HqUYpGQIfs&t=189), organized complexity producing simpler higher-level structures at [18:14](https://www.youtube.com/watch?v=0HqUYpGQIfs&t=1094), experimentation at [27:41](https://www.youtube.com/watch?v=0HqUYpGQIfs&t=1661), and unintended consequences at [30:01](https://www.youtube.com/watch?v=0HqUYpGQIfs&t=1801). The Ferdant applications below are our proposals, not claims or recommendations made by the creator.

## One concrete example

Imagine the following hypothetical sequence:

1. Ferdant publishes a basic Davis preparedness packet containing ten reviewed resources.
2. A housing worker copies it, removes homeowner information and adds apartment-specific instructions.
3. A resident adapts that version for someone without a car.
4. A librarian adds instructions for saving the information on a phone before losing internet.
5. After review, the combination becomes a reusable apartment preparedness packet for people without a car.

Ferdant supplied the resources and the ability to combine them. Other people discovered a useful product. This example is a possibility to test, not a record of contributions or a selected new audience.

## The feature people would actually use

The proposed feature is **Adapt this packet for my community**.

A nonprofit could start from an existing packet, choose its location, remove irrelevant items, add local instructions and export its version. Shared resource references would remain connected to their sources. Local additions would have their own author, source and review status, so they would not silently overwrite shared facts. A private working copy would not automatically become a public template; publication would follow review.

When a verified county contact changes, the organization could see which parts of its packet need an update and regenerate them. Printed copies would retain their edition date and a link to the current version.

| Ordinary editorial approach | Proposed adaptation system |
| --- | --- |
| The editor anticipates each audience and writes its guide. | People adapt existing guides to needs they understand. |
| Each guide is maintained separately. | Guides reference shared records, so one verified correction can improve several guides. |
| Expansion requires the editor to produce each new guide. | Reviewed contributions can expand the library, with review and maintenance still required. |

## What would actually emerge

The potential emergent result is an unexpected collection of specialized packets and useful practices developed through reuse. Ferdant would not know beforehand which combinations people would value. Within this proposal, participation and useful adaptation are what make that possibility interesting; without them, the feature is simply a packet builder.

More combinations can also produce duplicate guides, conflicting instructions and outdated advice. Keep shared facts in common records, preserve local exceptions, and review candidate templates before others rely on them. Popularity alone does not establish accuracy or safety.

The practical value is letting local knowledge accumulate into reusable products. Emergent complexity is a way to think about that possibility, not a benefit customers buy by itself.

## The first experiment

Give one organization an existing packet and let it adapt the contents. Observe exactly what it removes, adds, rearranges and asks to keep current. Then test whether a second organization finds any part of that adaptation useful in its own work.

The output should be an original packet, an adapted version, a short explanation of each change, the second organization's reuse decisions, and the time spent preparing and reviewing both versions. This can be tried with an editable draft and the existing export process before building public collaboration features. Arranging the trial remains separate from publishing this proposal.

Continue if the adaptations reveal useful combinations that were not already supplied, another organization can reuse them, and review effort remains reasonable. If both organizations only want Ferdant to prepare a standard PDF for them, prioritize a straightforward customization service. That could still be a useful business without the proposed contribution system.

The earlier illustrative prices below are hypotheses for a customization service, not evidence that people will pay for adaptation software.

## Supporting search and maintenance examples

The following examples are hypothetical product walkthroughs. Facility names, counts, costs and reported outcomes are illustrative. They do not describe current service availability, real customers or completed experiments.

## Example 1 Find somewhere to charge a phone during an outage

**The person enters:** Davis; power outage; charge a phone; walking preferred. The first prototype could accept these as selections instead of requiring free-text interpretation or an account.

Suppose the selected county's records contain these candidates:

| Candidate | Recorded information | Treatment |
| --- | --- | --- |
| Utility outage page | Reviewed official destination for the selected provider | Show as the first information source |
| Library A | Nearby ordinary facility; charging and power status unknown | Show as a place to contact, with unknown status |
| Library B | A current authoritative notice says it is closed | Exclude from the suggested visit list and explain the closure if relevant |
| Community facility C | Current official notice explicitly offers charging | Show the confirmed service, notice time and stated hours |
| Shelter D | Shelter listing with no charging information | Do not assume it offers charging |

**The result would contain three actions:**

1. Check the official outage page for the selected provider.
2. Check facility C's current official notice and contact details before traveling. If there is no confirmed option, show that no charging location is confirmed in Ferdant and offer clearly labeled places to contact.
3. Save the relevant phone numbers and addresses in an offline contact sheet.

Walking preference could affect ordering among otherwise suitable choices. Straight-line distance must not be presented as a verified walkable or safe route. A closer unknown facility must not displace a confirmed service without making that distinction clear.

**What feedback would change:** A visitor reporting that library A has no charging access creates a review item. A maintainer checks the provider's information before changing the record. Any plan using that record then inherits the reviewed correction.

**What might emerge:** If people repeatedly assemble outage information, charging and offline contacts, that combination becomes a candidate plan for staying connected during an outage. It joins KeepUsConnected and PlanForDisruption while preserving both branch scopes. Saving the combination is useful automation; discovering and refining a recurring combination through use is the emergence hypothesis.

## Example 2 Turn city selection into a clear alert signup task

**The person enters:** Davis; receive emergency alerts.

The existing City / County selection would determine the search scope. Results would retain their city, county, provider or statewide labels so a statewide resource is not mistaken for a city-operated service. Switching to County would expand the search scope without changing a resource's actual jurisdiction.

The proposed rules would resolve the city to its county, look for a reviewed city-specific route, and otherwise use a reviewed county route whose coverage includes that city. A separate city system would be explained only when the source establishes it is relevant. If coverage is unknown, Ferdant would show that uncertainty instead of silently choosing the nearest jurisdiction.

**The result would contain:** the relevant jurisdiction, a brief explanation of what the linked service covers, a button to the official signup page, the source review date, and a saveable instruction card. Enrollment would happen on the provider's website.

Suppose a library and a housing team each find that people can open the signup page but struggle with the instructions afterward. Each adds a short, provider-checked explanation to its handout. A maintainer compares those adaptations and incorporates the useful shared explanation into the resource card, retaining local exceptions.

**The benefit:** A correction made once can improve city results and newly generated packets that reference that same alert service. Existing printed copies remain unchanged; their edition date and link to the current version help readers check for updates.

**The measurement:** Count successful handoffs to the correct official destination separately from people who voluntarily confirm completing registration. Downloads and link clicks do not establish enrollment.

This starts with Ferdant's existing jurisdiction-based alert records. The new work would be reusable task instructions and a reviewed improvement process, rather than inventing a new alert service.

## Example 3 Discover a useful plan across the five branches

**The person enters:** I am moving into a rental; selected city; set up internet and utilities; understand the first bills.

The selected needs could assemble the following modules:

| Module | Existing branch scope | Output |
| --- | --- | --- |
| Find service options | KeepUsConnected | Links to check provider availability at the property |
| Set up utilities | KeepTheBasicsOn | Reviewed local setup destinations and instructions |
| Understand charges | WhatAmIPayingFor | A first-bill checklist and existing cost worksheet |
| Prepare for disruptions | PlanForDisruption | Official local alert signup and saved contacts |

Providers with service areas covering the city would still require address-level availability checks when applicable. Selecting a city would not establish which provider serves the property.

**The result:** a short ordered checklist with the applicable links and an optional printable copy. A resident could remove an irrelevant module, such as utility setup when the household has already completed it.

**How a new plan could be discovered:** Several resident-services teams independently reuse these four modules in their welcome materials. Their adaptations suggest that the repeated task is preparing for the first month in a rental. A maintainer reviews the combination as a candidate plan and tests its order with users.

This does not rename or narrow the five branches. It creates a task that draws from their existing scopes. To limit false conclusions, the maintainer checks whether reuse came from independent needs or simply from copying one prominent template.

## Example 4 Make a paid packet concrete

**Hypothetical customer:** a housing nonprofit's resident-services manager responsible for three properties in two counties. Staff currently maintain separate welcome handouts and repeatedly check the same local contacts.

**Proposed deliverable:** three property-specific PDFs and matching offline HTML versions, assembled from up to 20 shared reviewed resources plus property-specific instructions supplied by the customer. Each edition includes its source dates, official alert signup route, relevant utility and connectivity destinations, and current-version link. A defined service includes one review round and a dated change log.

Suppose two properties reference the same county alert record. When its destination changes, the maintainer verifies one correction and rebuilds both affected packets. The third property's different county record stays independent. This reduces duplicated checking only where records are genuinely shared.

**Illustrative sales test:** quote $500 for the initial three-property package only if timed preparation supports that scope. At an assumed 8 hours of work and an internal labor allowance of $40 per hour, labor accounts for $320, leaving $180 before other costs. At 14 hours, the same allowance is $560, so the price fails to cover labor. These are assumptions for testing, not a market price or profit forecast.

An optional $150 monthly maintenance offer could include one monthly source review, updated digital files and a short change report. Its value depends on a real continuing update need. The service terms would need to state coverage and turnaround; a monthly review is not live emergency monitoring.

**What the buyer would assess:** preparation hours saved, fewer stale contacts, usefulness to residents, and the effort required to approve updates. A renewal provides stronger commercial evidence than a compliment or a download. Purchasing packets does not guarantee additional grant funding.

The potential emergent benefit is that independently requested local adaptations reveal reusable modules and improve the shared library. Shared templates alone are an efficiency technique; customer demand and falling delivery costs still need evidence. See the [buyer and income findings](outreach-buyers-and-income-findings-20261103.md) and [audience and funding research plan](audience-and-funding-research-plan-20261103.md).

## Example 5 Learn from a failed search without making up an answer

**The person enters:** shower; selected county; available this evening. Suppose Ferdant has two mapped facilities but no verified hours or public-access details.

**The result:** two clearly labeled leads to contact and a statement that evening access is unconfirmed. Neither becomes an available-service recommendation based on its map location alone.

If people voluntarily flag this result as insufficient, a reviewer can investigate whether the records lack hours, the filters are confusing or a useful source is missing. A verified update could then help everyone making the same search.

For example, three independent reports in a small trial might justify a review item. That is a proposed workload trigger, not proof of widespread demand. It cannot establish that the county lacks shower services; it establishes that the current directory did not answer those users' questions.

## How records and feedback would work

The prototype would need a small record structure rather than a simulation:

| Record | Concrete contents | Purpose |
| --- | --- | --- |
| Resource | Stable ID, jurisdiction, supported tasks, eligibility, source URL, checked date, unknown fields | Filter resources and preserve their limits |
| Current status | Resource ID, status source, observed time, validity rules | Keep temporary service claims separate from ordinary facility records |
| Plan | Ordered resource IDs, selection conditions, short instructions, edition | Reuse a useful combination without copying its underlying facts |
| Feedback | Plan/resource ID, issue category, optional nonsensitive explanation, review state | Identify improvements without treating reports as verified facts |
| Reviewed change | Evidence, affected IDs, reviewer, date | Update dependent digital outputs and retain a correction history |

When a temporary status becomes stale under its source-specific rules, it returns to unknown. An old report must not continue appearing as a current confirmation. Fault locations, emergency warnings and evacuation guidance continue to use their authoritative sources and do not change through popularity votes.

Ferdant's current recommendation form produces a local draft. The first trial could use an owner-maintained review log; collecting public submissions and deploying that workflow would be separate implementation work. No personal addresses, income figures or household health details are needed in a shared feedback log.

## Supporting prototype after the adaptation experiment

If the adaptation experiment shows useful reuse, the alert signup example offers a small technical starting point because Ferdant already has reviewed jurisdiction mappings. Use about 20 existing resource records for one county, then assemble alert signup, outage contacts and a rental welcome checklist. This would test whether the same records can serve different tasks without losing local exceptions.

1. Prepare the three plans and their selection rules using existing records. Add explicit unknown values rather than invent missing details.
2. Reuse the existing PDF and offline export paths where feasible. Check that a resource correction reaches every dependent newly generated output.
3. Compare the ordinary directory with the proposed plans in a small, separately arranged trial. Ask participants to find the correct alert destination, save outage contacts and identify a relevant setup step. Vary which version they see first to reduce practice effects.
4. Record correct destinations, mistaken interpretations, time to the next useful action and voluntary comments. For the organizational case, time packet preparation and revision work separately.
5. Continue only if the plans help with the intended tasks without losing source accuracy or becoming more expensive to maintain than their benefit warrants. Stop and revise any rule that selects an incorrect jurisdiction or presents unknown availability as confirmed. A small trial can reveal problems; it cannot prove broad demand.

Prepare resource relationships and common plans during the site build. Load only the selected county and use simple browser filters to choose a short result list. Start with location and task selections; free-text interpretation is optional later work. No continuous AI processing, all-pairs statewide search or physics simulation is needed on the user's device.
