"""Resource roles for each hazard. Directory presence is not emergency operation."""

CARE = {'id':'care','label':'Medical care','kinds':['hospital','clinic'],
        'note':'Ordinary medical-directory locations. Confirm current services and access; not designated disaster treatment sites.'}
BASICS = {'id':'basics','label':'Food & basic supplies','kinds':['food','supplies','support'],
          'note':'Routine distribution and day services. Check the provider after an incident; supplies and admission are not confirmed.',
          'url':'https://www.cdss.ca.gov/food-banks','linkLabel':'Find your county food provider and pickup referrals'}
HOUSING = {'id':'housing','label':'Housing & day services','kinds':['housing','homeless-shelter','support'],
           'note':'Routine intake and day/overnight programs, not activated disaster shelters. Confirm eligibility and available space.',
           'url':'https://www.hud.gov/FindShelter','linkLabel':'Find local housing and service providers'}
INFO = {'id':'information','label':'Information & applications','kinds':['library','legal','utility','senior-disability','transport'],
        'note':'Ordinary information, intake and support locations. Libraries are not certified refuge, cooling, warming or charging sites.'}
SHELTER = {'id':'shelters','label':'FEMA-listed open shelters','kinds':['shelter'],
           'note':'All incidents, not an assignment to this hazard. Listed OPEN does not confirm access, capacity or suitability.'}


def response(phase, *, relief=None):
    views = [{'id':'response','label':'Care & shelter checks','kinds':['hospital','clinic','shelter'],
              'note':'Dated medical-directory locations and FEMA-listed shelters for all incidents. Current operation, safe access and capacity are not confirmed.'},
             dict(CARE),dict(BASICS),dict(HOUSING),dict(INFO),dict(SHELTER)]
    if relief:
        view = {'id':'temperature','label':relief+' spaces','kinds':['cooling' if relief=='Cooling' else 'warming'],
                'note':'No verified current '+relief.lower()+'-space feed is included. Check local official announcements or the separate phone/referral section. Ordinary libraries and clinics are not substituted.'}
        if relief == 'Cooling':
            view.update(url='https://www.news.caloes.ca.gov/cooling-centers-and-resources-3/',
                        linkLabel='Cal OES county cooling-resource links (March 2026; confirm current opening)')
        views.insert(0, view)
    return {'default':'response','phase':phase,'liveShelters':True,'views':views}


PLANS = {
 'earthquake':response('After shaking and immediate danger: medical care, basic needs and recovery support.'),
 'tsunami':response('After following evacuation instructions: medical and recovery support. None of these pins designates safe high ground or an evacuation destination.'),
 'flood':response('After following local flood/evacuation instructions: care, shelter checks and recovery support. A pin is not proof of a dry or accessible route.'),
 'wildfire':response('After following evacuation instructions: care, shelter checks and recovery support. Directory sites may close during fire or smoke.'),
 'heat':response('Heat-related support: medical care and official relief checks. Ordinary service hours do not establish a cooling center.',relief='Cooling'),
 'cold':response('Cold-weather support: medical care and official relief checks. Routine overnight programs are distinct from activated warming spaces.',relief='Warming'),
 'storms':response('After taking immediate shelter: medical care, basic needs and recovery support. No transport or evacuation operation is inferred.'),
 'landslide':response('After leaving immediate danger as officials advise: care and recovery support. No pin is a safe slope or travel route.'),
 'dam':response('After following local evacuation instructions: care, shelter checks and recovery support. Locations are not outside-inundation safety certifications.'),
 'levee':response('After following flood/evacuation instructions: care, shelter checks and recovery support. An office or hospital may itself be affected.'),
 'avalanche':response('After immediate avalanche danger: medical-directory and recovery support. These are not rescue-team, terrain or safe-route markers.'),
 'volcano':response('After following evacuation or ash-sheltering instructions: care, shelter checks and recovery support. A pin does not establish ash-free or accessible conditions.'),
}
for key, phase in {
    'coastal':'Long-term coastal planning and recovery: information, applications and ordinary services. Not a current storm-surge refuge map.',
    'subsidence':'Ground-movement planning and recovery: information, utility/legal intake where checked and care. No building inspection or repair qualification is inferred.',
}.items():
    PLANS[key] = {'default':'information','phase':phase,'liveShelters':False,
                  'views':[dict(INFO),dict(CARE),dict(BASICS),dict(HOUSING)]}
