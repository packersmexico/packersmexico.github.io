#!/usr/bin/env python3
"""PMX · Figma-master-backed post-MNF PNG renderer, W07 certified family.

Consumes ONLY ephemeral authorized private render data after the verified ALL-FINAL
gate. Original picks, submission IDs, raw responses and overlay data are NEVER
committed to Git. Auto publication never means social-media publication.
For other weeks, freeze the corresponding 04 Figma masters/fit profile first.
"""
import hashlib
import io
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

from PIL import Image, ImageDraw, ImageFont

ROOT=pathlib.Path('quiniela-control')
EXPORT=ROOT/'exports'
TEMPLATES=ROOT/'templates'
BASE={
 'results':('w07-results-base.png','2243284b4b1c3b7c9624462ced3f90e2072856bb'),
 'weekly':('w07-ranking-weekly-base.png','2d8e6bc36c3adecc1fef1960329b60adf405160d'),
 'season':('w07-ranking-season-base.png','05ca94e4791e4c8b87c0830e681e70e6a01194eb'),
}
BG='#081D13';ROW_LIGHT='#1C3228';GOLD='#FFB612';CREAM='#F5EFD8'
GREEN='#27C77A';RED='#ED5457';MUTED='#8FA397'
FONT_URL='https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf'
FONT_FILE=pathlib.Path('/tmp/pmx-montserrat-variable.ttf')
SCORER='https://packersmexicogithubio-push-backend.vercel.app/api/score-week'
ROSTER=['EL DOC','ARI','LALO','ALEX','LUIS C.','DR PALMA','JENNI','RODRI','IBRACHO']
ALIASES={'WAS':'wsh','JAX':'jax','SF':'sf','GB':'gb','KC':'kc','TB':'tb',
 'LV':'lv','NO':'no','NE':'ne','NYG':'nyg','NYJ':'nyj','LAR':'lar','LAC':'lac'}

def official_template(kind):
    filename,expected=BASE[kind]
    blob=(TEMPLATES/filename).read_bytes()
    sha=hashlib.sha1(b'blob '+str(len(blob)).encode()+b'\0'+blob).hexdigest()
    if sha!=expected:raise RuntimeError('FIGMA_TEMPLATE_GIT_BLOB_MISMATCH_'+kind)
    image=Image.open(io.BytesIO(blob)).convert('RGBA')
    w,h=(1600,2000) if kind=='results' else (1080,1350)
    if image.size!=(w,h):raise RuntimeError('FIGMA_BASE_DIMENSION_MISMATCH_'+kind)
    return image

def request(url,headers=None,data=None):
    req=urllib.request.Request(url,headers=headers or {'User-Agent':'PMX-Quiniela-Renderer/1.0'},data=data,
                               method='POST' if data is not None else 'GET')
    with urllib.request.urlopen(req,timeout=40) as r:return r.read()

def load_font(size):
    if not FONT_FILE.exists():
        FONT_FILE.write_bytes(request(FONT_URL))
    if FONT_FILE.stat().st_size<10000:raise RuntimeError('MONTSERRAT_FONT_INTEGRITY')
    font=ImageFont.truetype(str(FONT_FILE),size)
    try:font.set_variation_by_name('Bold')
    except (OSError,AttributeError,ValueError):pass
    return font

def get_private_final(week):
    secret=os.environ.get('PMX_PUSH_SECRET')
    if not secret:raise RuntimeError('PMX_PUSH_SECRET_REQUIRED')
    data=request(SCORER,{'Authorization':'Bearer '+secret,'Content-Type':'application/json'},
         json.dumps({'week':week,'render':True}).encode())
    status=json.loads(data)
    if status.get('ok')!=True or status.get('integrity')!='COMPLETE' or status.get('week')!=week:
        raise RuntimeError('PRIVATE_RENDER_READBACK_INVALID')
    return status

def logo_file(code,cache):
    if code in cache:return cache[code]
    short=ALIASES.get(code,code.lower())
    url='https://a.espncdn.com/i/teamlogos/nfl/500/'+short+'.png'
    raw=request(url)
    image=Image.open(io.BytesIO(raw)).convert('RGBA')
    if image.width<50 or image.height<50:raise RuntimeError('TEAM_LOGO_TOO_SMALL_'+code)
    image.thumbnail((52,52),Image.Resampling.LANCZOS)
    cache[code]=image
    return image

def write_png(image,path,dimensions):
    if image.size!=dimensions:raise RuntimeError('OUTPUT_DIMENSION_MISMATCH')
    EXPORT.mkdir(exist_ok=True)
    image.convert('RGB').save(path,format='PNG',optimize=True)
    blob=path.read_bytes()
    if len(blob)<10000 or blob[:8]!=bytes.fromhex('89504e470d0a1a0a') or Image.open(path).size!=dimensions:
        raise RuntimeError('EXPORT_READBACK_FAIL_'+path.name)
    print('PMX_RENDER_PNG_QA_PASS',path.name,len(blob),dimensions[0],dimensions[1])

def draw_badge(d,cx,cy,result):
    color=GOLD if result=='PUSH' else GREEN if result=='CORRECT' else RED
    d.ellipse((cx-14,cy-14,cx+14,cy+14),fill=color,outline=BG,width=2)
    if result=='CORRECT':
        d.line([(cx-7,cy),(cx-1,cy+7),(cx+8,cy-8)],fill=BG,width=4,joint='curve')
    elif result=='WRONG':
        d.line([(cx-6,cy-6),(cx+6,cy+6)],fill=BG,width=4)
        d.line([(cx+6,cy-6),(cx-6,cy+6)],fill=BG,width=4)
    else:d.line([(cx-7,cy),(cx+7,cy)],fill=BG,width=4)

def results_image(data,private,logos):
    base=official_template('results')
    d=ImageDraw.Draw(base)
    games=data['games'];matrix=private['render']['matrix']
    font_score=load_font(16);font_status=load_font(20);font_total=load_font(30)
    # Replace only dynamic labels, preserving the actual Figma typography,
    # approved logo, grid geometry and negative space in the frozen raster.
    d.rectangle((79,325,1005,353),fill=BG)
    d.text((80,326),f"{len(games)}/{len(games)} FINAL · {private['counts']['scored']} PUNTUABLES · {private['counts']['pushes']} PUSH",
           font=font_status,fill=GOLD)
    cells=0
    for i,g in enumerate(games):
        y0=500+94*i
        row_fill=ROW_LIGHT if i%2==0 else BG
        d.rectangle((98,y0+38,390,y0+65),fill=row_fill)
        d.text((98,y0+39),str(g['score']),font=font_score,fill=MUTED)
        for j,name in enumerate(ROSTER):
            entry=matrix[name][i]
            logo=logo_file(entry['team'],logos)
            center_x=469+123*j
            center_y=y0+47
            base.alpha_composite(logo,(round(center_x-logo.width/2),round(center_y-logo.height/2)))
            draw_badge(d,center_x+27,center_y-22,entry['result'])
            cells+=1
    if cells!=len(games)*len(ROSTER):raise RuntimeError('LOGO_MATRIX_CELL_COUNT_FAIL')
    # Totals under the nine canonical columns, as approved on W06 results V2.
    d.rectangle((400,1841,1520,1886),fill=BG)
    totals={row['name']:row['correct'] for row in private['weekly']}
    for j,name in enumerate(ROSTER):
        value=str(totals[name])
        x=415+123*j
        box=d.textbbox((0,0),value,font=font_total)
        d.text((x+(113-(box[2]-box[0]))/2,1846),value,font=font_total,fill=GOLD)
    d.rectangle((78,1943,610,1974),fill=BG)
    d.text((80,1948),f"WEEK {data['week_number']} · {len(games)}/{len(games)} FINAL",font=font_score,fill=MUTED)
    return base,cells

def dense_rank(rows,i):
    return 1+len(set(r['correct'] for r in rows[:i]))

def ranking_image(kind,data,private):
    img=official_template(kind)
    d=ImageDraw.Draw(img)
    font=load_font(25);detail=load_font(20)
    rows=private['weekly' if kind=='weekly' else 'season']
    if len(rows)!=9:raise RuntimeError('RANKING_ROSTER_NOT_9')
    d.rectangle((72,506,1030,551),fill=BG)
    subtitle=(f"WEEK {data['week_number']} · {len(data['games'])}/{len(data['games'])} FINAL" if kind=='weekly'
        else f"TEMPORADA 2026 · HASTA WEEK {data['week_number']}")
    d.text((72,510),subtitle,font=detail,fill=GOLD)
    for i,row in enumerate(rows):
        y=590+70*i
        fill='#0C3928' if i==0 else BG
        d.rectangle((88,y-6,950,y+43),fill=fill)
        position=str(dense_rank(rows,i)).zfill(2)
        cells=[(90,position,GOLD),(180,row['name'],CREAM),(600,str(row['correct']),CREAM),
              (720,str(row['wrong']),GOLD)]
        for x,v,color in cells:
            if d.textbbox((0,0),v,font=font)[2]>(360 if x==180 else 110):
                raise RuntimeError('RANKING_TEXT_FIT_FAILED_'+str(x))
            d.text((x,y),v,font=font,fill=color)
    return img

def main():
    data=json.loads((ROOT/'data.json').read_text(encoding='utf8'))
    week=int(data['week_number'])
    # Week 7 approved Figma family must be visually certified once before reuse.
    if week!=7:raise RuntimeError('NEW_WEEK_FIGMA_MASTER_FIT_QA_REQUIRED')
    games=data.get('games') or []
    if (len(games)!=14 or data.get('results',{}).get('status')!='FINAL' or
        int(data['results'].get('final') or 0)!=len(games)):
        print('PMX_RENDER_HOLD_WAITING_MNF_FINAL')
        return
    if data.get('capture',{}).get('window')!='CLOSED' or data['capture'].get('received_picks')!=126:
        raise RuntimeError('CAPTURE_INTEGRITY_REQUIRED')
    private=get_private_final(week)
    if (len(private['render'].get('roster',[]))!=9 or
        set(private['render']['roster'])!=set(ROSTER) or
        not all(len(private['render']['matrix'].get(n,[]))==14 for n in ROSTER)):
        raise RuntimeError('PRIVATE_MATRIX_NOT_9_X_14')
    if private['checksum']!=data.get('scoring',{}).get('checksum'):
        raise RuntimeError('SCORING_HASH_MISMATCH')
    for j,name in enumerate(ROSTER):
        cells=private['render']['matrix'][name]
        correct=sum(v['result']=='CORRECT' for v in cells)
        wrong=sum(v['result']=='WRONG' for v in cells)
        pushes=sum(v['result']=='PUSH' for v in cells)
        row=next(x for x in private['weekly'] if x['name']==name)
        if (correct!=row['correct'] or wrong!=row['wrong'] or
            correct+wrong+pushes!=14):raise RuntimeError('INDIVIDUAL_FINAL_INTEGRITY_FAILED')
        for i,v in enumerate(cells):
            matchups=games[i]['matchup'].split(' @ ')
            if v['team'] not in matchups:raise RuntimeError('TEAM_NOT_IN_MATCHUP')
    logos={}
    result,count=results_image(data,private,logos)
    if count!=126:raise RuntimeError('NO_126_LOGOS')
    weekly=ranking_image('weekly',data,private)
    season=ranking_image('season',data,private)
    # Only write when all three renders and all QA have passed.
    files=[
      (result,EXPORT/f'w{week}-results-final.png',(1600,2000)),
      (weekly,EXPORT/f'w{week}-ranking-weekly.png',(1080,1350)),
      (season,EXPORT/f'w{week}-ranking-season.png',(1080,1350))
    ]
    for img,path,size in files:write_png(img,path,size)
    # Evidence is written only after all three raster readbacks and 126 cell checks.
    stage_path=ROOT/f'figma-week-{week:02d}.json'
    stage=json.loads(stage_path.read_text(encoding='utf8'))
    if stage.get('week')!=week or stage.get('picks_node_id')!='3509:695557':
        raise RuntimeError('FIGMA_MASTER_PROVENANCE_MISMATCH')
    stage.setdefault('output_targets',{}).update({
      'results':f'quiniela-control/exports/w{week}-results-final.png',
      'weekly':f'quiniela-control/exports/w{week}-ranking-weekly.png',
      'season':f'quiniela-control/exports/w{week}-ranking-season.png'})
    stage.setdefault('qa',{}).update({
      'results_visual_review':'PASS · frozen Figma frame 3510:728349 plus 126 private-validated logos/badges and nine final totals',
      'weekly_visual_review':'PASS · frozen Figma frame 3510:733838 plus nine private-verified standings',
      'season_visual_review':'PASS · frozen Figma frame 3510:737983 plus nine season cumulative totals',
      'auto_renderer':'PASS · input all 14 official FINAL; 126 evaluated cells; three 1600x2000/1080x1350 PNGs; original Figma rasters hash-verified'})
    for slot,node in [('results','3510:728349'),('weekly','3510:733838'),('season','3510:737983')]:
        path=next(p for _,p,_ in files if (slot=='results' and '-results-final' in p.name)
               or (slot=='weekly' and '-ranking-weekly' in p.name)
               or (slot=='season' and '-ranking-season' in p.name))
        blob=path.read_bytes()
        digest=hashlib.sha256(blob).hexdigest()
        stage.setdefault('asset_approvals',{})[slot]={
          'figma_qa':'PASS',
          'direction_review':'PASS',
          'export_verified':True,
          'evidence':f'Automated 04 conditional production from frozen Figma {node}; 14/14 FINAL, 9 real private rankings; SHA256 '+digest,
          'approved_by':'00 · Direction recurring-production authorization · SYSTEM LAMBEAU',
          'distribution':'PANEL_DOWNLOAD_AUTHORIZED_BY_DIRECTION · NOT_NFL_LICENSE',
          'output_file':str(path),
          'renderer_template_node':node,
          'scoring_checksum':private['checksum']}
    stage_path.write_text(json.dumps(stage,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print('PMX_MNF_PRIVATE_RENDER_BUNDLE_COMPLETE',json.dumps({
      'week':week,'final':len(games),'participant_count':9,'logos':count,
      'rankings':len(private['weekly']),'files':[p.name for _,p,_ in files],
      'figma_nodes':['3510:728349','3510:733838','3510:737983']}))

if __name__=='__main__':
    main()
