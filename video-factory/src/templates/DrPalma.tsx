import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {brand} from '../brand';
import type {VideoScene, VideoSpec} from '../types';

const PhotoLayer: React.FC<{scene: VideoScene}> = ({scene}) => {
  if (!scene.assetUrl) return null;
  return (
    <>
      <Img src={scene.assetUrl} style={{position:'absolute',right:0,top:0,width:'58%',height:'100%',objectFit:'cover',objectPosition:'center',filter:'saturate(.96) contrast(1.10) brightness(.96)'}} />
      <div style={{position:'absolute',inset:0,background:'linear-gradient(90deg, rgba(13,45,32,.99) 0%, rgba(13,45,32,.96) 43%, rgba(13,45,32,.50) 69%, rgba(13,45,32,.16) 100%)'}} />
      {scene.assetCredit ? <div style={{position:'absolute',right:34,top:150,maxWidth:430,textAlign:'right',color:'rgba(242,232,207,.78)',fontSize:16,fontWeight:800,textShadow:'0 2px 8px rgba(0,0,0,.8)'}}>{scene.assetCredit}</div> : null}
    </>
  );
};

const fallbackScene = (spec: VideoSpec): VideoScene => ({
  id: 'fallback',
  start: 0,
  end: spec.durationSeconds,
  type: 'ANALYSIS',
  title: spec.headline,
  kicker: spec.kicker || 'LA OPINIÓN DEL DR PALMA',
  support: spec.subheadline,
  body: spec.body,
});

const SceneHeader: React.FC<{right: string}> = ({right}) => (
  <>
    <Img src={staticFile(brand.logo)} style={{position:'absolute',left:64,top:54,width:280,height:70,objectFit:'contain'}} />
    <div style={{position:'absolute',right:64,top:72,width:390,textAlign:'right',color:brand.cheeseGold,fontSize:18,fontWeight:700}}>
      {right}
    </div>
  </>
);

const SeriesFooter: React.FC<{progress: number; label: string}> = ({progress, label}) => (
  <>
    <div style={{position:'absolute',left:64,top:1710,color:brand.cheeseGold,fontSize:22,fontWeight:900}}>
      DR PALMA · ANÁLISIS PMX
    </div>
    <div style={{position:'absolute',left:64,right:64,top:1748,height:4,background:'rgba(242,232,207,.16)'}}>
      <div style={{height:'100%',width:`${progress * 100}%`,background:brand.cheeseGold}} />
    </div>
    <div style={{position:'absolute',left:64,top:1782,color:brand.cream,fontSize:20,fontWeight:800,letterSpacing:.7}}>
      LA OPINIÓN DEL DR PALMA · {label}
    </div>
  </>
);

const InsightStack: React.FC<{scene: VideoScene; top: number}> = ({scene, top}) => {
  const items = scene.insights?.slice(0, 3) ?? [];
  if (!items.length) return null;
  return (
    <div style={{position:'absolute',left:64,width:610,top,display:'flex',flexDirection:'column',gap:18}}>
      {items.map((item, index) => (
        <div key={index} style={{position:'relative',background:'rgba(8,29,19,.72)',border:'1px solid rgba(213,169,40,.34)',borderRadius:18,padding:'18px 22px 18px 36px',minHeight:104}}>
          <div style={{position:'absolute',left:0,top:0,bottom:0,width:10,background:brand.cheeseGold,borderTopLeftRadius:28,borderBottomLeftRadius:28}} />
          <div style={{color:brand.cheeseGold,fontSize:28,fontWeight:900,marginBottom:8}}>{item.label}</div>
          <div style={{color:brand.cream,fontSize:31,lineHeight:1.22,fontWeight:700}}>{item.text}</div>
        </div>
      ))}
    </div>
  );
};

const HookLayout: React.FC<{scene: VideoScene; enter: number}> = ({scene, enter}) => (
  <div style={{opacity:enter,transform:`translateY(${interpolate(enter,[0,1],[20,0])}px)`}}>
    <div style={{position:'absolute',left:70,top:210,width:620,color:brand.cheeseGold,fontSize:30,fontWeight:900,letterSpacing:1}}>
      {scene.kicker || 'LA OPINIÓN DEL DR PALMA'}
    </div>
    <div style={{position:'absolute',left:70,top:270,width:610,height:6,background:brand.cheeseGold}} />
    <div style={{position:'absolute',left:70,top:340,width:650,color:brand.cream,fontFamily:'Bebas Neue, sans-serif',fontSize:156,lineHeight:.88,letterSpacing:.4}}>
      {scene.title}
    </div>
    {scene.support ? <div style={{position:'absolute',left:72,top:785,width:610,color:brand.cheeseGold,fontFamily:'Bebas Neue, sans-serif',fontSize:46,lineHeight:1}}>{scene.support}</div> : null}
    {scene.body ? <div style={{position:'absolute',left:72,top:875,width:580,color:brand.cream,fontSize:30,lineHeight:1.28,fontWeight:750}}>{scene.body}</div> : null}
  </div>
);

const MatchupLayout: React.FC<{scene: VideoScene; enter: number}> = ({scene, enter}) => (
  <div style={{opacity:enter,transform:`translateY(${interpolate(enter,[0,1],[28,0])}px)`}}>
    <div style={{position:'absolute',left:64,top:190,width:610,color:brand.cheeseGold,fontSize:32,fontWeight:800}}>
      {scene.kicker || 'MATCHUP CLAVE'}
    </div>
    <div style={{position:'absolute',left:64,top:220,width:952,height:4,background:brand.cheeseGold}} />
    <div style={{position:'absolute',left:64,top:320,width:650,color:brand.cream,fontFamily:'Bebas Neue, sans-serif',fontSize:142,lineHeight:.90}}>
      {scene.title}
    </div>
    {scene.support ? <div style={{position:'absolute',left:64,top:680,width:620,color:brand.cheeseGold,fontFamily:'Bebas Neue, sans-serif',fontSize:36,lineHeight:1.05}}>{scene.support}</div> : null}
    <div style={{position:'absolute',left:64,top:760,width:620,height:5,background:brand.cheeseGold}} />
    <div style={{position:'absolute',left:64,top:810,width:420,color:brand.cheeseGold,fontSize:20,fontWeight:800}}>LECTURA DR PALMA</div>
    {scene.body ? <div style={{position:'absolute',left:64,top:860,width:600,color:brand.cream,fontSize:32,lineHeight:1.27,fontWeight:700}}>{scene.body}</div> : null}
    <InsightStack scene={scene} top={1040} />
  </div>
);

const TakeLayout: React.FC<{scene: VideoScene; enter: number}> = ({scene, enter}) => (
  <div style={{opacity:enter,transform:`translateY(${interpolate(enter,[0,1],[28,0])}px)`}}>
    <div style={{position:'absolute',left:64,top:190,width:610,color:brand.cheeseGold,fontSize:32,fontWeight:800}}>
      {scene.kicker || 'TAKE · DR PALMA'}
    </div>
    <div style={{position:'absolute',left:64,top:220,width:952,height:4,background:brand.cheeseGold}} />
    <div style={{position:'absolute',left:64,top:315,width:650,color:brand.cream,fontFamily:'Bebas Neue, sans-serif',fontSize:126,lineHeight:.92}}>
      {scene.title}
    </div>
    {scene.support ? <div style={{position:'absolute',left:66,top:670,width:620,color:brand.cheeseGold,fontSize:34,fontWeight:900}}>{scene.support}</div> : null}
    {scene.body ? <div style={{position:'absolute',left:66,top:760,width:600,color:brand.cream,fontSize:33,lineHeight:1.28,fontWeight:700}}>{scene.body}</div> : null}
    <InsightStack scene={scene} top={980} />
  </div>
);

export const DrPalma: React.FC<{spec: VideoSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const scenes = spec.scenes?.length ? spec.scenes : [fallbackScene(spec)];
  const scene = scenes.find((item) => t >= item.start && t < item.end) ?? scenes[scenes.length - 1];
  const localFrame = Math.max(0, frame - Math.round(scene.start * fps));
  const enter = interpolate(localFrame,[0,Math.min(fps*.45,Math.max(1,(scene.end-scene.start)*fps*.12))],[0,1],{
    extrapolateRight:'clamp',
    easing:Easing.out(Easing.cubic),
  });
  const progress = Math.min(1,Math.max(0,t / Math.max(.01,spec.durationSeconds)));
  const headerLabel = spec.destinationLabel || 'WEEK 2 · 2026';
  const footerLabel = headerLabel.replace(' · 2026','');

  return (
    <AbsoluteFill style={{background:brand.fieldDark,color:brand.cream,fontFamily:'Montserrat, sans-serif',overflow:'hidden'}}>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 82% 18%, rgba(242,232,207,.11), transparent 29%), repeating-linear-gradient(18deg, rgba(242,232,207,.025) 0 2px, transparent 2px 10px), linear-gradient(145deg, #0D2D20 0%, #173C2C 54%, #254D3A 100%)'}} />
      <PhotoLayer scene={scene} />
      <SceneHeader right={scene.type === 'OUTRO' ? `CIERRE · ${footerLabel}` : headerLabel} />
      {scene.type === 'HOOK' || scene.type === 'OUTRO'
        ? <HookLayout scene={scene} enter={enter} />
        : scene.type === 'MATCHUP'
          ? <MatchupLayout scene={scene} enter={enter} />
          : <TakeLayout scene={scene} enter={enter} />}
      <SeriesFooter progress={progress} label={footerLabel} />
    </AbsoluteFill>
  );
};
