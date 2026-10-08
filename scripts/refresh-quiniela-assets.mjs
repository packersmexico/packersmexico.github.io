// Asset state, generated from source data + Figma QA evidence. NEVER renders or approves artwork.
import fs from 'node:fs';
import path from 'node:path';
const root='quiniela-control';
const output=`${root}/exports/asset-index.json`;
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return null}};
const validPng=(p,w,h)=>{
  try{const b=fs.readFileSync(p);return b.length>10000&&b.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))&&b.readUInt32BE(16)===w&&b.readUInt32BE(20)===h;}catch{return false}
};
const slots={
  picks:{file:'picks-board',width:1600,height:2000},
  results:{file:'results-live',width:1600,height:2000},
  weekly:{file:'ranking-weekly',width:1080,height:1350},
  season:{file:'ranking-season',width:1080,height:1350}
};
const live=read(`${root}/data.json`);
if(!live||!Number.isInteger(Number(live.week_number)))throw Error('ACTIVE_DATA_INVALID');
const current=Number(live.week_number);
const weeks={};
for(let w=1;w<=current;w++){
  const wk=read(`${root}/weeks/week-${String(w).padStart(2,'0')}.json`);
  const data=w===current?live:wk;
  if(!data)continue;
  const capture=data.capture||{};
  const results=data.results||{};
  const complete=Number(capture.complete||0),target=Number(capture.total||9);
  const total=Number(results.total||data.games?.length||0),final=Number(results.final||0);
  const picksGate=String(capture.window||'').toUpperCase()==='CLOSED'&&complete>0&&complete<=target;
  const resultsGate=total>0&&total===final&&String(results.status||'').toUpperCase()==='FINAL';
  const figma=read(`${root}/figma-week-${String(w).padStart(2,'0')}.json`);
  const assets={};
  for(const [key,slot] of Object.entries(slots)){
    const eligible=key==='picks'?picksGate:resultsGate;
    const defaultPath=`${root}/exports/w${w}-${slot.file}.png`;
    const actual=figma?.output_targets?.[key]||defaultPath;
    const isCorrectPath=actual===defaultPath && !path.isAbsolute(actual);
    const visual=String(figma?.qa?.[`${key}_visual_review`]||figma?.qa?.visual_review||'');
    const perAsset=figma?.asset_approvals?.[key];
    const individual=perAsset?.figma_qa==='PASS' && perAsset?.direction_review==='PASS' && perAsset?.export_verified===true;
    const legacy=figma?.publication_ready===true && visual.includes('PASS') && String(figma.gate||'').includes('QA_PASS');
    const approved=Boolean(figma && Number(figma.week)===w && (individual||legacy));
    const exists=isCorrectPath&&validPng(actual,slot.width,slot.height);
    const state=!eligible?'WAITING_EVENT':approved&&exists?'READY':'QA_PENDING';
    assets[key]={state,href:state==='READY'?('./'+path.basename(actual)):null,expected:slot.file+'.png',size:`${slot.width}x${slot.height}`};
  }
  weeks[w]={week:w,capture:{complete,total:target,window:capture.window||'UNKNOWN'},results:{final,total},assets};
}
const completed=Object.keys(weeks).map(Number).filter(w=>weeks[w].results.total>0&&weeks[w].results.final===weeks[w].results.total);
const index={schema:'PMX_QUINIELA_ASSET_INDEX_V1',active_week:current,last_completed_week:completed.length?Math.max(...completed):null,weeks};
const serialized=JSON.stringify(index,null,2)+'\n';
if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==serialized){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,serialized);}
console.log(JSON.stringify({active_week:current,last_completed_week:index.last_completed_week,active_assets:index.weeks[current]?.assets}));
