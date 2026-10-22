import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {brand} from '../brand';

export const Shell: React.FC<React.PropsWithChildren<{footer?: string | null}>> = ({children, footer}) => {
  return (
    <AbsoluteFill style={{backgroundColor: brand.fieldDark, color: brand.cream, fontFamily: 'Montserrat, sans-serif'}}>
      <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${brand.fieldDark} 0%, ${brand.lambeauGreen} 100%)`}} />
      <div style={{position: 'absolute', top: 72, left: 64, right: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <Img src={staticFile(brand.logo)} style={{width: 270, height: 'auto'}} />
        <div style={{fontSize: 22, fontWeight: 800, color: brand.cheeseGold, letterSpacing: 1}}>PACKERS MÉXICO</div>
      </div>
      <div style={{position: 'absolute', left: 64, right: 64, top: 170, bottom: footer ? 150 : 96}}>{children}</div>
      {footer ? (
        <div style={{position: 'absolute', left: 64, right: 64, bottom: 66, borderTop: `3px solid ${brand.cheeseGold}`, paddingTop: 20, fontSize: 20, fontWeight: 700, color: brand.muted}}>
          {footer}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
