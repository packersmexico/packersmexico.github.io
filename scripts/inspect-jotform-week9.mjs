// Read-only inspection of publicly displayed Jotform field IDs. No submissions or secrets.
import fs from 'node:fs';
const src=fs.readFileSync(process.argv[2]||'/tmp/pmx-week09-form.html','utf8');
if(src.length<1000)throw Error('EMPTY_JOTFORM_HTML');
const matches=[...src.matchAll(/<[^>]*(?:name=["']q(\d+)_([^"' ]+)["']|id=["']input_(\d+)["'])[^>]*>/gi)];
const unique=new Map();
for(const m of matches){const id=m[1]||m[3];if(!id)continue;const v=unique.get(id)||{id,names:[]};if(m[2]&&!v.names.includes(m[2]))v.names.push(m[2]);unique.set(id,v);}
const rows=[...unique.values()].sort((a,b)=>Number(a.id)-Number(b.id));
for(const x of rows){const i=src.indexOf('input_'+x.id);const context=src.slice(Math.max(0,i-1500),i+400).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(-260);console.log(JSON.stringify({question_id:x.id,names:x.names,context}));}
console.log('HTML_BYTES',src.length,'FIELDS',rows.length,'LABEL_MARKERS',(src.match(/G\d{2}\s*[·-]/gi)||[]).length);
if(rows.length<15||!src.includes('G15'))throw Error('W09_PUBLIC_FORM_FIELD_IDS_UNRESOLVED');