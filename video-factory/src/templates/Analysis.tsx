import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {Shell} from '../components/Shell';
import {RemoteAsset} from '../components/RemoteAsset';
import {brand} from '../brand';
import type {VideoSpec} from '../types';

export const Analysis: React.FC<{spec: VideoSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const y = interpolate(frame, [0, fps * 0.7], [34, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const opacity = interpolate(frame, [0, fps * 0.35], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <Shell footer={spec.sourceLabel ? `FUENTE / BASE: ${spec.sourceLabel}` : undefined}>
      <RemoteAsset src={spec.assetUrl} />
      <div style={{position: 'relative', zIndex: 2, width: spec.assetUrl ? '61.8%' : '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', transform: `translateY(${y}px)`, opacity}}>
        <div style={{fontSize: 29, fontWeight: 900, color: brand.cheeseGold, marginBottom: 26, letterSpacing: .5}}>{spec.kicker || 'LAMBEAU INSIGHT · ANÁLISIS'}</div>
        <div style={{fontFamily: 'Bebas Neue, sans-serif', fontSize: spec.mode === 'HOOK' ? 132 : 112, lineHeight: .94, whiteSpace: 'pre-line', maxWidth: 850}}>{spec.headline}</div>
        {spec.subheadline ? <div style={{fontSize: 34, lineHeight: 1.25, marginTop: 30, maxWidth: 800}}>{spec.subheadline}</div> : null}
        {spec.body && spec.mode === 'HERO' ? <div style={{fontSize: 29, lineHeight: 1.42, marginTop: 28, maxWidth: 800, color: brand.muted}}>{spec.body}</div> : null}
        {spec.cta ? <div style={{marginTop: 38, fontSize: 28, fontWeight: 900, color: brand.cheeseGold}}>{spec.cta}</div> : null}
      </div>
    </Shell>
  );
};
