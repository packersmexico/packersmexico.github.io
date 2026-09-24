const NS='http://www.w3.org/2000/svg', DATA='../data.json';
const C={dark:'#081D13',green:'#123B31',gold:'#FFC62F',cream:'#F2E8CF',muted:'#9AA99F',line:'#164D36'};
const logo='../../assets/PMX_LOGO_HISTORICO_HORIZONTAL_CANVA_MASTER_V1.1.svg';
const players=['EL DOC','ARI','LALO','ALEX','LUIS C.','DR PALMA','JENNI','RODRI','IBRACHO'];
function n(tag,a={},txt){const e=document.createElementNS(NS,tag);Object.entries(a).forEach(([k,v])=>e.setAttribute(k,v));if(txt!=null)e.textContent=txt;return e}
function text(svg,x,y,txt,size=24,fill=C.cream,weight=700,family='Montserrat',anchor='start'){svg.append(n('text',{x,y,fill,'font-family':family,'font-size':size,'font-weight':weight,'text-anchor':anchor},txt))}
function bg(svg,w,h){svg.replaceChildren();svg.append(n('rect',{width:w,height:h,fill:C.dark}));svg.append(n('image',{href:logo,x:64,y:44,width:240,height:62,preserveAspectRatio:'xMinYMid meet'}))}
function weekly(data){return Array.isArray(data.weekly_standings)?[...data.weekly_standings].sort((a,b)=>b.correct-a.correct||a.wrong-b.wrong||players.indexOf(a.name)-players.indexOf(b.name)):players.map(name=>({name,correct:0,wrong:0}))}
function season(data){return Array.isArray(data.season_standings)?[...data.season_standings].sort((a,b)=>b.correct-a.correct||a.wrong-b.wrong||players.indexOf(a.name)-players.indexOf(b.name)):[]}
function denseRank(rows,key){let last=null,rank=0;return rows.map(r=>{if(last===null||r[key]!==last){rank++;last=r[key]}return {...r,pos:rank}})}
function head(svg,kicker,title,sub,w){text(svg,64,155,kicker,30,C.gold,700,'Montserrat');text(svg,64,235,title,76,C.cream,400,'Bebas Neue');svg.append(n('rect',{x:64,y:272,width:w-128,height:4,fill:C.gold}));if(sub)text(svg,64,325,sub,24,C.gold,700,'Montserrat')}
function renderDetail(data){
 const s=document.getElementById('detail-svg');bg(s,1600,2000);
 head(s,'QUINIELA · '+data.week,'TODOS LOS PICKS','9 INTEGRANTES × '+data.games.length+' PARTIDOS · 144 PICKS',1600);
 const left=64,top=390,matchW=340,colW=132,rowH=78;
 s.append(n('rect',{x:left,y:top,width:1472,height:86,rx:8,fill:C.green}));
 text(s,left+16,top+52,'MATCHUP + HORA CDMX',18,C.gold);
 players.forEach((p,i)=>text(s,left+matchW+i*colW+colW/2,top+52,p.replace('DR ',''),15,C.cream,700,'Montserrat','middle'));
 (data.games||[]).forEach((g,r)=>{
   const y=top+86+r*rowH;
   s.append(n('rect',{x:left,y,width:1472,height:rowH,fill:r%2?C.dark:C.green,opacity:r%2?'1':'.38'}));
   text(s,left+14,y+28,g.matchup,18,C.cream);text(s,left+14,y+52,g.time,11,C.muted,600);
   if(g.winner)text(s,left+255,y+41,'GANÓ '+g.winner,12,C.gold);
   players.forEach((p,i)=>{
     const pick=data.public_picks?.[g.id]?.[p]||g.picks?.[p]||'—',x=left+matchW+i*colW+colW/2;
     const ok=g.winner&&pick===g.winner,bad=g.winner&&pick!=='—'&&pick!==g.winner;
     text(s,x,y+45,pick,18,ok?C.gold:C.cream,700,'Montserrat','middle');
     if(ok||bad){
       s.append(n('circle',{cx:x+42,cy:y+22,r:11,fill:ok?C.gold:C.dark,stroke:ok?C.gold:C.cream,'stroke-width':2}));
       text(s,x+42,y+27,ok?'✓':'×',13,ok?C.dark:C.cream,700,'Montserrat','middle');
     }
   });
 });
 const y=top+86+data.games.length*rowH+8;
 s.append(n('rect',{x:left,y,width:1472,height:84,rx:8,fill:C.green}));
 text(s,left+16,y+50,'TOTAL',24,C.gold,400,'Bebas Neue');
 const wr=weekly(data),lead=Math.max(...wr.map(x=>x.correct),0);
 wr.forEach((r,i)=>text(s,left+matchW+i*colW+colW/2,y+51,String(r.correct),22,data.results.final&&r.correct===lead?C.gold:C.cream,700,'Montserrat','middle'));
 text(s,left,1940,'PICKS CERRADOS · 144/144    ·    '+data.results.final+'/'+data.results.total+' JUEGOS FINAL',16,C.cream);
}
function tableCard(svg,rows,cols,highlightFirst=false){
 const x=64,y=420,w=952,rowH=72;svg.append(n('rect',{x,y,width:w,height:66,rx:8,fill:C.green}));
 const xs=[x+18,x+150,x+560,x+780];cols.forEach((c,i)=>text(svg,xs[i],y+40,c,18,C.cream));
 rows.forEach((r,i)=>{const yy=y+66+i*rowH,hi=highlightFirst&&i===0;const specific=hi?C.gold:(i%2?C.dark:C.green);svg.append(n('rect',{x,y:yy,width:w,height:rowH,fill:specific,opacity:hi?'1':(i%2?'1':'.5')}));const fill=hi?C.dark:C.cream;text(svg,xs[0],yy+45,String(r.pos),22,fill);text(svg,xs[1],yy+45,r.name,22,fill);text(svg,xs[2],yy+45,String(r.a),22,fill);text(svg,xs[3],yy+45,String(r.b),22,fill)});
}
function renderWeekly(data){
 const s=document.getElementById('weekly-svg');bg(s,1080,1350);
 const raw=weekly(data);
 const ranked=data.results.final>0?denseRank(raw,'correct').map(r=>({pos:r.pos,name:r.name,a:r.correct,b:r.wrong})):raw.map(r=>({pos:'—',name:r.name,a:r.correct,b:r.wrong}));
 const sub=data.results.final>0?data.results.final+'/'+data.results.total+' FINAL · RANKING EN VIVO':'0/16 FINAL';
 head(s,'QUINIELA PMX · '+data.week,'RESULTADOS',sub,1080);
 tableCard(s,ranked,['POS','INTEGRANTE','ACIERTOS','ERRORES'],data.results.final>0);
 text(s,64,1270,data.results.final===data.results.total?'WEEK '+data.week_number+' · FINAL':'WEEK '+data.week_number+' · RESULTADOS',18,C.cream);
}
function renderSeason(data){
 const s=document.getElementById('season-svg');bg(s,1080,1350);
 const raw=season(data),ranked=denseRank(raw,'correct').map(r=>({pos:r.pos,name:r.name,a:r.correct,b:r.correct+'-'+r.wrong}));
 head(s,'QUINIELA PMX · TEMPORADA '+data.season,'RANKING GENERAL',data.week+' · '+data.results.final+'/'+data.results.total+' FINAL',1080);
 tableCard(s,ranked,['POS','INTEGRANTE','TOTAL','RÉCORD'],true);
 text(s,64,1270,'ACUMULADO DE TEMPORADA',18,C.cream);
}
async function svgToPng(svg,filename,w,h){await document.fonts.ready;const clone=svg.cloneNode(true);const im=clone.querySelector('image');if(im){const src=await fetch(logo).then(r=>r.text());im.setAttribute('href','data:image/svg+xml;charset=utf-8,'+encodeURIComponent(src))}const source=new XMLSerializer().serializeToString(clone),blob=new Blob([source],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),img=new Image();await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url});const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);URL.revokeObjectURL(url);const png=await new Promise(r=>c.toBlob(r,'image/png',1)),u=URL.createObjectURL(png),a=document.createElement('a');a.href=u;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
let current;
async function load(){const r=await fetch(DATA+'?t='+Date.now(),{cache:'no-store'});current=await r.json();document.getElementById('asset-week').textContent='QUINIELA · '+current.week+' · '+current.season;document.getElementById('asset-status').textContent='PUBLICATION READY · '+current.capture.complete+'/'+current.capture.total+' · '+current.results.final+'/'+current.results.total+' FINAL';const stamp=Date.now();const p=document.getElementById('picks-image');if(p)p.src='./w3-picks-board.png?t='+stamp;const lr=document.getElementById('results-live-image');if(lr)lr.src='./w3-results-live.png?t='+stamp;renderWeekly(current);renderSeason(current)}
document.querySelectorAll('[data-download]').forEach(btn=>btn.addEventListener('click',()=>{const [w,h]=btn.dataset.size.split('x').map(Number),id=btn.dataset.download,name=id==='weekly-svg'?'PMX_'+current.week.replace(' ','_')+'_RESULTADOS_RANKING.png':'PMX_RANKING_GENERAL_'+current.week.replace(' ','_')+'.png';svgToPng(document.getElementById(id),name,w,h)}));
load();setInterval(load,60000);
