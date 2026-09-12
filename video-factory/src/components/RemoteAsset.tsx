import React from 'react';
import {Img} from 'remotion';

export const RemoteAsset: React.FC<{src?: string}> = ({src}) => {
  if (!src) return null;
  return (
    <div style={{position: 'absolute', right: 0, top: 0, width: '43%', height: '100%', overflow: 'hidden'}}>
      <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(.92) contrast(1.05)'}} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #081D13 0%, rgba(8,29,19,.25) 55%, rgba(8,29,19,.05) 100%)'}} />
    </div>
  );
};
