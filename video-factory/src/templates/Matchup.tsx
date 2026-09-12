import React from 'react';
import {Shell} from '../components/Shell';
import {RemoteAsset} from '../components/RemoteAsset';
import {brand} from '../brand';
import type {VideoSpec} from '../types';

export const Matchup: React.FC<{spec: VideoSpec}> = ({spec}) => {
  return (
    <Shell footer={spec.destinationLabel ? `DESTINO: ${spec.destinationLabel}` : 'MATCHUP · PACKERS MÉXICO'}>
      <RemoteAsset src={spec.assetUrl} />
      <div style={{position: 'relative', zIndex: 2, width: spec.assetUrl ? '61.8%' : '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
        <div style={{fontSize: 28, color: brand.cheeseGold, fontWeight: 900, marginBottom: 28}}>{spec.kicker || 'MATCHUP · GAME DAY'}</div>
        <div style={{fontFamily: 'Bebas Neue, sans-serif', fontSize: 124, lineHeight: .92, whiteSpace: 'pre-line'}}>{spec.headline}</div>
        {spec.subheadline ? <div style={{fontSize: 36, marginTop: 34, lineHeight: 1.25}}>{spec.subheadline}</div> : null}
        {spec.body ? <div style={{fontSize: 28, marginTop: 28, color: brand.muted, lineHeight: 1.4}}>{spec.body}</div> : null}
        {spec.cta ? <div style={{marginTop: 40, paddingTop: 24, borderTop: `4px solid ${brand.cheeseGold}`, color: brand.cheeseGold, fontSize: 28, fontWeight: 900}}>{spec.cta}</div> : null}
      </div>
    </Shell>
  );
};
