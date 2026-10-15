const W6_GAMES = Object.freeze([
  {id:'G01',field:'q3_radio1',question:'3',visitor:['SEATTLE SEAHAWKS','SEA'],home:['DENVER BRONCOS','DEN']},
  {id:'G02',field:'q4_radio2',question:'4',visitor:['HOUSTON TEXANS','HOU'],home:['JACKSONVILLE JAGUARS','JAX']},
  {id:'G03',field:'q5_radio3',question:'5',visitor:['CHICAGO BEARS','CHI'],home:['ATLANTA FALCONS','ATL']},
  {id:'G04',field:'q6_radio4',question:'6',visitor:['BALTIMORE RAVENS','BAL'],home:['CLEVELAND BROWNS','CLE']},
  {id:'G05',field:'q7_radio5',question:'7',visitor:['TENNESSEE TITANS','TEN'],home:['INDIANAPOLIS COLTS','IND']},
  {id:'G06',field:'q8_radio6',question:'8',visitor:['NEW YORK JETS','NYJ'],home:['NEW ENGLAND PATRIOTS','NE']},
  {id:'G07',field:'q9_radio7',question:'9',visitor:['NEW ORLEANS SAINTS','NO'],home:['NEW YORK GIANTS','NYG']},
  {id:'G08',field:'q10_radio8',question:'10',visitor:['CAROLINA PANTHERS','CAR'],home:['PHILADELPHIA EAGLES','PHI']},
  {id:'G09',field:'q11_radio9',question:'11',visitor:['PITTSBURGH STEELERS','PIT'],home:['TAMPA BAY BUCCANEERS','TB']},
  {id:'G10',field:'q12_radio10',question:'12',visitor:['ARIZONA CARDINALS','AZ'],home:['LOS ÁNGELES RAMS','LAR']},
  {id:'G11',field:'q13_radio11',question:'13',visitor:['LOS ANGELES CHARGERS','LAC'],home:['KANSAS CITY CHIEFS','KC']},
  {id:'G12',field:'q14_radio12',question:'14',visitor:['BUFFALO BILLS','BUF'],home:['LAS VEGAS RAIDERS','LV']},
  {id:'G13',field:'q15_radio13',question:'15',visitor:['DALLAS COWBOYS','DAL'],home:['GREEN BAY PACKERS','GB']},
  {id:'G14',field:'q16_radio14',question:'16',visitor:['WASHINGTON COMMANDERS','WAS'],home:['SAN FRANCISCO 49ERS','SF']}
]);

export function normalizeText(value){
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .trim().replace(/\s+/g,' ').toUpperCase();
}

export function bodyToObject(body){
  if(!body) return {};
  if(typeof body==='object') return body;
  if(typeof body==='string') return Object.fromEntries(new URLSearchParams(body));
  return {};
}

export function parseRawRequest(value){
  if(value && typeof value==='object') return value;
  if(typeof value==='string'){
    try { const out=JSON.parse(value); return out && typeof out==='object' ? out : {}; }
    catch { return Object.fromEntries(new URLSearchParams(value)); }
  }
  return {};
}

function unwrap(value){
  if(Array.isArray(value)) return value.length===1 ? unwrap(value[0]) : value.map(unwrap).join(' ');
  if(value && typeof value==='object'){
    for(const key of ['answer','value','text']) if(typeof value[key]==='string') return value[key];
  }
  return typeof value==='string' || typeof value==='number' ? String(value) : '';
}

export function resolveParticipant(raw, roster){
  const rosterMap=new Map([...roster].map(name=>[normalizeText(name),normalizeText(name)]));
  const directKeys=['q2_dropdown0','2','participant','Participante'];
  for(const key of directKeys){
    const n=normalizeText(unwrap(raw?.[key]));
    if(rosterMap.has(n)) return rosterMap.get(n);
  }
  const found=new Set();
  for(const value of Object.values(raw||{})){
    const n=normalizeText(unwrap(value));
    if(rosterMap.has(n)) found.add(rosterMap.get(n));
  }
  return found.size===1 ? [...found][0] : null;
}

function mapPick(raw,spec){
  const candidates=[raw?.[spec.field],raw?.[spec.question]];
  let value='';
  for(const candidate of candidates){ value=normalizeText(unwrap(candidate)); if(value) break; }
  if(!value) return null;
  const visitor=normalizeText(spec.visitor[0]);
  const home=normalizeText(spec.home[0]);
  if(value===visitor || value===normalizeText(spec.visitor[1])) return spec.visitor[1];
  if(value===home || value===normalizeText(spec.home[1])) return spec.home[1];
  return null;
}

export function validateWeek6Submission(raw){
  const picks={};
  const invalid=[];
  for(const game of W6_GAMES){
    const pick=mapPick(raw,game);
    if(!pick) invalid.push(game.id); else picks[game.id]=pick;
  }
  return {valid:invalid.length===0 && Object.keys(picks).length===14,picks,missing_or_invalid:invalid};
}

export const week6Games=W6_GAMES;
