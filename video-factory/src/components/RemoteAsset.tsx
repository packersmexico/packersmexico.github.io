import React from 'react';
import {Img, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

export const RemoteAsset: React.FC<{src?: string}> = ({src}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (!src) return null;
  const cycle = Math.max(1, fps * 12);
  const scale = interpolate(frame % cycle, [0, cycle], [1.02, 1.09], {extrapolateRight:'clamp'});
  return (
    <div style={{position: 'absolute', right: 0, top: 0, width: '43%', height: '100%', overflow: 'hidden'}}>
      <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(.9) contrast(1.06)', transform:`scale(${scale})`, transformOrigin:'center center'}} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #081D13 0%, rgba(8,29,19,.34) 52%, rgba(8,29,19,.08) 100%)'}} />
    </div>
  );
};
