import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {brand} from '../brand';
import type {CaptionCue} from '../types';

export const CaptionLayer: React.FC<{cues?: CaptionCue[]}> = ({cues = []}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const cue = cues.find((c) => t >= c.start && t < c.end);
  if (!cue) return null;
  return (
    <div style={{position:'absolute',left:72,right:72,top:1320,height:320,display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',fontFamily:'Montserrat, sans-serif',fontSize:45,lineHeight:1.22,fontWeight:900,color:brand.cream,textShadow:'0 3px 12px rgba(0,0,0,.92)'}}>
      <span style={{background:'rgba(8,29,19,.94)',boxDecorationBreak:'clone',WebkitBoxDecorationBreak:'clone',padding:'14px 18px',borderBottom:'5px solid #D5A928'}}>{cue.text}</span>
    </div>
  );
};
