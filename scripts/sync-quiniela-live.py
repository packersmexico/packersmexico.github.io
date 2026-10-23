#!/usr/bin/env python3
"""PMX canonical NFL poller. One Orchestrator, separate public finals and private FIRST_VALID scoring.

- Reads the CLOSED capture week if ahead of the scored week; never stays stuck on W6.
- Confirms every NFL final using ESPN event completed flag; TIE is a PUSH.
- Does not read or put private picks into GitHub.
- Promotes to data.json only after authenticated backend ranking returns COMPLETE.
- Repeatable, fails closed, no social auto publication.
"""
import datetime as dt
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request
from zoneinfo import ZoneInfo

ROOT=pathlib.Path('quiniela-control')
UTC=dt.timezone.utc
NOW=dt.datetime.now(UTC)
ET=ZoneInfo('America/New_York')
API='https://packersmexicogithubio-push-backend.vercel.app/api/score-week'

def read(path):
    return json.loads(path.read_text(encoding='utf8'))

def save(path,data):
    content=json.dumps(data,ensure_ascii=False,indent=2)+'\n'
    if not path.exists() or path.read_text(encoding='utf8')!=content:
        path.write_text(content,encoding='utf8')
        print('PMX_SNAPSHOT_UPDATED',str(path))

def date_of(iso):
    try:return dt.datetime.fromisoformat(str(iso).replace('Z','+00:00')).astimezone(UTC)
    except (ValueError,TypeError,AttributeError):return None

def norm(s):
    return {'JAC':'JAX','WSH':'WAS','LA':'LAR'}.get(str(s or ''),str(s or ''))

def next_week(data,config):
    current=int(data['week_number'])
    capture=int(config.get('week_number') or current)
    if capture>current and capture<=current+1 and str(config.get('status') or '').upper()=='CLOSED':
        return capture
    return current

def complete(games):
    return bool(games) and all((g.get('status')=='FINAL' and g.get('winner') and
             g['winner'] in str(g.get('matchup','')).split(' @ ')) or
             (g.get('status')=='TIE' and not g.get('winner')) for g in games)

def official_events(dates):
    events=[]
    for date in sorted(dates):
        url='https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates='+date+'&limit=100'
        req=urllib.request.Request(url,headers={'User-Agent':'PMX-Quiniela-2026/3.0'})
        with urllib.request.urlopen(req,timeout=25) as resp:
            events.extend(json.load(resp).get('events',[]))
    out={}
    for event in events:
        comp=(event.get('competitions') or [None])[0]
        if not comp:continue
        sides={}
        for c in comp.get('competitors',[]):
            if c.get('homeAway') not in ('away','home'):continue
            team=c.get('team') or {}
            try: score=int(c.get('score') or 0)
            except (ValueError,TypeError):continue
            sides[c['homeAway']]={'abbr':norm(team.get('abbreviation')),'score':score}
        if not {'home','away'}<=set(sides):continue
        key=sides['away']['abbr']+' @ '+sides['home']['abbr']
        state=(event.get('status') or {}).get('type') or {}
        out[key]={'teams':sides,'completed':state.get('completed') is True,'state':state.get('name')}
    return out

def score_week(week):
    secret=os.environ.get('PMX_PUSH_SECRET','')
    if not secret:raise RuntimeError('PMX_PUSH_SECRET_UNAVAILABLE')
    payload=json.dumps({'week':week}).encode()
    req=urllib.request.Request(API,data=payload,
        headers={'Authorization':'Bearer '+secret,'Content-Type':'application/json'},
        method='POST')
    try:
        with urllib.request.urlopen(req,timeout=45) as resp:
            body=json.load(resp)
    except urllib.error.HTTPError as e:
        if e.code==409:
            print('PMX_SCORE_WAITING_CANONICAL_SNAPSHOT',week)
            return None
        raise
    if not body.get('ok') or body.get('integrity')!='COMPLETE' or int(body.get('week') or 0)!=week:
        raise RuntimeError('BACKEND_SCORING_INTEGRITY_FAILED')
    if len(body.get('weekly',[]))!=9 or len(body.get('season',[]))!=9:
        raise RuntimeError('BACKEND_ROSTER_INCOMPLETE')
    return body

def main():
    data_path=ROOT/'data.json'
    cfg=read(ROOT/'capture-config.json')
    data=read(data_path)
    week=next_week(data,cfg)
    p=ROOT/'weeks'/f'week-{week:02d}.json'
    if not p.exists():raise RuntimeError(f'ACTIVE_WEEK_SNAPSHOT_MISSING_{week}')
    snap=read(p)
    if int(snap['week_number'])!=week:raise RuntimeError('WEEK_SNAPSHOT_MISMATCH')
    games=snap.get('games') or []
    if not games:raise RuntimeError('EMPTY_WEEK_SCHEDULE')
    if week>int(data['week_number']) and (
       str(snap.get('capture',{}).get('window')).upper()!='CLOSED' or
       int(snap['capture'].get('complete') or 0)!=9 or
       int(snap['capture'].get('received_picks') or 0)!=9*len(games)
    ):raise RuntimeError('CAPTURE_NOT_CLOSED_AND_COMPLETE')
    if week==int(data['week_number']) and complete(games) and len(data.get('weekly_standings') or [])==9:
        print('PMX_WEEK_ALREADY_FINAL_AND_SCORED',week)
        return

    pending=[g for g in games if g.get('status') not in ('FINAL','TIE')]
    due=[g for g in pending if (t:=date_of(g.get('kickoff_iso'))) and
         (NOW-dt.timedelta(minutes=10))<=t<=NOW and NOW-t<=dt.timedelta(days=14)]
    if due:
        dates={date_of(g['kickoff_iso']).astimezone(ET).strftime('%Y%m%d') for g in due}
        observed=official_events(dates)
        changed=[]
        for g in due:
            event=observed.get(g.get('matchup'))
            if not event:continue
            sides=event['teams'];away=sides['away'];home=sides['home']
            if event['completed']:
                tie=away['score']==home['score']
                if tie: status,winner,score='TIE',None,f"{away['abbr']} {away['score']}–{home['score']} {home['abbr']}"
                else:
                    lead,trail=(away,home) if away['score']>home['score'] else (home,away)
                    status,winner,score='FINAL',lead['abbr'],f"{lead['abbr']} {lead['score']}–{trail['score']} {trail['abbr']}"
            elif str(event.get('state','')).upper()=='STATUS_SCHEDULED':
                status,winner,score='SCHEDULED',None,None
            else:
                status,winner,score='IN_PROGRESS',None,f"{away['abbr']} {away['score']}–{home['score']} {home['abbr']}"
            before=g.get('status'),g.get('winner'),g.get('score')
            after=status,winner,score
            if before!=after:
                g.update(status=status,winner=winner,score=score)
                changed.append(g['id'])
        if changed: print('PMX_OFFICIAL_SCORE_DELTA',week,','.join(changed))
    else:
        print('PMX_NO_LIVE_GAMES',week)

    decided=sum((g.get('status')=='FINAL' and bool(g.get('winner'))) or
                 (g.get('status')=='TIE' and not g.get('winner')) for g in games)
    scored=sum(g.get('status')=='FINAL' and bool(g.get('winner')) for g in games)
    pushes=sum(g.get('status')=='TIE' and not g.get('winner') for g in games)
    if decided!=scored+pushes:raise RuntimeError('PUSH_ARITHMETIC_INVALID')
    finals=complete(games)
    result={'final':decided,'total':len(games),'status':'FINAL' if finals else 'LIVE',
            'in_progress':sum(g.get('status')=='IN_PROGRESS' for g in games),
            'ties':pushes,'scored':scored,'pushes':pushes}
    if snap.get('results')!=result or any(g!=o for g,o in zip(games,snap.get('games',[]))):
        snap['games']=games
        snap['results']=result
        snap['last_sync']=NOW.isoformat()
        snap['results_source']='ESPN_NFL_COMPLETED_EVENT_SCOREBOARD'
        save(p,snap)

    if not finals:
        print('PMX_MNF_GATE_HOLD',week,decided,'/',len(games))
        return

    # The first run commits the new official finals to GitHub. The second run
    # scores against the independently persisted snapshot; never invent data.
    if week==int(data['week_number']) and len(data.get('weekly_standings') or [])==9 and data.get('results',{}).get('final')==len(games):
        return
    scored_data=score_week(week)
    if not scored_data:return
    previous=read(ROOT/'weeks'/f'week-{week-1:02d}.json')
    if len(previous.get('season_standings') or [])!=9:raise RuntimeError('SEASON_BASE_MISSING')
    if scored_data['counts']['final']!=len(games):raise RuntimeError('SCORING_COUNT_MISMATCH')
    snap.update(results=result,games=games,weekly_standings=scored_data['weekly'],
                season_standings=scored_data['season'],last_sync=NOW.isoformat(),
                scoring={'status':'COMPLETE','checksum':scored_data['checksum'],
                         'source':'REDIS_FIRST_VALID_BACKEND','original_picks_preserved':True,
                         'picks_visible':False})
    snap.setdefault('production',{})['package_status']='W'+str(week)+' FINAL · RANKINGS_VERIFIED_PRIVATE · FIGMA_QA_PENDING'
    save(p,snap)
    # Advance the existing scoreboard only with fully certified aggregates.
    current=dict(data)
    current.update({k:v for k,v in snap.items() if k not in
        ('locked_picks','public_picks_authorized','production','status','snapshot_status','scoring')})
    current['week_number']=week
    current['week']='WEEK '+str(week)
    current['season_base_before_week']=previous['season_standings']
    current['sync_mode']='AUTO_NFL_FINAL_PRIVATE_REDIS_SCORING'
    current['public_picks_authorized']=False
    current['public_picks']=[]
    current['capture']['locked_submissions']={}
    current['publication']={'gate':'HOLD','operator':'RODRIGO','published':False,
         'urls':[],'assets_status':'W'+str(week)+' ALL FINAL · Figma QA REQUIRED'}
    save(data_path,current)
    print('PMX_WEEK_PROMOTED_AFTER_MNF',week,'players',len(scored_data['weekly']))

if __name__=='__main__':
    if '--self-test' in sys.argv:
        d={'week_number':6}
        assert next_week(d,{'week_number':7,'status':'OPEN'})==6
        assert next_week(d,{'week_number':7,'status':'CLOSED'})==7
        assert not complete([{'status':'SCHEDULED','winner':None}])
        assert complete([{'status':'TIE','winner':None}])
        assert complete([{'status':'FINAL','winner':'GB','matchup':'GB @ DET'}])
        print('PASS: active week, tie/PUSH, MNF closure gate')
    else:main()
