import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {brand} from '../brand';
import type {VideoScene, VideoSpec} from '../types';

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
    <Img src={staticFile(brand.logo)} style={{position: 'absolute', left: 64, top: 55, width: 220, height: 55, objectFit: 'contain'}} />
    <div style={{position: 'absolute', right: 65, top: 68, width: 290, textAlign: 'right', color: brand.cheeseGold, fontSize: 18, fontWeight: 700}}>
      {right}
    </div>
  </>
);

const SeriesFooter: React.FC<{progress: number}> = ({progress}) => (
  <>
    <div style={{position: 'absolute', left: 64, top: 1416, color: brand.cheeseGold, fontSize: 21, fontWeight: 800}}>
      DR PALMA · ANÁLISIS PMX
    </div>
    <div style={{position: 'absolute', left: 64, right: 64, top: 1548, height: 3, background: 'rgba(242,232,207,.16)'}}>
      <div style={{height: '100%', width: `${progress * 100}%`, background: brand.cheeseGold}} />
    </div>
    <div style={{position: 'absolute', left: 64, top: 1584, color: brand.muted, fontSize: 20, fontWeight: 700, letterSpacing: 0.7}}>
      LA OPINIÓN DEL DR PALMA · WEEK 2
    </div>
  </>
);

const InsightStack: React.FC<{scene: VideoScene; top: number}> = ({scene, top}) => {
  const items = scene.insights?.slice(0, 3) ?? [];
  if (!items.length) return null;
  return (
    <div style={{position:'absolute',left:64,right:64,top,display:'flex',flexDirection:'column',gap:18}}>
      {items.map((item, index) => (
        <div key={index} style={{position:'relative',background:'rgba(18,59,49,.92)',border:'1px solid rgba(255,198,47,.18)',borderRadius:28,padding:'22px 28px 22px 44px',minHeight:118}}>
          <div style={{position:'absolute',left:0,top:0,bottom:0,width:10,background:brand.cheeseGold,borderTopLeftRadius:28,borderBottomLeftRadius:28}} />
          <div style={{color:brand.cheeseGold,fontSize:24,fontWeight:900,marginBottom:8}}>{item.label}</div>
          <div style={{color:brand.cream,fontSize:25,lineHeight:1.35}}>{item.text}</div>
        </div>
      ))}
    </div>
  );
};

const HookLayout: React.FC<{scene: VideoScene; enter: number}> = ({scene, enter}) => (
  <div style={{opacity: enter, transform: `translateY(${interpolate(enter,[0,1],[28,0])}px)`}}>
    <div style={{position: 'absolute', left: 64, top: 160, width: 760, color: brand.cheeseGold, fontSize: 24, fontWeight: 800}}>
      {scene.kicker || 'LA OPINIÓN DEL DR PALMA'}
    </div>
    <div style={{position: 'absolute', left: 64, top: 220, width: 952, height: 4, background: brand.cheeseGold}} />
    <div style={{position: 'absolute', left: 64, top: 300, width: 760, color: brand.cream, fontFamily: 'Bebas Neue, sans-serif', fontSize: 108, lineHeight: 1.0}}>
      {scene.title}
    </div>
    {scene.support ? <div style={{position:'absolute',left:66,top:575,width:620,color:brand.cream,fontSize:25,fontWeight:700}}>{scene.support}</div> : null}
    {scene.body ? <div style={{position:'absolute',left:66,top:645,width:700,color:brand.cream,fontSize:30,lineHeight:1.32}}>{scene.body}</div> : null}
  </div>
);

const MatchupLayout: React.FC<{scene: VideoScene; enter: number}> = ({scene, enter}) => (
  <div style={{opacity: enter, transform: `translateY(${interpolate(enter,[0,1],[28,0])}px)`}}>
    <div style={{position: 'absolute', left: 64, top: 160, width: 620, color: brand.cheeseGold, fontSize: 23, fontWeight: 800}}>
      {scene.kicker || 'MATCHUP CLAVE'}
    </div>
    <div style={{position: 'absolute', left: 64, top: 220, width: 952, height: 4, background: brand.cheeseGold}} />
    <div style={{position: 'absolute', left: 64, top: 300, width: 820, color: brand.cream, fontFamily: 'Bebas Neue, sans-serif', fontSize: 118, lineHeight: .95}}>
      {scene.title}
    </div>
    {scene.support ? <div style={{position:'absolute',left:64,top:510,width:820,color:brand.cheeseGold,fontFamily:'Bebas Neue, sans-serif',fontSize:48,lineHeight:1.0}}>{scene.support}</div> : null}
    <div style={{position:'absolute',left:64,top:650,width:952,height:4,background:brand.cheeseGold}} />
    <div style={{position:'absolute',left:64,top:710,width:420,color:brand.cheeseGold,fontSize:20,fontWeight:800}}>LECTURA DR PALMA</div>
    {scene.body ? <div style={{position:'absolute',left:64,top:765,width:840,color:brand.cream,fontSize:30,lineHeight:1.36}}>{scene.body}</div> : null}
    <div style={{position:'absolute',left:64,top:1125,width:650,color:brand.muted,fontSize:18,fontWeight:700}}>ANÁLISIS · CONTEXTO · OPINIÓN</div>
  </div>
);

const TakeLayout: React.FC<{scene: VideoScene; enter: number}> = ({scene, enter}) => (
  <div style={{opacity: enter, transform: `translateY(${interpolate(enter,[0,1],[28,0])}px)`}}>
    <div style={{position:'absolute',left:64,top:160,width:560,color:brand.cheeseGold,fontSize:23,fontWeight:800}}>{scene.kicker || 'TAKE · DR PALMA'}</div>
    <div style={{position:'absolute',left:64,top:220,width:952,height:4,background:brand.cheeseGold}} />
    <div style={{position:'absolute',left:64,top:310,width:900,color:brand.cream,fontFamily:'Bebas Neue, sans-serif',fontSize:104,lineHeight:.96}}>{scene.title}</div>
    {scene.support ? <div style={{position:'absolute',left:66,top:540,width:780,color:brand.cheeseGold,fontSize:25,fontWeight:800}}>{scene.support}</div> : null}
    {scene.body ? <div style={{position:'absolute',left:66,top:610,width:790,color:brand.cream,fontSize:30,lineHeight:1.38}}>{scene.body}</div> : null}
    <div style={{position:'absolute',left:64,top:865,width:8,height:240,background:brand.cheeseGold}} />
    <div style={{position:'absolute',left:105,top:900,width:770,color:brand.cream,fontSize:34,lineHeight:1.28,fontWeight:800}}>
      {scene.type === 'PACKERS_NOTE' ? '“Cautela: el análisis vale más que forzar una apuesta.”' : '“Espero un partido de perfil más defensivo.”'}
    </div>
    <div style={{position:'absolute',left:64,top:1190,width:650,color:brand.cheeseGold,fontSize:19,fontWeight:800}}>OPINIÓN / ANÁLISIS · NO HECHO</div>
  </div>
);

export const DrPalma: React.FC<{spec: VideoSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const scenes = spec.scenes?.length ? spec.scenes : [fallbackScene(spec)];
  const scene = scenes.find((item) => t >= item.start && t < item.end) ?? scenes[scenes.length - 1];
  const localFrame = Math.max(0, frame - Math.round(scene.start * fps));
  const enter = interpolate(localFrame, [0, Math.min(fps * .45, Math.max(1,(scene.end-scene.start)*fps*.12))], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const progress = Math.min(1, Math.max(0, t / Math.max(.01, spec.durationSeconds)));

  return (
    <AbsoluteFill style={{background: brand.fieldDark, color: brand.cream, fontFamily: 'Montserrat, sans-serif', overflow:'hidden'}}>
      <div style={{position:'absolute',inset:0,background:`linear-gradient(180deg, ${brand.fieldDark} 0%, ${brand.fieldDark} 70%, ${brand.lambeauGreen} 100%)`}} />
      <SceneHeader right={scene.type === 'OUTRO' ? 'CIERRE · WEEK 2' : 'WEEK 2 · 2026'} />
      {scene.type === 'HOOK' || scene.type === 'OUTRO'
        ? <HookLayout scene={scene} enter={enter} />
        : scene.type === 'MATCHUP'
          ? <MatchupLayout scene={scene} enter={enter} />
          : <TakeLayout scene={scene} enter={enter} />}
      <SeriesFooter progress={progress} />
    </AbsoluteFill>
  );
};
