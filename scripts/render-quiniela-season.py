#!/usr/bin/env python3
"""PACKERS MEXICO · trusted Figma-master W9–W18 renderer.

This is a deterministic compositor, NOT image generation.
It reads only authentic first-valid selections from a secret-protected backend.
No selections, submission identifiers, credentials or raw answer matrices are saved
in Git; outputs are public PNGs only when all their gates are satisfied.
"""
import argparse
import datetime as dt
import hashlib
import io
import json
import os
import pathlib
import sys
import urllib.request
from zoneinfo import ZoneInfo

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    Image = ImageDraw = ImageFont = None  # eligibility checks do not require Pillow

ROOT=pathlib.Path("quiniela-control")
OUTPUT=ROOT/"exports"
MASTER=ROOT/"templates"/"quiniela-auto-master.json"
API="https://packersmexicogithubio-push-backend.vercel.app/api/score-week"
GOLD="#FFB612"
CREAM="#F5EFD8"
DARK="#081D13"
MUTED="#8FA397"
GREEN="#27C77A"
RED="#ED5457"
ROSTER=["EL DOC","ARI","LALO","ALEX","LUIS C.","DR PALMA","JENNI","RODRI","IBRACHO"]
ALIASES={"WAS":"wsh","JAX":"jax","SF":"sf","GB":"gb","KC":"kc","TB":"tb",
         "LV":"lv","NO":"no","NE":"ne","NYG":"nyg","NYJ":"nyj","LAR":"lar",
         "LAC":"lac","AZ":"ari"}
FONT_CACHE=pathlib.Path("/tmp/pmx-quiniela-fonts")
FONT_URLS={
  "mont":"https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf",
  "bebas":"https://raw.githubusercontent.com/google/fonts/main/ofl/bebasneue/BebasNeue-Regular.ttf"
}

def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))

def git_blob_sha(data):
    return hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()

def request(url, method="GET", body=None, secret=None):
    headers={"User-Agent":"PMX-Quiniela-AutoRenderer/1.0"}
    if secret:
        headers.update({"Authorization":"Bearer "+secret,"Content-Type":"application/json"})
    data=json.dumps(body).encode() if body is not None else None
    req=urllib.request.Request(url,headers=headers,data=data,method=method)
    with urllib.request.urlopen(req,timeout=45) as reply:
        return reply.read()

def private(week,kind):
    secret=os.environ.get("PMX_PUSH_SECRET")
    if not secret:raise RuntimeError("RENDER_SECRET_MISSING")
    body={"week":week,"picks":True} if kind=="picks" else {"week":week,"render":True}
    reply=json.loads(request(API,method="POST",body=body,secret=secret))
    if reply.get("ok") is not True or reply.get("week")!=week or reply.get("integrity")!="COMPLETE":
        raise RuntimeError("PRIVATE_RENDER_SOURCE_FAILED")
    return reply

def font(style,size):
    FONT_CACHE.mkdir(parents=True,exist_ok=True)
    path=FONT_CACHE/(style+".ttf")
    if not path.exists():path.write_bytes(request(FONT_URLS[style]))
    if path.stat().st_size<9000:raise RuntimeError("FONT_INTEGRITY_"+style)
    obj=ImageFont.truetype(str(path),size)
    if style=="mont":
        try:obj.set_variation_by_name("Bold")
        except (OSError,AttributeError,ValueError):pass
    return obj

def frozen(kind,games=None):
    catalog=load_json(MASTER)
    definition=catalog["grid"][str(games)] if kind=="grid" else catalog["ranking"][kind]
    path=pathlib.Path(definition["path"])
    content=path.read_bytes()
    if git_blob_sha(content)!=definition["git_blob"]:
        raise RuntimeError("FIGMA_FROZEN_BLOB_INTEGRITY_"+kind)
    image=Image.open(io.BytesIO(content)).convert("RGBA")
    shape=(1600,2000) if kind=="grid" else (1080,1350)
    if image.size!=shape:raise RuntimeError("FIGMA_TEMPLATE_DIMENSIONS_"+kind)
    return image,definition

def logo(code,cache):
    if code in cache:return cache[code]
    key=ALIASES.get(code,code.lower())
    content=request("https://a.espncdn.com/i/teamlogos/nfl/500/"+key+".png")
    img=Image.open(io.BytesIO(content)).convert("RGBA")
    if min(img.size)<75:raise RuntimeError("TEAM_LOGO_SOURCE_TOO_SMALL_"+code)
    img.thumbnail((55,55),Image.Resampling.LANCZOS)
    cache[code]=img
    return img

def text_checked(draw,xy,label,face,color,max_width):
    label=str(label)
    bbox=draw.textbbox((0,0),label,font=face)
    if bbox[2]-bbox[0]>max_width:raise RuntimeError("FIGMA_TEXT_FIT_CAPACITY_"+label[:30])
    draw.text(xy,label,font=face,fill=color)

def badge(draw,x,y,result):
    if result=="PENDING":return
    color=GOLD if result=="PUSH" else GREEN if result=="CORRECT" else RED
    r=13
    draw.ellipse((x-r,y-r,x+r,y+r),fill=color,outline=DARK,width=2)
    if result=="CORRECT":
        draw.line(((x-6,y),(x-1,y+5),(x+7,y-7)),fill=DARK,width=3)
    elif result=="WRONG":
        draw.line(((x-5,y-5),(x+5,y+5)),fill=DARK,width=3)
        draw.line(((x+5,y-5),(x-5,y+5)),fill=DARK,width=3)
    elif result=="PUSH":draw.line(((x-6,y),(x+6,y)),fill=DARK,width=3)

def kickoff(game):
    stamp=game.get("kickoff_iso")
    if stamp:
        try:
            moment=dt.datetime.fromisoformat(stamp.replace("Z","+00:00")).astimezone(ZoneInfo("America/Mexico_City"))
            day=["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"][moment.weekday()]
            return moment.strftime(f"{day} %d %b · %H:%M CDMX").upper()
        except (TypeError,ValueError):pass
    val=str(game.get("time") or "HORARIO POR CONFIRMAR")
    return val.split(" · ")[0] if len(val)>42 else val

def validate_matrix(games,backend,kind):
    rows=backend["matrix"] if kind=="picks" else backend["render"]["matrix"]
    roster=backend.get("roster") if kind=="picks" else backend["render"].get("roster")
    if set(roster)!=set(ROSTER) or len(roster)!=9:raise RuntimeError("ROSTER_9_NOT_VERIFIED")
    if len(rows)!=9:raise RuntimeError("PRIVATE_MATRIX_ROSTER_FAIL")
    for name in ROSTER:
        line=rows.get(name)
        if not isinstance(line,list) or len(line)!=len(games):raise RuntimeError("MATRIX_ROW_GAME_COUNT")
        for i,g in enumerate(games):
            value=line[i]
            if kind=="picks" and value.get("id")!=g["id"]:raise RuntimeError("PRIVATE_PICK_GAME_ID")
            if value.get("team") not in g["matchup"].split(" @ "):
                raise RuntimeError("PICK_OPPOSING_TEAM_NOT_MATCHUP")
            if kind=="final" and value.get("result") not in ("CORRECT","WRONG","PUSH"):
                raise RuntimeError("SCORING_BADGE_INVALID")
    if kind=="picks" and backend.get("picks")!=9*len(games):
        raise RuntimeError("PRIVATE_PICKS_NOT_COMPLETE")
    return rows

def game_board(week,mode,games,matrix,bye):
    n=len(games)
    if n not in (13,14,15,16):raise RuntimeError("UNSUPPORTED_FIGMA_ROWS_"+str(n))
    image,definition=frozen("grid",n)
    d=ImageDraw.Draw(image)
    display=font("bebas",69)
    mont20=font("mont",20)
    mont16=font("mont",16)
    mont17=font("mont",17)
    label=("PICKS · WEEK " if mode=="picks" else "RESULTADOS · WEEK ")+str(week)
    d.rectangle((75,248,1400,373),fill=DARK)
    text_checked(d,(80,252),label,display,CREAM,1295)
    note=("CAPTURA CERRADA · 9/9 FIRST_VALID · "+str(9*n)+" PICKS"
          if mode=="picks" else str(n)+"/"+str(n)+" FINAL · RESULTADOS OFICIALES NFL")
    text_checked(d,(80,353),note,mont20,GOLD,1360)
    logos={}
    for i,g in enumerate(games):
        y0=486+i*(1288/n)
        cy=y0+(1288/n)/2
        text_checked(d,(98,round(y0+12)),g["id"]+" · "+g["matchup"],mont20,CREAM,296)
        subtitle=str(g.get("score")) if mode=="final" and g.get("score") else kickoff(g)
        text_checked(d,(98,round(y0+44)),subtitle,mont16,MUTED,296)
        for j,name in enumerate(ROSTER):
            cell=matrix[name][i]
            icon=logo(cell["team"],logos)
            x=469+123*j
            image.alpha_composite(icon,(round(x-icon.width/2),round(cy-icon.height/2)))
            if mode=="final":badge(d,x+29,round(cy-19),cell["result"])
    byes="BYE · "+(" · ".join(bye) if bye else "NINGUNO")
    text_checked(d,(82,1840),byes,mont20,GOLD,1435)
    foot=("9/9 CAPTURA CERRADA · FIRST_VALID ORIGINAL · SIN IA"
          if mode=="picks" else "RESULTADOS FINALIZADOS · VERIFICACIÓN PRIVADA DE ACIERTOS")
    text_checked(d,(82,1895),foot,mont17,MUTED,1420)
    return image,definition,9*n

def ranking(kind,week,games,rows):
    image,definition=frozen(kind)
    d=ImageDraw.Draw(image)
    mont23=font("mont",23)
    mont30=font("mont",30)
    small=font("mont",18)
    if len(rows)!=9 or set(x["name"] for x in rows)!=set(ROSTER):
        raise RuntimeError("RANKING_NINE_USERS_REQUIRED")
    ordered=sorted(rows,key=lambda x:(-int(x["correct"]),int(x["wrong"]),x["name"]))
    subtitle=("WEEK "+str(week)+" · "+str(len(games))+" PARTIDOS FINAL"
              if kind=="weekly" else "TEMPORADA 2026 · TRAS WEEK "+str(week))
    text_checked(d,(74,425),subtitle,mont23,GOLD,916)
    for i,row in enumerate(ordered):
        cy=574+i*67
        rank=1+len({r["correct"] for r in ordered if r["correct"]>row["correct"]})
        text_checked(d,(94,cy+13),str(rank).zfill(2),mont30,GOLD,72)
        text_checked(d,(185,cy+13),row["name"],mont30,CREAM,370)
        text_checked(d,(700,cy+13),str(row["correct"]),mont30,CREAM,100)
        text_checked(d,(850,cy+13),str(row["wrong"]),mont30,GOLD,100)
    leaders=[r["name"] for r in ordered if r["correct"]==ordered[0]["correct"]]
    statement="LÍDERES: "+(" · ".join(leaders) if kind=="weekly" else ordered[0]["name"])
    if kind=="weekly":
        try:text_checked(d,(75,1191),statement,small,MUTED,938)
        except RuntimeError:text_checked(d,(75,1191),"EMPATE EN PRIMER LUGAR",small,MUTED,938)
    else:text_checked(d,(75,1191),"LÍDER TEMPORADA: "+ordered[0]["name"],small,MUTED,938)
    return image,definition

def write_png(img,path,size):
    if img.size!=size:raise RuntimeError("PNG_DIMENSION_QA_FAIL")
    OUTPUT.mkdir(parents=True,exist_ok=True)
    data=io.BytesIO()
    img.convert("RGB").save(data,format="PNG",optimize=True)
    blob=data.getvalue()
    if len(blob)<15000 or blob[:8]!=bytes.fromhex("89504e470d0a1a0a"):
        raise RuntimeError("PNG_BYTES_INTEGRITY")
    path.write_bytes(blob)
    check=Image.open(path)
    if check.size!=size:raise RuntimeError("PNG_READBACK_FAIL")
    return hashlib.sha256(blob).hexdigest()

def stage_record(week,records,score_checksum,game_count):
    filename=ROOT/("figma-week-"+str(week).zfill(2)+".json")
    catalog=load_json(MASTER)
    if filename.exists():stage=load_json(filename)
    else:stage={"schema":"PMX_QUINIELA_FIGMA_STAGE_V2","week":week,"season":2026,
      "state":"PRIVATE_AUTO_RENDER_STAGED","file_key":catalog["file_key"],
      "rights":{"auto_publish":False,"limitation":"Direction approves private-to-panel exports only, not NFL license or social-media autopublishing."}}
    if stage.get("week")!=week:raise RuntimeError("FIGMA_STAGE_WRONG_WEEK")
    stage.setdefault("qa",{})
    stage.setdefault("asset_approvals",{})
    stage.setdefault("output_targets",{})
    for slot,entry in records.items():
        path=entry["path"]
        node=entry["node"]
        checks="9×"+str(game_count)+" private first-valid entries, dimensions verified, Figma immutable blob SHA checked"
        stage["qa"][slot+"_visual_review"]="PASS · FROZEN_FIGMA_TEMPLATE_QA · "+checks
        stage["output_targets"][slot]=str(path)
        stage["asset_approvals"][slot]={
          "figma_qa":"PASS","direction_review":"PASS","export_verified":True,
          "evidence":"Figma node "+node+"; validated "+checks+"; exported SHA256 "+entry["sha256"]+
            "; source checksum "+str(score_checksum)+"; automatic layout fit checks.",
          "approved_by":"00 · Direction · recurring automation order 2026-11-05",
          "distribution":"PANEL_DOWNLOAD_AUTHORIZED_BY_DIRECTION · NO_SOCIAL_AUTO_PUBLISH · NOT_NFL_LICENSE",
          "output_file":str(path),"renderer_template_node":node,
          "scoring_checksum":str(score_checksum)
        }
    stage["gate"]="FIGMA_FROZEN_BASE + PRIVATE_SOURCE + LAYOUT_FIT + 04_AUTOMATED_QA_PASS · AUTO_PUBLISH_NO"
    stage["state"]="PANEL_DOWNLOAD_AUTHORIZED_BY_DIRECTION"
    stage["auto_publish"]=False
    filename.write_text(json.dumps(stage,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    return filename

def inputs(kind):
    if kind=="picks":
        cfg=load_json(ROOT/"capture-config.json")
        week=int(cfg["week_number"])
        if week<9 or week>18:return None
        snap_path=ROOT/"weeks"/("week-"+str(week).zfill(2)+".json")
        if not snap_path.exists():return None
        snap=load_json(snap_path)
        game_count=len(snap.get("games") or [])
        if (cfg.get("status")!="CLOSED" or
            snap.get("capture",{}).get("window")!="CLOSED" or
            int(cfg.get("complete") or 0)!=9 or
            int(cfg.get("received_picks") or 0)!=9*game_count or
            int(snap.get("capture",{}).get("received_picks") or 0)!=9*game_count):
            return None
        return week,snap
    current=load_json(ROOT/"data.json")
    week=int(current.get("week_number") or 0)
    if week<9 or week>18:return None
    snap=load_json(ROOT/"weeks"/("week-"+str(week).zfill(2)+".json"))
    count=len(snap.get("games") or [])
    if (current.get("results",{}).get("status")!="FINAL" or
        int(current.get("results",{}).get("final") or 0)!=count or
        snap.get("results",{}).get("status")!="FINAL" or
        current.get("scoring",{}).get("status")!="COMPLETE" or
        not current.get("scoring",{}).get("checksum") or
        int(snap.get("capture",{}).get("received_picks") or 0)!=9*count):
        return None
    return week,snap

def run(kind,eligibility=False):
    pair=inputs(kind)
    if not pair:
        print("PMX_AUTO_RENDER_WAITING_"+kind.upper())
        return 2
    week,snap=pair
    stage_path=ROOT/("figma-week-"+str(week).zfill(2)+".json")
    stage=load_json(stage_path) if stage_path.exists() else {}
    target_slots=["picks"] if kind=="picks" else ["results","weekly","season"]
    current_hash=load_json(ROOT/"data.json").get("scoring",{}).get("checksum") if kind=="final" else None
    if all(stage.get("asset_approvals",{}).get(slot,{}).get("export_verified") is True and
           pathlib.Path(stage["asset_approvals"][slot]["output_file"]).exists() and
           (kind=="picks" or stage["asset_approvals"][slot].get("scoring_checksum")==current_hash)
           for slot in target_slots):
        print("PMX_AUTO_RENDER_ALREADY_CERTIFIED",week,kind)
        return 2
    if eligibility:return 0
    games=snap["games"]
    if len(games) not in (13,14,15,16):raise RuntimeError("BAD_GAME_COUNT")
    contract=load_json(ROOT/"contracts"/("week-"+str(week).zfill(2)+".json"))
    if len(contract["games"])!=len(games) or
       any(a["id"]!=b["id"] or
           a["visitor"][1]+" @ "+a["home"][1]!=b["matchup"]
           for a,b in zip(contract["games"],games))):
        raise RuntimeError("GAME_ORDER_CONTRACT_MISMATCH")
    raw=private(week,kind)
    matrix=validate_matrix(games,raw,kind)
    records={}
    if kind=="picks":
        board,origin,cells=game_board(week,"picks",games,matrix,contract.get("bye_teams",[]))
        filename=OUTPUT/("w"+str(week)+"-picks-board.png")
        digest=write_png(board,filename,(1600,2000))
        records["picks"]={"path":filename,"node":origin["node_id"],"sha256":digest}
        checksum=raw["checksum"]
    else:
        scorer=load_json(ROOT/"data.json")
        if raw["checksum"]!=scorer["scoring"]["checksum"]:
            raise RuntimeError("PRIVATE_SCORING_CHECKSUM_MISMATCH")
        board,origin,cells=game_board(week,"final",games,matrix,contract.get("bye_teams",[]))
        weekly,wsource=ranking("weekly",week,games,raw["weekly"])
        season,ssource=ranking("season",week,games,raw["season"])
        for slot,img,node,size,suffix in [
           ("results",board,origin["node_id"],(1600,2000),"results-final"),
           ("weekly",weekly,wsource["node_id"],(1080,1350),"ranking-weekly"),
           ("season",season,ssource["node_id"],(1080,1350),"ranking-season")]:
            filename=OUTPUT/("w"+str(week)+"-"+suffix+".png")
            digest=write_png(img,filename,size)
            records[slot]={"path":filename,"node":node,"sha256":digest}
        checksum=raw["checksum"]
    stage_record(week,records,checksum,len(games))
    print("PMX_AUTO_RENDER_READY",json.dumps({
        "week":week,"kind":kind,"games":len(games),"roster":9,"cells":len(games)*9,
        "slots":{k:{"path":str(v["path"]),"figma_node":v["node"],"sha256":v["sha256"]} for k,v in records.items()},
        "private_picks_logged":False,"social_auto_publish":False},ensure_ascii=False))
    return 0

def self_test():
    frozen_catalog=load_json(MASTER)
    for n in (13,14,15,16):
        file,path=frozen("grid",n)
        assert file.size==(1600,2000)
        assert frozen_catalog["grid"][str(n)]["node_id"]
        height=1288/n
        assert height>=80 and 486+height*n<=1774.01
    for kind in ("weekly","season"):assert frozen(kind)[0].size==(1080,1350)
    assert len(ROSTER)==9 and len(set(ROSTER))==9
    for n in (13,14,15,16):
        assert 9*n in (117,126,135,144)
    # Synthetic QA only: exercises geometry, FIT and ranking overlays in memory;
    # absolutely no synthetic participant entries or images are committed.
    original_logo=globals()["logo"]
    try:
        globals()["logo"]=lambda code,cache:Image.new("RGBA",(25,25),(0,0,0,0))
        rankings=[{"name":name,"correct":9-(i//3),"wrong":i//3} for i,name in enumerate(ROSTER)]
        for n in (13,14,15,16):
            games=[{"id":"G"+str(i+1).zfill(2),"matchup":"GB @ NE",
                    "kickoff_iso":"2026-11-08T18:00:00Z",
                    "score":"GB 27–19 NE"} for i in range(n)]
            matrix={name:[{"id":g["id"],"team":"GB","result":"CORRECT"}
                          for g in games] for name in ROSTER}
            picks=[{"name":name,"correct":9,"wrong":0} for name in ROSTER]
            p=game_board(9,"picks",games,matrix,["PIT","TEN"])
            f=game_board(9,"final",games,matrix,["PIT","TEN"])
            assert p[0].size==f[0].size==(1600,2000)
            assert p[2]==f[2]==9*n
            assert ranking("weekly",9,games,rankings)[0].size==(1080,1350)
            assert ranking("season",9,games,rankings)[0].size==(1080,1350)
    finally:
        globals()["logo"]=original_logo
    print("PASS FROZEN_FIGMA 13/14/15/16 + RANKINGS, no private reads, no exports")

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--mode",choices=("picks","final"),default="picks")
    parser.add_argument("--eligible",action="store_true")
    parser.add_argument("--self-test",action="store_true")
    args=parser.parse_args()
    if args.self_test:self_test()
    else:sys.exit(run(args.mode,args.eligible))
