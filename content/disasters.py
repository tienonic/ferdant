"""Reviewed, short California disaster plans and public GIS source registry.

Dates are editorial inputs, never advanced by the builder. Planning layers are
not event predictions or evacuation routes. Live weather is never saved as current.
"""
CHECKED = '2026-11-02'
TAXONOMY = {'title': 'Cal OES 2023 State Hazard Mitigation Plan', 'published': '2023-11-10',
 'url': 'https://www.caloes.ca.gov/wp-content/uploads/Hazard-Mitigation/Documents/2023-California-SHMP_Volume-1-Exec-Summary_11.10.2023.pdf'}
MYPLAN = 'https://www.caloes.ca.gov/office-of-the-director/operations/recovery-directorate/hazard-mitigation/local-mitigation-planning/myplan-2-0/'
OES = 'https://services.arcgis.com/BLN4oKB0N1YSgvY8/arcgis/rest/services/'
CGS = 'https://services2.arcgis.com/zr3KAIbsRSUyARHG/arcgis/rest/services/'
FIRE = 'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/'
WEATHER = 'https://mapservices.weather.noaa.gov/eventdriven/rest/services/WWA/watch_warn_adv/MapServer/0'
CGS_CREDIT = 'Modified from California Geological Survey, Webservice of Official Map of Seismic Hazard Zones (2025)'


def geo(title, service, color, *, fields='OBJECTID', where='1=1', published=None,
        source=MYPLAN, note='', offline=True, live=False, classes=None, credit=''):
    return dict(kind='geojson', title=title, service=service, color=color,
                fields=fields, where=where, published=published, checked=CHECKED,
                source=source, note=note, offline=offline, live=live,
                classes=classes or {}, credit=credit)


LAYERS = {
 'flood': geo('FEMA 1% annual-chance flood planning zones',
   'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28', '#3977ad',
   fields='OBJECTID,FLD_ZONE,SFHA_TF', where="SFHA_TF='T'",
   source='https://msc.fema.gov/portal/home',
   note='Effective NFHL Special Flood Hazard Areas. Panel dates vary. This is a planning layer, not current floodwater or an evacuation order. A blank area may be unmapped. Other flood hazards can occur outside it.'),
 'liquefaction': geo('CGS liquefaction investigation zones', CGS+'CGS_Liquefaction_Zones/FeatureServer/0', '#8072aa',
   published='2025-11-19', source='https://www.conservation.ca.gov/cgs/shma', offline=False,
   note='Service data edit date; individual map dates differ. Required-investigation zones, not predicted damage. Areas outside the polygons may be unevaluated.', credit=CGS_CREDIT),
 'seismic-landslide': geo('CGS earthquake-landslide investigation zones', CGS+'CGS_Landslide_Zones/FeatureServer/0', '#b38955',
   published='2025-11-19', source='https://www.conservation.ca.gov/cgs/shma', offline=False,
   note='Earthquake-induced landslide investigation zones only. Does not cover every rainfall landslide or debris flow. Individual map dates and evaluation coverage vary.', credit=CGS_CREDIT),
 'faults': {'kind':'tiles','title':'CGS mapped fault lines (approximate)',
   'service':'https://tiles.arcgis.com/tiles/zr3KAIbsRSUyARHG/arcgis/rest/services/QuatFaults_Tiles/MapServer',
   'tileUrl':'https://tiles.arcgis.com/tiles/zr3KAIbsRSUyARHG/arcgis/rest/services/QuatFaults_Tiles/MapServer/tile/{z}/{y}/{x}',
   'maxNativeZoom':13,'bounds':[[32.3,-126.4],[42.1,-114.3]],
   'source':'https://maps.conservation.ca.gov/cgs/fam/',
   'published':'2010','checked':'2026-11-03','live':False,'offline':False,
   'color':'#202020','opacity':0.85,'zIndex':201,
   'legend':[{'label':'Fault activity: Historic','color':'#ff0000'},
     {'label':'Holocene','color':'#ff8000'},{'label':'Late Quaternary','color':'#80ff00'},
     {'label':'Quaternary','color':'#bf80ff'}],
   'credit':'California Geological Survey, 2010 Fault Activity Map of California; C.W. Jennings and W.A. Bryant.',
   'tileDescription':'Fault lines follow the map across California. Zoom out to see regional faults; a blank local area does not establish safety.',
   'note':'Quaternary fault traces from the 2010 statewide map. Colored bands show the source activity-age classes, not current earthquake severity or hazard-zone width. Line styles retain source location certainty. Approximate planning reference, not parcel boundaries or an earthquake prediction. Zooming beyond the source resolution enlarges the same map. Open the official map for classifications.'},
 'fire-sra': geo('CAL FIRE state-area wildfire severity', FIRE+'FHSZSRA_23_3/FeatureServer/0', '#b44c37',
   fields='OBJECTID,FHSZ,FHSZ_Description', published='2024-04-01',
   source='https://osfm.fire.ca.gov/what-we-do/community-wildfire-preparedness-and-mitigation/fire-hazard-severity-zones',
   note='State Responsibility Area severity, effective April 1, 2024. Long-term physical hazard; not a current fire perimeter, building risk or evacuation order.',
   classes={'field':'FHSZ_Description','colors':{'Moderate':'#c5a33a','High':'#ca783c','Very High':'#ac4039'}}),
 'fire-lra': geo('CAL FIRE recommended local-area wildfire severity', FIRE+'FHSALRA25_v1_All/FeatureServer/0', '#b44c37',
   fields='OBJECTID,FHSZ,FHSZ_Description', published='2025-03-24',
   source='https://osfm.fire.ca.gov/what-we-do/community-wildfire-preparedness-and-mitigation/fire-hazard-severity-zones',
   note='2025 recommended Local Responsibility Area zones, all four rollout phases. Local adoption can differ. Does not cover federal land or establish low risk in blank areas.',
   classes={'field':'FHSZ_Description','colors':{'Moderate':'#c5a33a','High':'#ca783c','Very High':'#ac4039'}}),
 'sea-level': {'kind':'map-image','title':'NOAA 3-foot sea-level inundation scenario',
   'service':'https://coast.noaa.gov/arcgis/rest/services/dc_slr/slr_3ft/MapServer',
   'source':'https://coast.noaa.gov/slr/','published':'2026-04','checked':CHECKED,
   'live':False,'offline':True,'color':'#4f8d9b','mapLayers':'show:1',
   'credit':'NOAA Office for Coastal Management · 3 feet above Mean Higher High Water · planning reference only.',
   'note':'Potential connected inundation at 3 feet above local Mean Higher High Water. Northern California remap announced April 2026; source vintages vary. This displayed layer excludes separate low-lying disconnected areas. Not a dated prediction, storm surge, erosion, subsidence or evacuation map.'},
 'subsidence': geo('DWR / TRE ALTAMIRA annual vertical movement, WY2025',
   'https://services.arcgis.com/aa38u6OgfNoCkTJ6/arcgis/rest/services/SubsidenceInSARCalGWLive_gdb/FeatureServer/0', '#976a78',
   fields='OBJECTID,WY,VertDispFT',where='WY=2025',published='2026-07-20',
   source='https://sgma.water.ca.gov/CalGWLive/',credit='DWR / TRE ALTAMIRA InSAR; water year 2025; vertical displacement in feet.',
   classes={'field':'VertDispFT','colors':{'>0.1':'#607fab','-0.1 - 0.1':'#8d969b','-0.2 - -0.1':'#b8a8a0','-0.4 - -0.2':'#b78b76','-0.6 - -0.4':'#ad715c','-0.8 - -0.6':'#a15c51','-1 - -0.8':'#8e4b52','<-1':'#713f54'}},
   note='Measured annual vertical displacement in feet, water year 2025. Negative values indicate lowering. DWR dashboard service is under development; coverage and accuracy vary. Not a collapse prediction or an evacuation map.'),
 'dam': geo('Cal OES state-jurisdiction dam inundation scenarios', OES+'Dam_Failure_Inundation_Boundaries_State_Jurisdiction/FeatureServer/7', '#587aa0',
   published='2023-11-16', note='MyPlan planning snapshot of state-jurisdiction scenarios. Does not include every dam or show a current failure. Use local emergency instructions; no routes or arrival times are inferred.'),
 'levee': geo('Cal OES deep levee flood-protection areas', OES+'Levee_Flood_Protection_Zone_Deep/FeatureServer/9', '#52738c',
   published='2023-11-16', note='MyPlan deep flood-protection-zone snapshot. Areas behind levees can still flood. Not a current failure, forecast depth or complete inventory of levee hazards.'),
 'volcano': geo('Cal OES / USGS volcanic planning areas', OES+'Volcanic_Hazard_Zones/FeatureServer/25', '#9c6b68',
   published='2025-01-16', note='Service data edit date. Selected published volcanic hazard areas; coverage is not complete and ash can travel beyond them. Not a current eruption or alert.'),
 'cold-alerts': geo('NWS current cold and winter alert areas', WEATHER, '#708da8',
   fields='objectid,prod_type,expiration,onset,ends,issuance',
   where="phenom IN ('EC','CW','FZ','FR','WS','WW','BZ','IS')", offline=False, live=True,
   source='https://www.weather.gov/', note='Current issued alert areas, not a complete cold-risk map. An empty feed does not mean conditions are safe. Check the official local forecast.'),
 'storm-alerts': geo('NWS current wind and storm alert areas', WEATHER, '#83749b',
   fields='objectid,prod_type,expiration,onset,ends,issuance',
   where="phenom IN ('HW','WI','SV','TO','DS','DU')", offline=False, live=True,
   source='https://www.weather.gov/', note='Issued wind, dust, severe-thunderstorm and tornado alert areas. Other weather hazards can occur without a polygon. Not evacuation routes or a forecast for every address.'),
 'avalanche-alerts': geo('NWS current avalanche alert areas', WEATHER, '#718496',
   fields='objectid,prod_type,expiration,onset,ends,issuance',where="phenom='AV'",offline=False,live=True,
   source='https://www.weather.gov/safety/winter-avalanche',
   note='Issued avalanche warning/watch areas only, not avalanche terrain or a safe travel route. Check the local avalanche center forecast even when no alert is returned.'),
 'drought': geo('NOAA CPC monthly drought outlook',
   'https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/cpc_drought_outlk/MapServer/1', '#a17f61',
   fields='objectid,outlook',where="outlook <> 'No_Drought'",offline=False,live=True,
   source='https://www.cpc.ncep.noaa.gov/products/expert_assessment/mdo_summary.php',
   note='Monthly forecast of drought development, persistence, improvement or removal. Not the observed U.S. Drought Monitor, a water-supply guarantee or a drinking-water test.',
   classes={'field':'outlook','colors':{'Persistence':'#9b634a','Improvement':'#b3a58a','Removal':'#9e9b68','Development':'#d6b75d'}}),
 'heat': {'kind':'heat-image','title':'NWS experimental HeatRisk, first available day',
   'service':'https://mapservices.weather.noaa.gov/experimental/rest/services/NWS_HeatRisk/ImageServer',
   'source':'https://www.wpc.ncep.noaa.gov/heatrisk/','checked':CHECKED,'published':None,
   'live':True,'offline':False,'color':'#c07541',
   'note':'Experimental 24-hour heat-impact guidance, supplementary to official NWS heat products. The actual forecast valid time is shown; a low value is not a personal safety guarantee.'}
}


def plan(key, label, headline, steps, source, *, layers=(), note='', shelters=False, resources=False, published=None):
    return dict(id=key, label=label, headline=headline, steps=[{'label':a,'text':b} for a,b in steps],
      guidance={'url':source,'published':published,'checked':CHECKED}, layers=list(layers),
      note=note, shelters=shelters, resources=resources)


PLANS = [
 plan('earthquake','Earthquake','During shaking: Drop. Cover. Hold on.',[
   ('During','If inside, stay inside and protect your head and neck. Hold your cover until shaking stops.'),
   ('After','Expect aftershocks. Keep clear of damaged buildings and fallen utility lines.'),
   ('Find help','Check local instructions before travelling. Listed hospitals and shelters may have limited access.')],
   'https://www.cdc.gov/earthquakes/safety/stay-safe-during-an-earthquake.html',
   layers=['liquefaction','seismic-landslide','faults'], shelters=True,resources=True,published='2026-08-21',
   note='Fault lines and their colored activity-age bands are approximate, not an earthquake prediction. Zoom out to see nearby regional faults. Investigation-zone shading does not certify buildings. Hospitals and FEMA shelters are response resources, not safe zones.'),
 plan('tsunami','Tsunami','At the coast: move inland or to higher ground.',[
   ('Recognize','Strong or long shaking, unusual ocean movement or a loud ocean roar can be natural warnings.'),
   ('Move','After shaking stops, follow posted evacuation signs inland or uphill. Do not wait for an official warning after natural signs.'),
   ('Stay away','Keep away from the shore until officials say to return; later waves can be larger.')],
   'https://www.caloes.ca.gov/office-of-the-director/operations/planning-preparedness-prevention/seismic-hazards/tsunami-program/tsunami-alerts/',
   note='The saved CGS planning areas do not mark a guaranteed safe destination, current warning or evacuation route.'),
 plan('flood','Flood','Avoid floodwater. Follow local evacuation instructions.',[
   ('Prepare','Know local alerts and arrange a destination before flooding.'),
   ('Act','Avoid floodwater and road barriers. Follow official evacuation instructions.'),
   ('Return','Wait for clearance; avoid damaged roads, utilities and contaminated water.')],
   'https://www.weather.gov/safety/flood',layers=['flood'],shelters=True,
   note='Blue polygons are FEMA 1% annual-chance planning zones, not current flooding. Flooding can happen outside mapped zones.'),
 plan('wildfire','Wildfire','Be ready to leave early. Follow evacuation orders.',[
   ('Prepare','Keep a go bag, medicines, transport plan and supplies for pets ready. Sign up for local alerts.'),
   ('Leave','Follow local evacuation instructions promptly. Use the route officials give, not a route inferred from this map.'),
   ('Return','Wait for clearance before returning. A building outline says nothing about fire damage or safe entry.')],
   'https://www.fire.ca.gov/prepare/get-ready-to-go',layers=['fire-sra','fire-lra'],shelters=True,
   note='Severity shading describes long-term wildfire hazard, not active flames, smoke, evacuation zones or property-level risk.'),
 plan('heat','Extreme heat','Find effective cooling and check on others.',[
   ('Plan','Check the forecast and arrange access to air conditioning. Ask 211 or your local health department for current cooling locations.'),
   ('Cool down','Move strenuous activity to cooler hours, take breaks and drink water. Never leave people or pets in a hot parked vehicle.'),
   ('Check in','Check on people who live alone or have health needs. Seek medical help for serious symptoms.')],
   'https://www.cdc.gov/heat-health/about/',layers=['heat'],published='2026-07-20',
   note='HeatRisk is experimental forecast guidance, not a cooling-center directory. No ordinary library or hospital is labelled as an open cooling shelter.'),
 plan('cold','Extreme cold / freeze','Get warm, stay dry and limit exposure.',[
   ('Prepare','Arrange a heated place and check the local forecast. Ask local agencies about currently open warming spaces.'),
   ('Protect','Wear dry layers and cover exposed skin. Change wet clothing when indoors.'),
   ('Watch','Watch for cold-related illness and seek help. Keep checking weather and transport conditions.')],
   'https://www.weather.gov/safety/cold-during',layers=['cold-alerts'],
   note='Shading shows issued NWS winter/cold alert areas only. Empty data does not establish safe temperatures.'),
 plan('storms','Wind / severe weather','Take shelter away from windows and falling debris.',[
   ('Before','Secure loose items before strong winds arrive and check NWS warnings.'),
   ('During','Move into a sturdy building and an interior room. Keep away from windows, trees and fallen power lines.'),
   ('After','Avoid debris and utility damage. Check official road and weather updates before travel.')],
   'https://www.weather.gov/safety/wind-during',layers=['storm-alerts'],
   note='This is an issued-alert layer, not every weather hazard or a complete street-level forecast.'),
 plan('coastal','Sea-level rise / coastal flooding','Plan ahead for coastal flooding and changing shorelines.',[
   ('Know','Check local coastal flood and evacuation information.'),
   ('When warned','Follow local instructions; avoid flooded coastal roads and waterways.'),
   ('Long term','Discuss repeated flooding with your local planning or floodplain office.')],
   'https://www.weather.gov/safety/flood',layers=['sea-level'],
   note='The overlay is a NOAA 3-foot sea-level scenario above local high tide, not a date prediction, storm forecast, erosion map or evacuation boundary.'),
 plan('landslide','Landslide / debris flow','Watch for slope movement and follow local warnings.',[
   ('Before','Know local slope and burn-area warnings. Look out for new ground cracks, unusual stream changes or rumbling.'),
   ('If movement starts','If your building is being hit, move to its highest floor or a countertop. Otherwise leave the area only if safe.'),
   ('Report','Tell local authorities about movement or utility damage and keep away from the slide area.')],
   'https://www.usgs.gov/programs/landslide-hazards/what-are-signs-landslide-development-what-do-i-do-if-a-landslide-occurs',
   layers=['seismic-landslide'],note='This overlay covers earthquake-induced investigation zones only, not all rainfall landslides or post-fire debris flows.'),
 plan('drought','Drought','Know your water-supply rules and prepare for interruptions.',[
   ('Check','Follow your water provider’s conservation rules and supply notices.'),
   ('Prepare','Keep a practical emergency water supply and know how to contact your provider.'),
   ('Respond','Report supply problems and follow official drinking-water instructions. Regional drought does not itself establish tap-water safety.')],
   'https://www.drought.gov/states/california',layers=['drought'],
   note='The overlay is NOAA’s monthly outlook, not observed drought or drinking-water safety. The official dashboard provides current regional conditions.'),
 plan('dam','Dam failure','Know the local warning and evacuation plan.',[
   ('Before','Know local downstream flood alerts and evacuation arrangements.'),
   ('If warned','Follow evacuation instructions immediately; avoid dams and flooded channels.'),
   ('Return','Wait for clearance; avoid floodwater and damaged roads.')],
   'https://www.weather.gov/safety/flood',layers=['dam'],shelters=True,
   note='Planning scenarios for state-jurisdiction dams are incomplete and dated. They do not show an active failure, arrival time or safe route.'),
 plan('levee','Levee failure','Be prepared for flooding even behind a levee.',[
   ('Before','Know local flood warnings and evacuation arrangements.'),
   ('If warned','Follow instructions promptly; avoid levees, breaches and floodwater.'),
   ('Return','Wait for clearance; avoid flooded roads and damaged utilities.')],
   'https://www.weather.gov/safety/flood',layers=['levee'],shelters=True,
   note='The overlay is a dated deep flood-protection planning area, not a breach forecast or a complete levee-failure map.'),
 plan('avalanche','Snow avalanche','Check the local avalanche forecast before entering terrain.',[
   ('Plan','Get avalanche education and check the forecast for the exact area you will visit.'),
   ('Choose','Match terrain to conditions and group skills. Do not treat a city map or an unshaded slope as a safe route.'),
   ('Equip','Carry a transceiver, probe and shovel, and practice rescue with trained partners.')],
   'https://www.weather.gov/safety/winter-avalanche',layers=['avalanche-alerts'],
   note='Shading shows issued NWS avalanche alerts, not avalanche terrain. Use the local avalanche center’s current forecast even when this map has no alerts.'),
 plan('subsidence','Land subsidence','Understand local ground movement and protect essential services.',[
   ('Check','Review DWR’s subsidence information and local groundwater or land-use advice.'),
   ('Document','Report new ground or utility damage to the relevant local authority or provider.'),
   ('Plan','Arrange water and utility continuity where local agencies identify impacts. Obtain qualified advice for structural concerns.')],
   'https://www.usgs.gov/centers/land-subsidence-in-california/data',layers=['subsidence'],
   note='The overlay measures annual vertical movement in feet for water year 2025. Negative values mean lowering; it does not predict sudden collapse.'),
 plan('volcano','Volcano','Be ready to shelter or evacuate as local officials advise.',[
   ('Prepare','Keep medicines, emergency supplies, eye protection and appropriate respiratory protection ready.'),
   ('Follow alerts','Use USGS and local emergency information. Follow instructions to evacuate or shelter from ash.'),
   ('After','Wait for return instructions. Follow official ash-cleanup advice and protect yourself from ash exposure.')],
   'https://www.cdc.gov/volcanoes/safety/index.html',layers=['volcano'],published='2026-08-25',
   note='The planning polygons cover selected volcanic hazards. Ash and other effects can extend beyond them; this is not an eruption alert.')
]

LAYERS['drought']['monthly'] = True
PUBLISHER_CATEGORIES = {'earthquake':'Earthquake','tsunami':'Tsunami',
 'flood':'Riverine, Stream, and Alluvial Flood','wildfire':'Wildfire',
 'heat':'Extreme Heat','cold':'Extreme Cold or Freeze','storms':'Severe Wind, Weather, and Storms',
 'coastal':'Sea-Level Rise, Coastal Flooding, and Erosion',
 'landslide':'Landslide, Debris Flow, and Other Mass Movements','drought':'Drought',
 'dam':'Dam Failure','levee':'Levee Failure','avalanche':'Snow Avalanche',
 'subsidence':'Subsidence','volcano':'Volcano'}
for p in PLANS:
    p['publisherCategory'] = PUBLISHER_CATEGORIES[p['id']]
for key, source in LAYERS.items():
    source['publisher'] = {'flood':'FEMA','liquefaction':'CGS','seismic-landslide':'CGS','faults':'CGS',
        'fire-sra':'CAL FIRE','fire-lra':'CAL FIRE','sea-level':'NOAA OCM',
        'subsidence':'DWR / TRE ALTAMIRA','dam':'Cal OES','levee':'Cal OES',
        'volcano':'Cal OES / USGS','cold-alerts':'NOAA / NWS','storm-alerts':'NOAA / NWS',
        'avalanche-alerts':'NOAA / NWS','drought':'NOAA / CPC','heat':'NOAA / NWS'}[key]
    source['dateMeaning'] = ('map edition; individual source mapping dates vary' if key=='faults' else
        'Northern California remap announcement; individual source vintages vary' if key=='sea-level' else
        'effective date' if key=='fire-sra' else
        'last statewide recommendation rollout' if key=='fire-lra' else
        'service edit date; individual source vintages can differ' if source.get('published') else
        'varies by panel, forecast or alert; see the retrieved data')
DATA = {'schema':1,'checked':CHECKED,'taxonomy':TAXONOMY,'layers':LAYERS,'plans':PLANS}
