// Public Jotform readback for a provider-approved release window. Match the
// actual controls, not arbitrary text elsewhere in the page or its scripts.
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
 .map(m=>[m[1].toLowerCase(),m[2]??m[3]]));
const inputs=body=>[...body.matchAll(/<input\b[^>]*>/gi)].map(m=>attrs(m[0]));
const labels=body=>[...body.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/gi)].map(m=>m[1]);
const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/(?:&nbsp;|&#160;)/gi,' ')
 .replace(/(?:&#64;|&commat;)/gi,'@').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
const gameText=s=>plain(s).match(/^G(\d{2})\s*[·.:-]?\s*([A-Z0-9]+)\s*@\s*([A-Z0-9]+)(?=\s|[:·.-]|$)/i);
const textNodes=body=>[...body.matchAll(/<div\b([^>]*)>([^<>]*)<\/div>/gi)]
 .filter(m=>attrs(m[1])['data-component']==='text'||/\bform-html\b/.test(attrs(m[1]).class||''))
 .map(m=>m[2]);

export function readNativeFormMap(html,manifest){
 const rows=[...html.matchAll(/(<li\b[^>]*\bid="(?:id|cid)_(\d+)"[^>]*>)([\s\S]*?)<\/li>/gi)]
  .map(m=>({qid:m[2],type:attrs(m[1])['data-type'],body:m[3]}));
 const selectors=rows.filter(x=>x.type==='control_dropdown'&&labels(x.body).some(x=>/^participante\b/i.test(plain(x))));
 if(selectors.length!==1)throw Error('SCHEDULED_PUBLIC_ROSTER_MISMATCH');
 const participant=selectors[0];
 const name=attrs(participant.body.match(/<select\b[^>]*>/i)?.[0]||'').name||'';
 const options=[...participant.body.matchAll(/<option\b[^>]*>/gi)].map(m=>attrs(m[0]).value).filter(Boolean);
 if(!name.startsWith('q'+participant.qid+'_')||options.length!==9||
    options.some((x,i)=>plain(x)!==manifest.roster[i]))throw Error('SCHEDULED_PUBLIC_ROSTER_MISMATCH');
 const games=[];
 for(const row of rows){
  const label=labels(row.body).map(gameText).find(Boolean);
  const staticText=textNodes(row.body).find(x=>gameText(x));
  const match=label||gameText(staticText||'');
  if(!match)continue;
  const [,order,away,home]=match;
  const id='G'+order,matchup=away.toUpperCase()+' @ '+home.toUpperCase();
  const game=manifest.games[games.length];
  if(!game||game.id!==id||game.matchup!==matchup||id!=='G'+String(games.length+1).padStart(2,'0')||
     row.qid===participant.qid||games.some(g=>g.question===row.qid))
    throw Error('SCHEDULED_PUBLIC_GAME_MAP_MISMATCH');
  const prefix='q'+row.qid+'_';
  const controls=inputs(row.body);
  const result={id,question:row.qid,visitor:[game.away_name,game.away],home:[game.home_name,game.home]};
  if(game.fixed_pick==='GB'){
   const expected=game.away==='GB'||game.home==='GB';
   // The real Card form renders G01 as display-only text: no submitted
   // question input. It is safe because the backend sets GB from the contract.
   const readOnly=controls.length===1 && /<input\b[^>]*\sreadonly(?=\s|[=>/])/i.test(row.body) &&
      controls[0].name?.startsWith(prefix)&&/^GB$/i.test(controls[0].value||'');
   const displayOnly=row.type==='control_text'&&controls.length===0&&staticText&&
      /:\s*(?:PACKERS\s+)?GB\s*$/i.test(plain(staticText));
   if(!expected||!readOnly&&!displayOnly)throw Error('SCHEDULED_PUBLIC_FIXED_GB_INVALID');
   result.field=readOnly?controls[0].name.slice(prefix.length):'staticFixed'+id;
   result.fixed_default='GB';result.readonly_verified=true;
  }else{
   if(game.away==='GB'||game.home==='GB'||row.type!=='control_radio'||
      controls.length!==2||controls.some(x=>x.type!=='radio'||!x.name?.startsWith(prefix))||
      controls.some(x=>x.name!==controls[0].name)||
      plain(controls[0].value||'')!==game.away_name||plain(controls[1].value||'')!==game.home_name)
      throw Error('SCHEDULED_PUBLIC_TEAM_OPTIONS_INVALID');
   result.field=controls[0].name.slice(prefix.length);
  }
  games.push(result);
 }
 if(games.length!==manifest.games.length)throw Error('SCHEDULED_PUBLIC_QID_COUNT_OR_ORDER');
 return {participantQuestion:participant.qid,games};
}
