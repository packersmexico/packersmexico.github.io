#!/usr/bin/env python3
"""PMX live NFL sync. Only observed FINAL results count for ranking."""
import json, urllib.request, datetime, pathlib, os, sys
UTC=datetime.timezone.utc
DATA=pathlib.Path('quiniela-control/data.json')
data=json.loads(DATA.read_text(encoding='utf8'))
games=data.get('games',[])
now=datetime.datetime.now(UTC)
def parse(s):
    try:return datetime.datetime.fromisoformat(s.replace('Z','+00:00')).astimezone(UTC)
    except (ValueError,AttributeError):return None
def norm(a):return {'JAC':'JAX','WSH':'WAS','LA':'LAR'}.get(a,a)
active=[]
for g in games:
    kick=parse(g.get('kickoff_iso'))
    if not kick or (g.get('status')=='FINAL' and g.get('winner')):continue
    age=now-kick
    if datetime.timedelta(minutes=-10)<=age<=datetime.timedelta(hours=6):active.append(g)
if not active:
    print('No live/recent non-final games due; no API call.');sys.exit(0)
dates=sorted({parse(g['kickoff_iso']).strftime('%Y%m%d') for g in active})
events=[]
for day in dates:
    url=f'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates={day}&limit=100'
    req=urllib.request.Request(url,headers={'User-Agent':'PMX-Quiniela-2026/2.0'})
    with urllib.request.urlopen(req,timeout=25) as resp:events.extend(json.load(resp).get('events',[]))
matches={}
for ev in events:
    comps=ev.get('competitions') or []
    if not comps:continue
    teams={}
    for c in comps[0].get('competitors',[]):
        t=c.get('team') or {}
        teams[c.get('homeAway')]={'abbr':norm(t.get('abbreviation','')),'score':int(c.get('score') or 0)}
    if not ('away' in teams and 'home' in teams):continue
    state=(ev.get('status') or {}).get('type') or {}
    key=teams['away']['abbr']+' @ '+teams['home']['abbr']
    matches[key]={'teams':teams,'completed':bool(state.get('completed')),'state':state.get('name','')}
changed=[]
for g in active:
    e=matches.get(g.get('matchup'))
    if not e:continue
    a=e['teams']['away'];h=e['teams']['home']
    completed=e['completed']
    # Never fabricate winner for a tie. Tie requires adjudication in the canonical standings rules.
    tie=completed and a['score']==h['score']
    if tie:
        status,winner,score='TIE',None,f"{a['abbr']} {a['score']}–{h['score']} {h['abbr']}"
    elif completed:
        win=a if a['score']>h['score'] else h
        lose=h if win is a else a
        status,winner,score='FINAL',win['abbr'],f"{win['abbr']} {win['score']}–{lose['score']} {lose['abbr']}"
    else:
        status,winner,score='IN_PROGRESS',None,f"{a['abbr']} {a['score']}–{h['score']} {h['abbr']}"
    before=(g.get('status'),g.get('winner'),g.get('score'))
    after=(status,winner,score)
    if before!=after:
        g.update(status=status,winner=winner,score=score)
        changed.append(g['id'])
if not changed:
    print('No confirmed scoreboard delta.');sys.exit(0)
finals=[g for g in games if g.get('status')=='FINAL' and g.get('winner')]
sub=(data.get('capture') or {}).get('locked_submissions') or {}
weekly=[]
for p in data.get('participants',[]):
    name=p['name']
    picks=(sub.get(name) or {}).get('picks') or []
    valid=len(picks)==len(games)
    correct=sum(picks[i]==g['winner'] for i,g in enumerate(games) if g.get('status')=='FINAL' and g.get('winner')) if valid else 0
    weekly.append({'name':name,'correct':correct,'wrong':len(finals)-correct if valid else 0,'status':'VALID' if valid else 'NO_PICKS'})
base={x['name']:x for x in data.get('season_base_before_week',[])}
season=[]
for w in weekly:
    b=base.get(w['name'],{})
    season.append({'name':w['name'],'correct':int(b.get('correct',0))+w['correct'],'wrong':int(b.get('wrong',0))+w['wrong'],'status':w['status']})
season.sort(key=lambda x:(-x['correct'],x['wrong'],x['name']))
result={'final':len(finals),'total':len(games),'status':'FINAL' if len(finals)==len(games) else 'LIVE','in_progress':sum(g.get('status')=='IN_PROGRESS' for g in games),'ties':sum(g.get('status')=='TIE' for g in games)}
data.update(last_sync=now.isoformat(),sync_mode='AUTO_LIVE_15MIN_ESPN_VERIFIED_FINAL',results=result,weekly_standings=weekly,season_standings=season)
pub=data.setdefault('publication',{})
pub['gate']='HOLD';pub['assets_status']=f"DATA LIVE {result['final']}/{result['total']} FINAL · FIGMA QA REQUIRED"
DATA.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
week=pathlib.Path(f"quiniela-control/weeks/week-{int(data['week_number']):02d}.json")
if week.exists():
    historical=json.loads(week.read_text(encoding='utf8'))
    historical.update(last_sync=data['last_sync'],results=result,weekly_standings=weekly,season_standings=season,games=games)
    historical.setdefault('production',{})['package_status']=pub['assets_status']
    week.write_text(json.dumps(historical,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'updated':changed,'final':result['final'],'in_progress':result['in_progress'],'total':result['total']}))
