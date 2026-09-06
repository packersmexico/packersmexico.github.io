import React from 'react';
import {AbsoluteFill, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Video} from '@remotion/media';
import '@fontsource/bebas-neue';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/800.css';

const C = {field:'#081D13',green:'#123B31',gold:'#FFC62F',cream:'#F2E8CF',white:'#FFFDF7'};
const FPS = 30;
export const INTRO_FRAMES = 60;
export const CONTENT_FRAMES = 923;
export const OUTRO_FRAMES = 75;
export const TOTAL_FRAMES = INTRO_FRAMES + CONTENT_FRAMES + OUTRO_FRAMES;
const secToFrame = (sec:number) => Math.round(sec * FPS);

const captions = [
  {start:0.594,end:3.276,lines:['Atención, afición de Green Bay','en México.']},
  {start:3.629,end:8.045,lines:['Llegó el momento de reunirnos, pasarla bien','y armar la convivencia.']},
  {start:8.222,end:10.663,lines:['Y pintar Bellas Artes','de verde y oro.']},
  {start:11.755,end:15.915,lines:['La cita para nuestra foto anual','es este domingo 13 de septiembre,']},
  {start:16.011,end:19.817,lines:['a las 12 del mediodía.','Trae tu jersey, tu gorra,']},
  {start:19.865,end:23.816,lines:['tu familia y la mejor actitud','para representar a la mejor afición.']},
  {start:24.346,end:26.643,lines:['No te quedes fuera','de la foto de este año.']},
  {start:26.787,end:29.164,lines:['Síguenos para más detalles.','¡Go Pack Go!']},
];

const PmxLogo: React.FC<{width?:number}> = ({width=360}) => (
  <Img src={staticFile('pmx_logo_v11.png')} style={{width,height:width/4,objectFit:'contain'}} />
);

const CaptionLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const active = captions.find(c => frame >= secToFrame(c.start) && frame <= secToFrame(c.end));
  if (!active) return null;
  const opacity = interpolate(frame,[secToFrame(active.start),secToFrame(active.start)+5,secToFrame(active.end)-5,secToFrame(active.end)],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  return <div style={{position:'absolute',left:72,right:72,bottom:170,zIndex:100,display:'flex',justifyContent:'center',opacity}}>
    <div style={{maxWidth:900,padding:'17px 24px 16px',background:'rgba(8,29,19,.90)',borderTop:`4px solid ${C.gold}`,fontFamily:'Montserrat',fontWeight:800,fontSize:46,lineHeight:1.12,textAlign:'center',color:C.white,boxShadow:'0 16px 42px rgba(0,0,0,.34)'}}>
      {active.lines.map((line,i)=><div key={i}>{line}</div>)}
    </div>
  </div>;
};

const OrganizerStrip: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame,[6,18],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  return <div style={{position:'absolute',top:42,left:48,right:48,zIndex:74,display:'flex',alignItems:'center',justifyContent:'space-between',opacity}}>
    <div style={{display:'flex',alignItems:'center',gap:16,maxWidth:520}}>
      <Img src={staticFile('colectivo_logo.webp')} style={{width:88,height:108,objectFit:'contain'}} />
      <div>
        <div style={{fontFamily:'Montserrat',fontWeight:800,fontSize:18,letterSpacing:1.5,color:C.gold}}>ORGANIZA</div>
        <div style={{fontFamily:'Montserrat',fontWeight:800,fontSize:22,lineHeight:1.05,color:C.white,marginTop:3}}>COLECTIVO PACKERS MÉXICO</div>
      </div>
    </div>
    <PmxLogo width={420} />
  </div>;
};

const OverlayCard: React.FC<{from:number;to:number;children:React.ReactNode;compact?:boolean}> = ({from,to,children,compact=false}) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > to) return null;
  const opacity = interpolate(frame,[from,from+8,to-9,to],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const translateY = interpolate(frame,[from,from+12],[18,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.bezier(.16,1,.3,1)});
  return <div style={{position:'absolute',left:66,right:66,top:190,zIndex:62,opacity,transform:`translateY(${translateY}px)`}}>
    <div style={{maxWidth:compact?760:948,background:'linear-gradient(90deg, rgba(8,29,19,.94), rgba(8,29,19,.82))',borderLeft:`7px solid ${C.gold}`,padding:compact?'20px 24px 19px':'22px 27px 21px',boxShadow:'0 14px 38px rgba(0,0,0,.28)'}}>{children}</div>
  </div>;
};

const VisualMoments: React.FC = () => <>
  <OverlayCard from={105} to={232}>
    <div style={{fontFamily:'Bebas Neue',fontSize:82,lineHeight:.93,color:C.gold}}>LA AFICIÓN PACKER</div>
    <div style={{fontFamily:'Bebas Neue',fontSize:77,lineHeight:.93,color:C.cream}}>SE REÚNE EN BELLAS ARTES</div>
    <div style={{fontFamily:'Montserrat',fontWeight:700,fontSize:31,lineHeight:1.17,color:C.white,marginTop:12}}>Ven a formar parte de la foto de la comunidad. 📸🧀</div>
  </OverlayCard>
  <OverlayCard from={242} to={370} compact>
    <div style={{fontFamily:'Bebas Neue',fontSize:86,lineHeight:.92,color:C.gold}}>DOMINGO 13 SEP</div>
    <div style={{fontFamily:'Bebas Neue',fontSize:106,lineHeight:.9,color:C.cream,marginTop:6}}>12:00 H</div>
    <div style={{fontFamily:'Montserrat',fontWeight:700,fontSize:32,color:C.white,marginTop:10}}>Palacio de Bellas Artes · CDMX</div>
  </OverlayCard>
  <OverlayCard from={380} to={500}>
    <div style={{fontFamily:'Bebas Neue',fontSize:73,lineHeight:.94,color:C.gold}}>TE RECOMENDAMOS LLEGAR</div>
    <div style={{fontFamily:'Bebas Neue',fontSize:104,lineHeight:.9,color:C.cream,marginTop:7}}>30 MINUTOS ANTES</div>
    <div style={{fontFamily:'Montserrat',fontWeight:700,fontSize:29,lineHeight:1.18,color:C.white,marginTop:12}}>Así tendremos tiempo para reunirnos y seguir las indicaciones de los organizadores.</div>
  </OverlayCard>
  <OverlayCard from={510} to={638} compact>
    <div style={{fontFamily:'Bebas Neue',fontSize:82,lineHeight:.92,color:C.gold}}>¿DÓNDE NOS VEMOS?</div>
    <div style={{fontFamily:'Montserrat',fontWeight:800,fontSize:38,lineHeight:1.15,color:C.cream,marginTop:12}}>Costado izquierdo del<br />Palacio de Bellas Artes</div>
    <div style={{fontFamily:'Montserrat',fontWeight:800,fontSize:34,color:C.white,marginTop:10}}>En el pasillo.</div>
  </OverlayCard>
  <OverlayCard from={648} to={758}>
    <div style={{fontFamily:'Bebas Neue',fontSize:65,lineHeight:.95,color:C.gold}}>VEN CON LOS COLORES DE GREEN BAY 💚💛</div>
    <div style={{fontFamily:'Montserrat',fontWeight:700,fontSize:28,color:C.white,marginTop:10}}>Puedes traer:</div>
    <div style={{fontFamily:'Bebas Neue',fontSize:82,lineHeight:.94,color:C.cream,marginTop:5}}>JERSEY · CHEESEHEAD</div>
    <div style={{fontFamily:'Montserrat',fontWeight:700,fontSize:30,color:C.white,marginTop:4}}>Y venir con tu familia.</div>
  </OverlayCard>
  <OverlayCard from={770} to={838} compact>
    <div style={{fontFamily:'Bebas Neue',fontSize:70,lineHeight:.94,color:C.gold}}>SIGUE LAS INDICACIONES</div>
    <div style={{fontFamily:'Bebas Neue',fontSize:68,lineHeight:.94,color:C.cream}}>DE LOS ORGANIZADORES</div>
    <div style={{fontFamily:'Montserrat',fontWeight:700,fontSize:29,lineHeight:1.17,color:C.white,marginTop:11}}>Ellos coordinarán cómo se forma la fotografía.</div>
  </OverlayCard>
  <OverlayCard from={846} to={914}>
    <div style={{display:'flex',alignItems:'center',gap:22}}>
      <Img src={staticFile('colectivo_logo.webp')} style={{width:128,height:158,objectFit:'contain'}} />
      <div>
        <div style={{fontFamily:'Bebas Neue',fontSize:62,lineHeight:.94,color:C.gold}}>ORGANIZA</div>
        <div style={{fontFamily:'Montserrat',fontWeight:800,fontSize:32,color:C.cream,marginTop:2}}>COLECTIVO PACKERS MÉXICO</div>
        <div style={{fontFamily:'Montserrat',fontWeight:700,fontSize:25,lineHeight:1.18,color:C.white,marginTop:9}}>PACKERS MÉXICO comparte esta invitación con su comunidad.</div>
      </div>
    </div>
  </OverlayCard>
</>;

const BrandBackdrop: React.FC = () => <>
  <AbsoluteFill style={{background:C.field}} />
  <div style={{position:'absolute',left:0,top:0,bottom:0,width:414,background:C.green}} />
  <div style={{position:'absolute',left:414,top:0,bottom:0,width:7,background:C.gold}} />
  <div style={{position:'absolute',right:-140,bottom:-150,width:620,height:620,border:`2px solid rgba(255,198,47,.18)`,borderRadius:'50%'}} />
  <div style={{position:'absolute',right:-40,bottom:-50,width:390,height:390,border:`2px solid rgba(242,232,207,.10)`,borderRadius:'50%'}} />
</>;

const CoverFrame: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame,[0,8,50,59],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const translateY = interpolate(frame,[0,18],[28,0],{extrapolateRight:'clamp',easing:Easing.bezier(.16,1,.3,1)});
  return <AbsoluteFill style={{opacity,overflow:'hidden'}}>
    <BrandBackdrop />
    <div style={{position:'absolute',top:62,right:64}}><PmxLogo width={420} /></div>
    <div style={{position:'absolute',left:68,right:68,top:342,transform:`translateY(${translateY}px)`}}>
      <div style={{width:178,height:8,background:C.gold}} />
      <div style={{fontFamily:'Bebas Neue',fontSize:164,lineHeight:.84,color:C.cream,marginTop:30}}>FOTO OFICIAL</div>
      <div style={{fontFamily:'Bebas Neue',fontSize:119,lineHeight:.91,color:C.gold,marginTop:12}}>DE LA AFICIÓN PACKER</div>
      <div style={{fontFamily:'Montserrat',fontWeight:800,fontSize:47,color:C.white,marginTop:58}}>DOM 13 SEP · 12:00 H</div>
      <div style={{fontFamily:'Montserrat',fontWeight:800,fontSize:36,lineHeight:1.18,color:C.cream,marginTop:16}}>PALACIO DE BELLAS ARTES · CDMX</div>
    </div>
  </AbsoluteFill>;
};

const Content: React.FC = () => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{background:C.field,overflow:'hidden'}}>
    <Video src={staticFile('jen_master_hq.mp4')} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 52%',transform:'scale(1.08)',filter:'contrast(1.03) saturate(1.04) brightness(1.01)'}} />
    <AbsoluteFill style={{background:'linear-gradient(180deg, rgba(8,29,19,.34) 0%, rgba(8,29,19,.03) 28%, rgba(8,29,19,.06) 60%, rgba(8,29,19,.56) 100%)'}} />
    {frame >= 8 && frame < 846 ? <OrganizerStrip /> : null}
    <VisualMoments />
    <CaptionLayer />
  </AbsoluteFill>;
};

const CtaFrame: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame,[0,8,65,74],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const scale = interpolate(frame,[0,20],[.975,1],{extrapolateRight:'clamp',easing:Easing.bezier(.16,1,.3,1)});
  return <AbsoluteFill style={{opacity,overflow:'hidden'}}>
    <BrandBackdrop />
    <div style={{position:'absolute',top:50,left:52,right:52,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <div style={{display:'flex',alignItems:'center',gap:18,maxWidth:500}}>
        <Img src={staticFile('colectivo_logo.webp')} style={{width:112,height:138,objectFit:'contain'}} />
        <div>
          <div style={{fontFamily:'Montserrat',fontWeight:800,fontSize:18,letterSpacing:1.4,color:C.gold}}>ORGANIZA</div>
          <div style={{fontFamily:'Montserrat',fontWeight:800,fontSize:23,lineHeight:1.06,color:C.cream,marginTop:3}}>COLECTIVO PACKERS MÉXICO</div>
        </div>
      </div>
      <PmxLogo width={420} />
    </div>
    <div style={{position:'absolute',left:68,right:68,top:410,transform:`scale(${scale})`,transformOrigin:'left center'}}>
      <div style={{fontFamily:'Bebas Neue',fontSize:110,lineHeight:.9,color:C.gold}}>¿TE SUMAS? 📸🧀</div>
      <div style={{fontFamily:'Bebas Neue',fontSize:157,lineHeight:.86,color:C.cream,marginTop:26}}>NOS VEMOS EN</div>
      <div style={{fontFamily:'Bebas Neue',fontSize:168,lineHeight:.86,color:C.gold}}>BELLAS ARTES</div>
      <div style={{fontFamily:'Montserrat',fontWeight:800,fontSize:50,color:C.white,marginTop:48}}>DOM 13 SEP · 12:00 H</div>
    </div>
    <div style={{position:'absolute',left:68,right:68,bottom:126,borderTop:'2px solid rgba(242,232,207,.30)',paddingTop:22,fontFamily:'Montserrat',fontWeight:700,fontSize:26,lineHeight:1.22,color:C.cream}}>PACKERS MÉXICO comparte esta invitación con su comunidad.</div>
  </AbsoluteFill>;
};

export const BellasArtesReel: React.FC = () => <AbsoluteFill style={{background:C.field}}>
  <Sequence from={0} durationInFrames={INTRO_FRAMES}><CoverFrame /></Sequence>
  <Sequence from={INTRO_FRAMES} durationInFrames={CONTENT_FRAMES}><Content /></Sequence>
  <Sequence from={INTRO_FRAMES + CONTENT_FRAMES} durationInFrames={OUTRO_FRAMES}><CtaFrame /></Sequence>
</AbsoluteFill>;

export const BellasArtesCover: React.FC = () => <CoverFrame />;