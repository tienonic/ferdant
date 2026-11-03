"""Public resource pointers, checked November 2, 2026. No eligibility or outcome promises."""

CHECKED = '2026-11-02'
# title, destination, publisher, publisher date (None means not stated in the inspected page)
LINKS = {
 'keep-us-connected': [
  ('Check broadband availability', 'https://broadbandmap.fcc.gov/', 'FCC', None),
  ('Internet & phone complaints', 'https://consumercomplaints.fcc.gov/hc/en-us', 'FCC', None),
 ],
 'who-can-fix-this': [
  ('Find a device repair guide', 'https://www.ifixit.com/Guide', 'iFixit', None),
  ('Before hiring a contractor', 'https://consumer.ftc.gov/articles/how-avoid-home-improvement-scam', 'FTC', '2022-07'),
  ('Home repair assistance', 'https://www.usa.gov/repairing-home', 'USA.gov', None),
 ],
 'keep-the-basics-on': [
  ('Help with utility bills', 'https://www.usa.gov/help-with-utility-bills', 'USA.gov', None),
  ('Use less water at home', 'https://www.epa.gov/watersense/start-saving', 'EPA', '2026-05-08'),
  ('Home energy assistance', 'https://www.usa.gov/weatherization-energy-programs', 'USA.gov', '2026-10-21'),
 ],
 'what-am-i-paying-for': [
  ('Consumer finance answers', 'https://www.consumerfinance.gov/consumer-tools/', 'CFPB', None),
  ('Subscription cancellation steps', 'https://consumer.ftc.gov/articles/getting-and-out-free-trials-auto-renewals-and-negative-option-subscriptions', 'FTC', '2024-09'),
  ('Financial-product complaints', 'https://www.consumerfinance.gov/complaint/', 'CFPB', '2026-10-05'),
 ],
 'plan-for-disruption': [
  ('Make an emergency plan', 'https://www.ready.gov/plan', 'Ready.gov', None),
  ('Recovery assistance', 'https://www.usa.gov/disaster-financial-help', 'USA.gov', None),
  ('Find your state emergency agency', 'https://www.usa.gov/state-emergency-management', 'USA.gov', None),
 ],
}
NOTES = {
 'keep-us-connected': 'Availability is provider-reported. Confirm the address and offer.',
 'who-can-fix-this': 'Match guides to your model. Dangerous faults need qualified help.',
 'keep-the-basics-on': 'Check current rates, outages and urgent reporting with your utility.',
 'what-am-i-paying-for': 'Use verified support for account details. Rules and deadlines vary.',
 'plan-for-disruption': 'Follow local official instructions during an incident.',
}
