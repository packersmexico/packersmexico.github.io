import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {Shell} from '../components/Shell';
import {RemoteAsset} from '../components/RemoteAsset';
import {brand} from '../brand';
import type {VideoScene, VideoSpec} from '../types';

const legacyAnalysis = (spec: VideoSpec, frame: number, fps: number) => {
  const y = interpolate(frame, [0, fps * 0.7], [34, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const opacity = interpolate(frame, [0, fps * 0.35], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <Shell footer={null}>
      <RemoteAsset src={spec.assetUrl} />
      <div style={{position: 'relative', zIndex: 2, width: spec.assetUrl ? '61.8%' : '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', transform: `translateY(${y}px)`, opacity}}>
        <div style={{fontSize: 29, fontWeight: 900, color: brand.cheeseGold, marginBottom: 26, letterSpacing: .5}}>{spec.kicker || 'ANÁLISIS'}</div>
        <div style={{fontFamily: 'Bebas Neue, sans-serif', fontSize: spec.mode === 'HOOK' ? 132 : 112, lineHeight: .94, whiteSpace: 'pre-line', maxWidth: 850}}>{spec.headline}</div>
        {spec.subheadline ? <div style={{fontSize: 34, lineHeight: 1.25, marginTop: 30, maxWidth: 800}}>{spec.subheadline}</div> : null}
        {spec.body && spec.mode === 'HERO' ? <div style={{fontSize: 29, lineHeight: 1.42, marginTop: 28, maxWidth: 800, color: brand.muted}}>{spec.body}</div> : null}
      </div>
    </Shell>
  );
};

const SceneBody: React.FC<{scene: VideoScene; enter: number; progress: number}> = ({scene, enter, progress}) => {
  const hasAsset = Boolean(scene.assetUrl);
  const width = hasAsset ? '61.8%' : '100%';
  const items = scene.insights?.slice(0, 3) ?? [];
  return (
    <>
      <RemoteAsset src={scene.assetUrl} />
      <div style={{position:'relative',zIndex:2,width,height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',paddingBottom:360,boxSizing:'border-box',opacity:enter,transform:`translateY(${interpolate(enter,[0,1],[-112,-140])}px)`}}>
        <div style={{fontSize:25,fontWeight:900,color:brand.cheeseGold,letterSpacing:.7,marginBottom:18}}>{scene.kicker || 'ANÁLISIS'}</div>
        <div style={{height:4,width:144,background:brand.cheeseGold,marginBottom:34}} />
        <div style={{fontFamily:'Bebas Neue, sans-serif',fontSize:scene.type === 'HOOK' || scene.type === 'OUTRO' ? 112 : 100,lineHeight:.94,maxWidth:hasAsset ? 620 : 900,whiteSpace:'pre-line'}}>{scene.title}</div>
        {scene.support ? <div style={{fontFamily:'Bebas Neue, sans-serif',fontSize:40,lineHeight:1.05,color:brand.cheeseGold,marginTop:22,maxWidth:hasAsset ? 620 : 900}}>{scene.support}</div> : null}
        {scene.body ? <div style={{fontSize:26,lineHeight:1.38,color:brand.cream,marginTop:28,maxWidth:hasAsset ? 620 : 880}}>{scene.body}</div> : null}
        {items.length ? (
          <div style={{marginTop:34,maxWidth:hasAsset ? 620 : 900}}>
            {items.map((item,index)=>(
              <div key={index} style={{display:'grid',gridTemplateColumns:'185px 1fr',gap:21,borderTop:`2px solid rgba(255,198,47,${index === 0 ? .62 : .22})`,padding:'18px 0'}}>
                <div style={{fontSize:22,fontWeight:900,color:brand.cheeseGold}}>{item.label}</div>
                <div style={{fontSize:22,lineHeight:1.3,color:brand.muted}}>{item.text}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {scene.assetCredit ? <div style={{position:'absolute',right:0,bottom:24,zIndex:5,fontSize:15,fontWeight:700,color:'rgba(242,232,207,.78)',textAlign:'right',maxWidth:430}}>{scene.assetCredit}</div> : null}
      <div style={{position:'absolute',left:0,right:0,bottom:8,height:4,background:'rgba(242,232,207,.14)',zIndex:4}}>
        <div style={{height:'100%',width:`${progress*100}%`,background:brand.cheeseGold}} />
      </div>
    </>
  );
};

export const Analysis: React.FC<{spec: VideoSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (!spec.scenes?.length) return legacyAnalysis(spec, frame, fps);
  const t = frame / fps;
  const scenes = spec.scenes;
  const scene = scenes.find((item) => t >= item.start && t < item.end) ?? scenes[scenes.length - 1];
  const localFrame = Math.max(0, frame - Math.round(scene.start * fps));
  const enterFrames = Math.min(fps * .45, Math.max(1, (scene.end - scene.start) * fps * .14));
  const enter = interpolate(localFrame,[0,enterFrames],[0,1],{extrapolateRight:'clamp',easing:Easing.out(Easing.cubic)});
  const progress = Math.min(1, Math.max(0, t / Math.max(.01, spec.durationSeconds)));
  return (
    <Shell footer={null}>
      <SceneBody scene={scene} enter={enter} progress={progress} />
    </Shell>
  );
};
