import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Shell} from '../components/Shell';
import {RemoteAsset} from '../components/RemoteAsset';
import {brand} from '../brand';
import type {VideoSpec} from '../types';

export const Breaking: React.FC<{spec: VideoSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const bar = interpolate(frame, [0, fps * .5], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <Shell footer={spec.sourceLabel ? `FUENTE: ${spec.sourceLabel}` : 'BREAKING · INFORMACIÓN CONFIRMADA ANTES QUE VELOCIDAD'}>
      <RemoteAsset src={spec.assetUrl} />
      <div style={{position: 'relative', zIndex: 2, width: spec.assetUrl ? '61.8%' : '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
        <div style={{fontSize: 28, fontWeight: 900, color: brand.cheeseGold, marginBottom: 24}}>{spec.kicker || 'BREAKING NEWS'}</div>
        <div style={{height: 8, width: `${bar * 280}px`, backgroundColor: brand.cheeseGold, marginBottom: 34}} />
        <div style={{fontFamily: 'Bebas Neue, sans-serif', fontSize: 118, lineHeight: .96, maxWidth: 860, whiteSpace: 'pre-line'}}>{spec.headline}</div>
        {spec.subheadline ? <div style={{fontSize: 34, lineHeight: 1.3, marginTop: 30, maxWidth: 790}}>{spec.subheadline}</div> : null}
        {spec.cta ? <div style={{fontSize: 26, fontWeight: 900, color: brand.cheeseGold, marginTop: 40}}>{spec.cta}</div> : null}
      </div>
    </Shell>
  );
};
