"""Build static pages; preview/noindex is the default. No network or third-party build service."""
import argparse, html, importlib.util, json, shutil, re
from pathlib import Path
from widgets import bill_breakdown, cancellation_planner, message_builder
from icons import icon, destination_icon, copy_icons, CATEGORY
from graphics import directory_graphic
from cost_tool import cost_preview
from offline import build_editions
from phone_chart import phone_chart, city_search, city_map, DOWNLOAD
from resource_map import resource_map
from recommendations import recommendation_link, recommendation_panel
from landing import landing_resources, landing_welcome, landing_followup, landing_start
from references import render_references
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('content',ROOT/'content/site.py')
c=importlib.util.module_from_spec(spec); spec.loader.exec_module(c)
spec_directory=importlib.util.spec_from_file_location('directory',ROOT/'content/directory.py')
d=importlib.util.module_from_spec(spec_directory); spec_directory.loader.exec_module(d)
e=lambda s:html.escape(str(s),quote=True)
DOMAIN='https://ferdant.com'; pages={}
arrow='<span class="link-arrow" aria-hidden="true">↗</span>'
def gp(g):return '/what-am-i-paying-for/guides/'+g['slug']+'/'
def button(url,text,secondary=False):return f'<a class="button{" secondary" if secondary else ""}" href="{e(url)}">{text}</a>'
def cards(guides=None):return ''.join(f'<a class="guide-card" href="{gp(g)}" data-search="{e(g["title"]+" "+g["description"]+" "+g["tag"])}"><div class="guide-copy"><h3>{g["title"]}</h3><p>{g["description"]}</p></div></a>' for g in (c.GUIDES if guides is None else guides))
def topics():return ''.join(f'<a class="topic-row" href="/{b["slug"]}/"><span class="topic-copy"><strong>{b["label"]}</strong><span>{b["name"]}</span></span><span class="topic-description">{b["description"]}</span></a>' for b in c.BRANCHES)
def page(path,title,description,body,crumbs=None):
 body=re.sub(r'<p class="(?:eyebrow|atlas-eyebrow|booklet-eyebrow)">.*?</p>', '', body, flags=re.S)
 schema=[{'@context':'https://schema.org','@type':'WebSite','name':'Ferdant','url':DOMAIN+'/'},{'@context':'https://schema.org','@type':'WebPage','name':title,'description':description,'url':DOMAIN+path,'inLanguage':'en'}]
 crumb=''
 if crumbs:
  schema.append({'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':i+1,'name':n,'item':DOMAIN+u} for i,(n,u) in enumerate(crumbs)]})
  crumb='<nav class="breadcrumbs" aria-label="Breadcrumb">'+''.join(f'<a href="{u}">{e(n)}</a><span aria-hidden="true">/</span>' for n,u in crumbs[:-1])+f'<span>{e(crumbs[-1][0])}</span></nav>'
 preview='<div class="preview-note">Editorial preview · Public launch review pending</div>' if args.mode=='preview' else ''
 robots='noindex,follow' if args.mode=='preview' or path=='/404.html' else 'index,follow'
 pages[path]=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{e(title)} | Ferdant</title><meta name="description" content="{e(description)}"><meta name="robots" content="{robots}"><meta name="theme-color" content="#fbfcfa"><link rel="canonical" href="{DOMAIN}{path}"><link rel="icon" href="/assets/mark.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"><meta property="og:type" content="website"><meta property="og:title" content="{e(title)} | Ferdant"><meta property="og:description" content="{e(description)}"><meta property="og:url" content="{DOMAIN}{path}"><meta property="og:site_name" content="Ferdant"><script type="application/ld+json">{json.dumps(schema,ensure_ascii=False)}</script><script src="/site.js" defer></script></head>
<body><a class="skip" href="#main">Skip to content</a>{preview}<div class="page"><header class="site-header"><a class="wordmark" href="/" aria-label="Ferdant home">ferdant<span>.</span></a><nav class="desktop-nav" aria-label="Main navigation"><a href="/#location-start">Find local help</a><a href="/#california-resources">California resources</a><a href="/#communities">Community</a></nav>{recommendation_link('#recommend-a-resource' if path in ('/','/local/') else '/#recommend-a-resource')}<details class="mobile-menu"><summary>Menu</summary><nav aria-label="Mobile navigation"><a href="/#location-start">Find local help</a><a href="/#california-resources">California resources</a><a href="/#communities">Community</a>{recommendation_link('#recommend-a-resource' if path in ('/','/local/') else '/#recommend-a-resource')}</nav></details></header><main id="main" tabindex="-1">{crumb}{body}</main><footer class="site-footer"><div><a class="wordmark" href="/">ferdant<span>.</span></a><p>Guides & practical-help communities</p></div><nav aria-label="Footer navigation"><a href="/about/">About Ferdant</a><a href="/sources-and-corrections/">Sources & corrections</a><a href="/privacy/">Privacy</a></nav><p class="footer-note">Keep personal account details private.</p></footer></div></body></html>'''
def portal_entry(title,url,publisher,context):
 search=e(title+' '+publisher+' '+context)
 tool_key=url[1:] if url in ['#compare-bill','#cancel-subscription','#draft-message'] else None
 fallback={key:gp(guide)+fragment for key,guide,fragment in zip(['compare-bill','cancel-subscription','draft-message'],c.GUIDES,['#quick-tool','#quick-tool','#message-template'])}
 target=fallback[tool_key] if tool_key else url
 launch=f' data-open-tool="{tool_key}" aria-haspopup="dialog"' if tool_key else ''
 enhancement=' data-enhancement hidden' if url == '#cost-preview' else ''
 marker='expand' if tool_key else 'down' if url.startswith('#') else 'external' if url.startswith('https://') else 'right'
 return f'<li data-portal-entry{enhancement} data-search="{search}"><a class="portal-destination" href="{e(target)}"{launch}><span class="destination-label">{destination_icon(url)}<span>{e(title)}</span></span><small>{e(publisher)}{icon(marker)}</small></a></li>'

def quick_tools():
 return f'''<section class="portal-tools" id="tools" tabindex="-1"><h3>Tools you can use here</h3><nav aria-label="Quick tools"><ul class="portal-list">{portal_entry('Cost over time','#cost-preview','On this page','monthly recurring annual yearly cost subscription')}{portal_entry('Compare a bill','#compare-bill','Calculator','bill price cost money charges')}{portal_entry('Plan a cancellation','#cancel-subscription','Checklist','subscription renewal cancel money')}{portal_entry('Draft a billing message','#draft-message','Message builder','write question complaint bill money')}</ul></nav><details class="cost-workspace" data-enhancement hidden><summary>Cost over time worksheet</summary>{cost_preview()}</details><p class="portal-note">Your inputs stay in this open page.</p></section>'''

def directory_topic(b):
 context=b['name']+' '+b['label']+' '+b['description']
 labels={'keep-us-connected':'Internet & phone','who-can-fix-this':'Repairs & services','keep-the-basics-on':'Power & water','what-am-i-paying-for':'Bills & paperwork','plan-for-disruption':'Prepare & recover'}
 entries=''.join(portal_entry(title,url,publisher,context) for title,url,publisher,_ in d.LINKS[b['slug']])
 entries+=portal_entry('r/'+b['name'],'https://www.reddit.com/r/'+b['name']+'/', 'Reddit',context)
 tools=''
 if b['slug']=='what-am-i-paying-for':
  tools=quick_tools()
 return f'''<details class="directory-topic portal-card service-row" id="{b['slug']}" data-portal-card>
  <summary class="service-toggle">{icon(CATEGORY[b["slug"]])}<span><strong>{labels[b['slug']]}</strong><small>r/{b['name']}</small></span>{icon('chevron')}</summary>
  <div class="service-panel"><div class="portal-overview">{directory_graphic(b["slug"])}<p class="portal-description">{b['description']}</p></div>
  <ul class="portal-list">{entries}</ul><p class="portal-note">{d.NOTES[b['slug']]}</p>{tools}</div>
 </details>'''

def location_start(show_download=True, heading=2, include_state=False):
 actions=f'<div class="location-controls"><div class="phone-actions"><a class="button" href="{DOWNLOAD}" data-city-download download>Download California offline copy</a><small>One file: phone numbers, maps & tools</small><p id="location-download-status" role="status"></p></div></div>' if show_download else ''
 return f'''<section class="location-start" id="location-start" aria-labelledby="location-title">
 <h{heading} id="location-title">Choose a location</h{heading}>
 {city_search(include_state=include_state)}
{actions}
 <p id="location-summary" role="status">Choose a city or county for checked local contacts. You can browse general resources below.</p>
 {city_map(include_search=False)}
 <noscript><p>City selection needs JavaScript. Read <a href="/local/">California plans and phone numbers</a>, or <a href="{DOWNLOAD}" download>save the complete offline website</a>.</p></noscript>
 </section>
'''

def local_results():
 return ''' <section class="location-resources" id="location-resources" aria-labelledby="location-results-title" hidden>
 <header><h2 id="location-results-title">Local resources</h2></header>
 <section id="location-alert" aria-label="Emergency alert signup"></section>
 <p id="location-coverage" class="portal-description"></p><ul id="location-links"></ul>
 <details class="location-notes"><summary>Service details & sources</summary><p>Contacts checked November 2, 2026.</p><div id="location-notes"></div></details>
 <p class="location-source-note">Calls and texts need phone service. For immediate danger, call 911.</p></section>'''

def infographic_panel():
 return f'''<section class="infographic-download" id="offline-download" aria-labelledby="infographic-title"><div><h2 id="infographic-title">Local resource book</h2><p>A PDF with everyday resources, disaster plans ordered by long-term relative risk and related phone charts.</p><button type="button" class="button" id="download-booklet" data-enhancement hidden>Download resource book (PDF)</button><p id="booklet-status" role="status"></p><div class="booklet-downloads"><button type="button" class="booklet-secondary booklet-sources" id="download-booklet-sources" data-enhancement hidden>Sources (TXT)</button><button type="button" class="booklet-secondary" id="download-infographic" data-enhancement hidden>Risk summary &amp; phone chart (PNG)</button><div class="phone-actions"><a href="{DOWNLOAD}" data-city-download download>Complete offline website (HTML)</a><p role="status"></p></div></div><p id="booklet-sources-status" role="status"></p><p id="infographic-status" role="status"></p><p class="fine-print">High, Moderate and Low risk use FEMA data; unassessed hazards stay separate. The complete copy includes all short disaster plans, recent eligible planning overlays viewed for this city, phone numbers and four tools. Street tiles, forecasts and current shelter status need internet.</p></div><figure><img id="infographic-preview" alt="Preview of your local resource book"><figcaption>Highest risk first. City tract screening or county ratings, with sources and limits inside.</figcaption></figure></section>'''

def inline_sources(g):
 sources=''.join(f'<li><a href="{e(url)}">{e(name)}</a><span>{e(date)}</span></li>' for name,url,date in g['sources'])
 return f'<div class="inline-sources"><p>{g["scope"]}</p><ul>{sources}</ul><p>Sources checked November 2, 2026. <a href="/sources-and-corrections/">Corrections</a>.</p></div>'

def home(local=False):
 sections=''.join(directory_topic(b) for b in c.BRANCHES)
 bill,cancel,message=c.GUIDES
 bill_tool=tool(bill,heading=3)
 intro='<h1 id="local-page-title">Local resources</h1><p id="local-page-intro">Local services and emergency information.</p>' if local else '<p>Choose your California location. Find your next step.</p>'
 start=('<details class="change-location"><summary>Change location</summary>'+location_start(show_download=False)+'</details>') if local else landing_start()
 phones=phone_chart(include_map=False, show_download=False, show_picker=False, shared_only=True)
 resources=(f'<div class="resource-heading" id="california-resources"><div><h2>Statewide help &amp; general guides</h2><p>California-wide and national services, guides and discussions. Eligibility and service areas vary.</p></div></div><div class="service-directory" id="communities" tabindex="-1" role="region" aria-label="Essential services">{phones}{sections}</div>' if local else landing_resources(c.BRANCHES, phones))
 about_section='<section id="about" class="directory-about-section" tabindex="-1"><h2>About Ferdant</h2><p>Ferdant connects five practical-help communities. Read the resources here or take a specific question to the relevant Reddit community. Replies and outcomes aren’t guaranteed.</p><p>AggieBillHelp is the separate UC Davis campus community. Ferdant does not imply a university affiliation.</p></section>'
 assets='<script src="/immersive.js" defer></script>' if local else '<link rel="stylesheet" href="/landing.css">'
 page('/local/' if local else '/','Local resources' if local else 'Practical guides for everyday problems','Checked California location resources, shared support numbers, public guides and a downloadable resource book with disaster resources, related phone charts and a complete offline website.' if local else 'A directory of practical resources, tools and California emergency and support phone numbers, with city selection and a downloadable offline copy.',f'''
{assets}
 {('<div class="portal-heading" data-location-page><div>'+intro+'</div></div>') if local else landing_welcome()}
 {start}
{landing_followup() if not local else ""}
{resource_map()+infographic_panel()+local_results() if local else ""}
 {resources}
 {recommendation_panel()}
 <dialog id="tool-dialog" aria-labelledby="tool-dialog-title"><div class="tool-dialog-header"><div class="tool-dialog-name"><span id="tool-dialog-icon" aria-hidden="true">{icon("tools")}</span><h2 id="tool-dialog-title">Quick tools</h2></div><button type="button" class="tool-dialog-close" data-close-tool aria-label="Close tool">{icon("close")}<span>Close</span></button></div><div class="tool-dialog-body">
   <section id="compare-bill" class="directory-tool" data-dialog-tool data-tool-title="Compare a bill" hidden tabindex="-1" aria-labelledby="compare-title"><div class="directory-tool-heading"><h2 id="compare-title">Compare a bill</h2><button class="quiet-button" id="bill-example" data-enhancement hidden>Try an example</button></div><p>{bill['intro']}</p><p id="example-note" class="example-note" role="status" hidden>Example figures. Replace these with your own totals and changes.</p>{bill_tool}<p class="quick-note">{bill['briefNote']}</p><a class="widget-guide-link" href="{gp(bill)}">Full bill-checking guide</a><details class="tool-source-details"><summary>Sources & scope</summary>{inline_sources(bill)}</details></section>
   <section id="cancel-subscription" class="directory-tool" data-dialog-tool data-tool-title="Cancel a subscription" hidden tabindex="-1" aria-labelledby="cancel-title"><h2 id="cancel-title">Cancel a subscription</h2><p>{cancel['intro']}</p>{cancellation_planner(heading=3,tool_id='cancel-tool')}<a class="widget-guide-link" href="{gp(cancel)}">Full cancellation guide</a><details class="tool-source-details"><summary>Sources & scope</summary>{inline_sources(cancel)}</details></section>
   <section id="draft-message" class="directory-tool" data-dialog-tool data-tool-title="Draft a billing message" hidden tabindex="-1" aria-labelledby="draft-title"><h2 id="draft-title">Draft a billing message</h2><p>{message['intro']}</p>{message_builder(heading=3,tool_id='message-tool')}<noscript><blockquote class="static-message">{e(message['template'])}</blockquote></noscript><a class="widget-guide-link" href="{gp(message)}">Full billing-question guide</a><details class="tool-source-details"><summary>Sources & scope</summary>{inline_sources(message)}</details></section>
  </div></dialog>
{about_section if local else ''}
''')
def hubs():
 for b in c.BRANCHES:
  questions=''.join(f'<li>{e(q)}</li>' for q in b['questions']); bring=''.join(f'<li>{e(q)}</li>' for q in b['bring']); name,url,desc=b['resource']
  guides=f'<section class="section"><p class="eyebrow">Bills & paperwork</p><h2>Guides</h2><div class="guide-grid">{cards()}</div></section>' if b['name']=='WhatAmIPayingFor' else ''
  page('/'+b['slug']+'/',b['label']+' help — '+b['name'],b['description'],f'''<section class="page-intro"><p class="eyebrow">{b['name']}</p><h1>{b['title']}</h1><p class="deck">{b['description']}</p>{button('https://www.reddit.com/r/'+b['name']+'/', 'Visit r/'+b['name'])}</section><section class="two-column section"><div><p class="eyebrow">Questions for the community</p><h2>What do you need help with?</h2><ul class="question-list">{questions}</ul></div><div class="note-panel"><h3>Include when you ask</h3><ul>{bring}</ul><p>{b['boundary']}</p></div></section>{guides}<section class="resource-band"><div><p class="eyebrow">Public resource</p><h2>{name}</h2><p>{desc}</p></div>{button(url,'Open the resource',True)}</section><section class="section cross-topics"><h2>Does your question cross topics?</h2><p>A service problem can also be a billing problem. Choose the community that fits the step you need help with.</p><a class="inline-link" href="/#communities">See all five communities {arrow}</a></section>''',[('Home','/'),(b['name'],'/'+b['slug']+'/')])
def tool(g,heading=2):
 if g['tool']=='bill':return f'''<section class="interactive" id="quick-tool"><h{heading}>How much did it change?</h{heading}><form id="bill-comparison"><div class="input-pair"><label>Previous bill ($)<input name="previous" type="number" inputmode="decimal" min="0" max="999999999.99" step="0.01" required placeholder="e.g. 60"></label><label>Current bill ($)<input name="current" type="number" inputmode="decimal" min="0" max="999999999.99" step="0.01" required placeholder="e.g. 75"></label></div><div class="calculator-actions"><button class="button" type="submit" disabled>{icon("calculator")}Compare the totals</button><button class="quiet-button" type="reset" data-enhancement hidden>{icon("reset")}Clear figures</button></div></form><p class="tool-result" id="bill-result" role="status" aria-live="polite">Enter two totals to compare.</p><p class="fine-print">Use matching periods and the same currency. This shows the difference, not whether a charge is correct. Nothing is sent or saved.</p><noscript><p>To compare without JavaScript, subtract the previous total from the current total.</p></noscript>{bill_breakdown()}</section>'''
 if g['tool']=='checklist':return cancellation_planner(heading)
 if g['tool']=='copy':return message_builder(heading)
 return ''
def guides():
 page('/guides/','Practical guides for bills and paperwork','Browse source-linked guides to understanding a changed bill, canceling subscriptions and writing a clear billing question.',f'''<section class="page-intro"><h1>Guides for bills<br>& paperwork.</h1><p class="deck">Compare a bill, cancel a subscription or prepare a message. Each guide has steps, sources and something you can use.</p></section><section class="library section"><div class="search-row" data-search-controls hidden><label for="guide-search">Find a guide</label><input id="guide-search" type="search" placeholder="Try “bill”, “cancel” or “paperwork”" autocomplete="off"><p id="search-status" role="status" aria-live="polite">3 guides</p></div><div class="guide-grid">{cards()}</div><p id="no-results" hidden>No matching guides yet. Try another word or <a href="/#communities">find the relevant community</a>.</p></section>''',[('Home','/'),('Guides','/guides/')])
 for g in c.GUIDES:
  sections=''.join(f'<details class="guide-step" id="step-{i+1}"><summary><span class="step-number">0{i+1}</span><strong>{e(t)}</strong><span class="step-toggle" aria-hidden="true">+</span></summary><div class="step-detail"><p>{e(p)}</p></div></details>' for i,(t,p) in enumerate(g['sections']))
  quick='<ol>'+''.join(f'<li>{e(item)}</li>' for item in g['quick'])+'</ol>'; next_id='message-template' if g['tool']=='copy' else 'quick-tool'; next_label='Compare your bills' if g['tool']=='bill' else 'Use the quick checklist' if g['tool']=='checklist' else 'Copy a starting point'
  sources=''.join(f'<li><a href="{e(url)}">{e(n)} {arrow}</a><span>{e(d)} · Checked November 2, 2026</span></li>' for n,url,d in g['sources'])
  related=''.join(f'<a href="{gp(x)}">{x["title"]} {arrow}</a>' for x in c.GUIDES if x!=g)
  page(gp(g),g['title'],g['description'],f'''<article><header class="article-intro"><p class="eyebrow">{g['tag']} guide</p><h1>{g['title']}</h1><p class="review-date">US consumer guidance</p></header><div class="article-layout"><div class="prose"><section class="quick-answer" aria-labelledby="quick-answer-title"><h2 id="quick-answer-title">What to do</h2><p class="article-answer">{g['intro']}</p>{quick}{button("#"+next_id,next_label)}<p class="quick-note">{g['briefNote']}</p></section>{tool(g)}<section class="template"><h2>Message template</h2><p>Replace the brackets with your details. Send through the business’s verified support channel.</p><blockquote id="message-template">{e(g['template'])}</blockquote><button class="copy-button" data-copy="message-template" hidden>{copy_icons()}Copy the starting point</button><p class="copy-status" role="status"></p></section><section class="extra-detail"><h2>Step-by-step detail</h2>{sections}</section><details id="sources" class="sources"><summary>Sources & scope</summary><div class="source-detail"><p>{g['scope']}</p><p>Sources checked November 2, 2026.</p><ul>{sources}</ul><p>A source check is not a review by the agencies or a claim of professional expertise. <a href="/sources-and-corrections/">Source and correction policy.</a></p></div></details><section class="community-followup"><h2>Ask the community</h2><p>Ask a specific question or share an update. Remove account numbers, addresses, case identifiers and other people’s details before posting.</p>{button('https://www.reddit.com/r/WhatAmIPayingFor/','Go to WhatAmIPayingFor')}</section><nav class="related" aria-label="Related guides"><p class="eyebrow">Keep reading</p>{related}</nav></div></div></article>''',[('Home','/'),('WhatAmIPayingFor','/what-am-i-paying-for/'),(g['title'],gp(g))])
def info(path,title,deck,body):page(path,title,title+' — Ferdant practical-help communities.',f'<section class="page-intro"><h1>{title}</h1><p class="deck">{deck}</p></section><div class="reading-page prose">{body}</div>',[('Home','/'),(title,path)])
def information():
 page('/offline/','Choose a city for offline use','Choose a California city and save a single offline file with shared emergency and support numbers, local contacts, maps and tools.',f'''<section class="download-intro"><h1>Choose your city. Save your copy.</h1><p>California is selected. Pick your city below, then download one file with these numbers, the map and four tools.</p></section>{phone_chart(expanded=True)}<section class="download-page"><details class="offline-detail"><summary>Open your file & know its limits</summary><p>Download, then open the HTML file from Downloads or Files in a browser. If your phone shows a file preview, choose a browser to use the tools. The saved chart includes the city you chose; you can switch city again while offline.</p><p>The city list comes from the State's city/county dataset. Shared hotlines and any checked county or municipal numbers appear for your selection. City-specific agency coverage is incomplete and is stated alongside the chart; nothing is inferred from a nearby city. If your community is not a listed city, choose its county under unincorporated areas.</p><p>Website links and alert signup need internet; calls and texts need phone service. This is a dated copy, with no live dispatch, outage or shelter feed. Tool notes are not saved when you close the file. No account, location detection or installation is needed.</p></details><a href="/#communities">Return to the directory</a></section>''',[('Home','/'),('Offline copy','/offline/')])
 info('/about/','About Ferdant','Ferdant brings five practical-help communities into one place. Each has its own topic, its own questions and its own conversation.','''<h2>Choose a location</h2><p>Enter a California city, county or ZIP code. Choose Everyday for food, water and other places, or choose a disaster plan. Check the provider’s details before visiting. Save the resource book or complete website to read without internet.</p><h2>Read a guide</h2><p>The guides help you check a bill, keep a cancellation record or write a question to a business. You can read every page without joining a community.</p><h2>Five topics</h2><p>Connectivity includes providers and installation. Repair includes specialist services and follow-up. Utilities includes energy, water and continuity. Money includes contracts, forms and administration. Preparedness includes practical planning and recovery.</p><h2>Check the sources</h2><p>We link public guidance and show when we checked it. A community experience can help without establishing what will happen in your situation. Pages should make that distinction visible.</p><h2>Community discussion</h2><p>The communities support peer discussion. A reply, professional referral, correction or response time is not guaranteed. Account decisions remain with the responsible organization.</p><h2>A separate campus purpose.</h2><p>AggieBillHelp is the separate UC Davis campus community for student money and paperwork questions. It is not the name or scope of all five Ferdant branches. These pages do not imply a university affiliation or official campus service.</p><a class="inline-link" href="/#communities">Explore the five communities ↗</a>''')
 correction=''.join(f'<li><a href="https://www.reddit.com/message/compose/?to=%2Fr%2F{b["name"]}">{b["name"]} moderator mail ↗</a></li>' for b in c.BRANCHES)
 info('/sources-and-corrections/','Sources & corrections','Browse by topic to find a reference or report a correction.',render_references(args.output, correction))
 info('/privacy/','Privacy','You do not need an account to read these pages.','''<h2>Tools work in your browser</h2><p>Search terms, bill totals, change breakdowns, cancellation selections and message-builder notes are used in the open page only. This site does not send them to a server, save them to local storage or set tracking cookies. The site keeps no saved copy of tool inputs. Copying a template uses your clipboard only after you press the copy button.</p><h2>Recommendation drafts</h2><p>Recommendations are not being collected yet. Drafts stay in this open page until you copy or download them. They are not sent to us or included in resource books or complete offline copies. We do not save a copy.</p><h2>Choosing a city and downloading</h2><p>Autocomplete runs locally. Choosing a place sets a temporary session flag so the next page can play its introduction; that page immediately clears the flag. Nothing else is saved. Opening a location resource page puts its public city/county ID and any selected ZIP code in the page URL, which the host may log. Service filters and private tool inputs stay in the browser. Resource books and contact-sheet images are generated locally from public directories. PDF resource books include only dated directory records and related phone numbers, without live shelter or alert status. An explicit location download fetches a standard offline file and adds your chosen city, county or ZIP area locally. It includes the selected area and its saved contact chart, without copying private tool notes or the service filter. ZIP copies also save the resource directories for overlapping California counties. The file remembers the location chosen at download; later choices in an open file last until it closes.</p><h2>City maps and public data</h2><p>Opening a city map fetches its public county geometry from this site and visible street tiles from OpenStreetMap. Tile requests reveal the map area, IP address and browser information to that provider. Choosing a disaster requests public map-area data from the selected official service: FEMA, Cal OES, CGS, CAL FIRE, DWR or NOAA/NWS, as shown in map sources. Response-resource plans can request FEMA open shelters. Queries send public map bounds and the selected layer; they do not include private tool inputs. Those requests contain public map bounds; private tool inputs are never included. These services have their own availability and privacy policies. No GPS permission, account, background polling or location detection is used. Offline files make no map requests and contain no live shelter status or downloaded street tiles.</p><h2>Hosting and outside links</h2><p>The public site uses GitHub Pages. Hosting providers may process technical request information. See <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub’s privacy statement</a>. Reddit and agency links lead to services with their own policies.</p><h2>No document uploads</h2><p>There is no upload form here. Keep identity documents, account numbers, credentials and case records out of public discussions. Use a verified private process when the task requires those details.</p>''')
 page('/404.html','Page not found','Return to Ferdant’s guide library and five communities.',f'<section class="page-intro"><p class="eyebrow">404 · A wrong turn</p><h1>This page isn’t here.</h1><p class="deck">The link may have changed. Start with the library or choose the topic closest to your question.</p>{button("/guides/","Go to the guides")}</section>')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--mode',choices=['preview','production'],default='preview');p.add_argument('--output',type=Path,default=ROOT);args=p.parse_args()
 home();home(local=True);hubs();guides();information()
 build_editions(pages['/local/'],args.output)
 for path,doc in pages.items():
  target=args.output/(path.lstrip('/') if path.endswith('.html') else path.lstrip('/')+'index.html');target.parent.mkdir(parents=True,exist_ok=True);target.write_text(doc,encoding='utf-8')
 (args.output/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{DOMAIN}{u}</loc></url>' for u in pages if u!='/404.html')+'</urlset>\n',encoding='utf-8')
 (args.output/'robots.txt').write_text('User-agent: *\nAllow: /\n'+('Sitemap: '+DOMAIN+'/sitemap.xml\n' if args.mode=='production' else '# Preview pages carry noindex; allow crawlers to see it.\n'),encoding='utf-8')
 if args.output.resolve()!=ROOT:
  for name in ['immersive.js','resource-facts.js','booklet-map.js','landing.css','landing.js','styles.css','site.js','recommendations.js','phone.js','infographic.js','resource-booklet.js','hazard-risk.js','resource-map.js','disaster-layers.js','service-resources.js','CNAME','.nojekyll']:
   shutil.copy2(ROOT/name,args.output/name)
  shutil.copytree(ROOT/'assets',args.output/'assets',dirs_exist_ok=True)
  for name in ['integrations','config']:
   shutil.copytree(ROOT/name,args.output/name,dirs_exist_ok=True)
 print(f'Built {len(pages)} static pages in {args.mode} mode at {args.output}')
