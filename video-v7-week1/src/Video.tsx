import React from 'react';
import '@fontsource/bebas-neue/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/700.css';
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Audio} from '@remotion/media';
import timings from './timings.json';

const C = {
  field: '#081D13',
  green: '#123B31',
  gold: '#FFC62F',
  gold2: '#E3A51A',
  cream: '#F2E8CF',
  ink: '#07140D',
};

const FONT_DISPLAY = '"Bebas Neue", sans-serif';
const FONT_BODY = 'Montserrat, sans-serif';

type SceneVariant = 'photo' | 'roster' | 'transition' | 'matchup' | 'pmx' | 'event' | 'close';

type SceneData = {
  id: string;
  kicker: string;
  title: string;
  key: string;
  captionA: string;
  captionB: string;
  images: string[];
  source: string;
  audio: string;
  variant: SceneVariant;
  sticker?: string;
};

const scenes: SceneData[] = [
  {
    id: 'S01',
    kicker: 'EL CHISME NO HABÍA TERMINADO',
    title: '¿YA HABÍA TERMINADO EL CHISME?',
    key: 'NO.',
    captionA: '¿Pensabas que ya habíamos terminado con el chisme de offseason de Green Bay?',
    captionB: 'Pues no. Gutekunst decidió mover media casa otra vez.',
    images: ['assets/gutekunst-1.jpg', 'assets/gutekunst-2.jpg'],
    source: 'Foto: Evan Siegle · Packers.com · Draft Room 2026',
    audio: 'audio/S01.mp3',
    variant: 'photo',
    sticker: 'OTRO GIRO',
  },
  {
    id: 'S02',
    kicker: 'ÚLTIMA LOCURA DEL ROSTER',
    title: 'TRADE → FIRMA → CORTE → ROSTER',
    key: 'CASI LISTOS.',
    captionA: 'En cuestión de días llegaron caras nuevas, hubo trades, cortes y movimientos.',
    captionB: 'Hasta dejar prácticamente armado el equipo que va a arrancar la temporada.',
    images: ['assets/jonnu.jpg', 'assets/redman.jpg', 'assets/kaleb.png', 'assets/slovis.jpg'],
    source: 'Fuentes visuales: Packers.com · roster/práctica 2026',
    audio: 'audio/S02.mp3',
    variant: 'roster',
    sticker: '¿YA ACABÓ? NO.',
  },
  {
    id: 'S03',
    kicker: 'TE ROOM · NUEVA PIEZA',
    title: 'JONNU SMITH',
    key: 'EXPERIENCIA PARA EL TE ROOM',
    captionA: 'Primero apareció Jonnu Smith. Sí, otro tight end.',
    captionB: 'Veterano, experiencia de sobra y ya conoce el sistema de Matt LaFleur.',
    images: ['assets/jonnu.jpg'],
    source: 'Fuente visual: Packers.com · roster 2026',
    audio: 'audio/S03.mp3',
    variant: 'photo',
    sticker: 'OTRO TE',
  },
  {
    id: 'S04',
    kicker: 'PORQUE UNO MÁS… ¿POR QUÉ NO?',
    title: 'MARK REDMAN',
    key: 'OTRO TE. PORQUE CLARO.',
    captionA: 'Green Bay todavía fue por Mark Redman vía trade con los Rams.',
    captionB: '¿Cuántos tight ends necesitas? Aparentemente la respuesta es: sí.',
    images: ['assets/redman.jpg', 'assets/jonnu.jpg'],
    source: 'Fuente visual: Packers.com · roster 2026',
    audio: 'audio/S04.mp3',
    variant: 'roster',
    sticker: 'SÍ.',
  },
  {
    id: 'S05',
    kicker: 'BACKFIELD · MÁS COMPETENCIA',
    title: 'KALEB JOHNSON',
    key: 'RB · TRADE CON PITTSBURGH',
    captionA: 'También llegó Kaleb Johnson desde Pittsburgh.',
    captionB: 'Más competencia y más profundidad para el backfield.',
    images: ['assets/kaleb.png'],
    source: 'Fuente visual: Packers.com · roster 2026',
    audio: 'audio/S05.mp3',
    variant: 'photo',
    sticker: 'NUEVA CARA',
  },
  {
    id: 'S06',
    kicker: 'QB ROOM · ÚLTIMOS AJUSTES',
    title: 'McCORD OUT → SLOVIS IN',
    key: 'HASTA EL ÚLTIMO DETALLE.',
    captionA: 'Kyle McCord salió rumbo a Miami y Green Bay sumó a Kedon Slovis al practice squad.',
    captionB: 'Y todavía hubo movimientos hasta en equipos especiales.',
    images: ['assets/slovis.jpg'],
    source: 'Foto: Evan Siegle · Packers.com · práctica 1 SEP 2026',
    audio: 'audio/S06.mp3',
    variant: 'photo',
    sticker: 'OUT / IN',
  },
  {
    id: 'S07',
    kicker: 'EL ROSTER YA TOMÓ FORMA',
    title: 'SE ACABARON LAS PRUEBAS.',
    key: 'KRAFT + LLOYD',
    captionA: 'Entre altas, bajas, lesiones y regresos, el roster finalmente tomó forma.',
    captionB: 'Tucker Kraft y MarShawn Lloyd volvieron a meterse de lleno en la conversación.',
    images: ['assets/kraft-action.jpg', 'assets/lloyd-action.jpg'],
    source: 'Fotos: Evan Siegle · Packers.com · práctica 1 SEP 2026',
    audio: 'audio/S07.mp3',
    variant: 'roster',
    sticker: 'YA CUENTA',
  },
  {
    id: 'S08',
    kicker: 'CAMBIO DE TONO',
    title: 'SE ACABÓ LA OFFSEASON.',
    key: 'WEEK 1',
    captionA: 'Porque ahora sí… se acabó la offseason.',
    captionB: 'Empieza la temporada.',
    images: [],
    source: 'PACKERS MÉXICO · Temporada 2026',
    audio: 'audio/S08.mp3',
    variant: 'transition',
  },
  {
    id: 'S09',
    kicker: 'WEEK 1 · NFC NORTH',
    title: 'GREEN BAY @ MINNESOTA',
    key: 'DOM · 13 SEP · 14:25 CDMX',
    captionA: 'Green Bay empieza con cero margen para dormirse. Semana uno. Minnesota.',
    captionB: 'Vikings contra Packers. Rival de división desde el primer domingo.',
    images: ['assets/love-action.jpg'],
    source: 'Foto: Evan Siegle · Packers.com · práctica 1 SEP 2026',
    audio: 'audio/S09.mp3',
    variant: 'matchup',
    sticker: 'WEEK 1',
  },
  {
    id: 'S10',
    kicker: 'LA ÚNICA PREGUNTA QUE IMPORTA',
    title: 'AHORA SÍ CUENTA.',
    key: '¿ESTÁ LISTO ESTE EQUIPO?',
    captionA: 'Después de todo lo que cambió durante estos meses…',
    captionB: '¿Este equipo está listo para demostrarlo cuando los partidos ya cuentan?',
    images: ['assets/love-action.jpg', 'assets/love-headshot.png'],
    source: 'Fotos: Packers.com · roster/práctica 2026',
    audio: 'audio/S10.mp3',
    variant: 'photo',
    sticker: 'SIN EXCUSAS',
  },
  {
    id: 'S11',
    kicker: 'NOSOTROS TAMBIÉN ARRANCAMOS',
    title: 'PACKERS MÉXICO · TEMPORADA 2026',
    key: 'GAME DAY · PODCAST · COMUNIDAD',
    captionA: 'Y nosotros también arrancamos temporada.',
    captionB: 'Game Day, podcast, comunidad… y todo lo que se nos vaya ocurriendo en el camino.',
    images: ['assets/love-headshot.png', 'assets/kraft-action.jpg', 'assets/lloyd-action.jpg'],
    source: 'PACKERS MÉXICO · Sistema Lambeau · S11 sin Quiniela/Dr. Palma visual',
    audio: 'audio/S11.mp3',
    variant: 'pmx',
    sticker: 'VAMOS JUNTOS',
  },
  {
    id: 'S12',
    kicker: 'PRIMERO, JUNTOS',
    title: 'FOTO OFICIAL · AFICIÓN PACKERS',
    key: 'DOM · 13 SEP · 12:00 h',
    captionA: 'Pero primero queremos arrancar juntos.',
    captionB: 'Este domingo nos vemos para la foto oficial de la afición Packers en Ciudad de México.',
    images: ['assets/foto-oficial-invitacion.png'],
    source: 'PMX-COMM-20260913-FOTO-OFICIAL-001 · QP Digital / Colectivo Packers México',
    audio: 'audio/S12.mp3',
    variant: 'event',
  },
  {
    id: 'S13',
    kicker: 'DE BELLAS ARTES AL KICKOFF',
    title: 'MINNESOTA NOS ESPERA.',
    key: 'GO PACK GO.',
    captionA: 'Nos tomamos la foto… y unas horas después empieza lo bueno.',
    captionB: 'Minnesota nos espera. Go Pack Go.',
    images: ['assets/love-action.jpg', 'assets/foto-oficial-invitacion.png'],
    source: 'PACKERS MÉXICO · Desde 2013',
    audio: 'audio/S13.mp3',
    variant: 'close',
    sticker: 'WEEK 1',
  },
];

const timeline = timings.scenes.map((t, i) => ({
  ...t,
  startSeconds: timings.scenes.slice(0, i).reduce((sum, s) => sum + s.seconds, 0),
}));

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

const PMXLogo: React.FC = () => (
  <div style={{position: 'absolute', top: 54, left: 58, zIndex: 30, width: 292}}>
    <Img src={staticFile('assets/pmx-logo.svg')} style={{width: '100%', height: 'auto'}} />
  </div>
);

const SceneCounter: React.FC<{index: number}> = ({index}) => (
  <div style={{
    position: 'absolute', top: 58, right: 58, zIndex: 30,
    fontFamily: FONT_BODY, fontWeight: 700, fontSize: 24, letterSpacing: 2,
    color: C.gold,
  }}>{String(index + 1).padStart(2, '0')} / 13</div>
);

const Sticker: React.FC<{text: string; frame: number; delay?: number; rotate?: number}> = ({text, frame, delay = 8, rotate = -3}) => {
  const p = spring({frame: frame - delay, fps: 30, config: {damping: 13, stiffness: 180, mass: 0.7}});
  return (
    <div style={{
      display: 'inline-block', background: C.gold, color: C.ink, padding: '12px 18px 10px',
      fontFamily: FONT_BODY, fontWeight: 700, fontSize: 25, letterSpacing: 1,
      transform: `rotate(${rotate}deg) scale(${0.72 + p * 0.28})`, opacity: p,
      boxShadow: '0 10px 26px rgba(0,0,0,.24)',
    }}>{text}</div>
  );
};

const Caption: React.FC<{scene: SceneData; frames: number}> = ({scene, frames}) => {
  const frame = useCurrentFrame();
  const showSecond = frame >= frames * 0.49;
  const text = showSecond ? scene.captionB : scene.captionA;
  const opacity = interpolate(frame % Math.max(1, Math.round(frames * 0.49)), [0, 5], [0, 1], clamp);
  return (
    <div style={{
      position: 'absolute', left: 58, right: 58, bottom: 100, zIndex: 35,
      background: 'rgba(8,29,19,.88)', borderLeft: `8px solid ${C.gold}`,
      padding: '20px 24px 22px', color: C.cream, fontFamily: FONT_BODY,
      fontSize: 34, fontWeight: 700, lineHeight: 1.22, opacity,
      boxShadow: '0 16px 36px rgba(0,0,0,.28)',
    }}>{text}</div>
  );
};

const SourceLine: React.FC<{text: string}> = ({text}) => (
  <div style={{
    position: 'absolute', left: 58, right: 58, bottom: 46, zIndex: 36,
    color: 'rgba(242,232,207,.72)', fontFamily: FONT_BODY,
    fontSize: 18, fontWeight: 500, lineHeight: 1.2,
  }}>{text}</div>
);

const PhotoLayer: React.FC<{src: string; frame: number; frames: number; index?: number; total?: number}> = ({src, frame, frames, index = 0, total = 1}) => {
  const segment = frames / total;
  const local = frame - index * segment;
  const visible = frame >= index * segment && frame < (index + 1) * segment;
  const opacity = visible ? interpolate(local, [0, 6, segment - 6, segment], [0, 1, 1, 0], clamp) : 0;
  const zoom = interpolate(Math.max(0, local), [0, Math.max(1, segment)], [1.02, 1.12], clamp);
  const dx = index % 2 === 0 ? -18 : 18;
  return (
    <Img src={staticFile(src)} style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
      objectPosition: '50% 42%', opacity,
      transform: `translateX(${interpolate(Math.max(0, local), [0, Math.max(1, segment)], [0, dx], clamp)}px) scale(${zoom})`,
    }} />
  );
};

const PhotoBackground: React.FC<{scene: SceneData; frames: number}> = ({scene, frames}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {scene.images.map((src, i) => (
        <PhotoLayer key={src + i} src={src} frame={frame} frames={frames} index={i} total={scene.images.length} />
      ))}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(8,29,19,.18) 0%, rgba(8,29,19,.32) 38%, rgba(8,29,19,.96) 84%, #081D13 100%)'}} />
    </>
  );
};

const HeadlineBlock: React.FC<{scene: SceneData; frames: number}> = ({scene}) => {
  const frame = useCurrentFrame();
  const enter = spring({frame: frame - 4, fps: 30, config: {damping: 16, stiffness: 150, mass: 0.8}});
  const titleY = interpolate(enter, [0, 1], [72, 0], clamp);
  return (
    <div style={{position: 'absolute', left: 58, right: 58, top: 250, zIndex: 20}}>
      <div style={{fontFamily: FONT_BODY, color: C.gold, fontSize: 23, fontWeight: 700, letterSpacing: 2.1, marginBottom: 18}}>
        {scene.kicker}
      </div>
      <div style={{
        fontFamily: FONT_DISPLAY, fontSize: scene.title.length > 27 ? 98 : 118,
        lineHeight: .91, color: C.cream, letterSpacing: .5,
        transform: `translateY(${titleY}px)`, opacity: enter,
        maxWidth: 940, textShadow: '0 8px 28px rgba(0,0,0,.42)',
      }}>{scene.title}</div>
      <div style={{marginTop: 22, fontFamily: FONT_DISPLAY, fontSize: 50, lineHeight: .98, color: C.gold, maxWidth: 900}}>
        {scene.key}
      </div>
      {scene.sticker ? <div style={{marginTop: 22}}><Sticker text={scene.sticker} frame={frame} delay={13} /></div> : null}
    </div>
  );
};

const PhotoScene: React.FC<{scene: SceneData; frames: number}> = ({scene, frames}) => (
  <AbsoluteFill style={{background: C.field}}>
    <PhotoBackground scene={scene} frames={frames} />
    <PMXLogo />
    <HeadlineBlock scene={scene} frames={frames} />
    <Caption scene={scene} frames={frames} />
    <SourceLine text={scene.source} />
  </AbsoluteFill>
);

const RosterScene: React.FC<{scene: SceneData; frames: number}> = ({scene, frames}) => {
  const frame = useCurrentFrame();
  const n = scene.images.length;
  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at 70% 20%, ${C.green}, ${C.field} 58%)`}}>
      <PMXLogo />
      <div style={{position: 'absolute', left: 58, right: 58, top: 210}}>
        <div style={{fontFamily: FONT_BODY, fontSize: 22, color: C.gold, fontWeight: 700, letterSpacing: 2}}>{scene.kicker}</div>
        <div style={{fontFamily: FONT_DISPLAY, fontSize: scene.title.length > 25 ? 86 : 104, color: C.cream, lineHeight: .92, marginTop: 14}}>{scene.title}</div>
        <div style={{fontFamily: FONT_DISPLAY, fontSize: 48, color: C.gold, marginTop: 12}}>{scene.key}</div>
      </div>
      <div style={{position: 'absolute', left: 58, right: 58, top: 590, height: 820}}>
        {scene.images.map((src, i) => {
          const p = spring({frame: frame - 8 - i * 5, fps: 30, config: {damping: 14, stiffness: 170}});
          const width = n === 1 ? 740 : n === 2 ? 460 : 350;
          const left = n === 1 ? 105 : n === 2 ? i * 475 : (i % 2) * 430 + (i > 1 ? 105 : 0);
          const top = n <= 2 ? i * 70 : Math.floor(i / 2) * 370;
          return (
            <div key={src + i} style={{
              position: 'absolute', left, top, width, height: n > 2 ? 500 : 650,
              background: C.cream, padding: 12, boxShadow: '0 22px 54px rgba(0,0,0,.35)',
              transform: `rotate(${i % 2 === 0 ? -3 : 3}deg) scale(${0.82 + p * .18})`, opacity: p,
            }}>
              <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 38%'}} />
            </div>
          );
        })}
        {scene.sticker ? <div style={{position: 'absolute', right: 0, bottom: 40}}><Sticker text={scene.sticker} frame={frame} delay={20} rotate={4} /></div> : null}
      </div>
      <Caption scene={scene} frames={frames} />
      <SourceLine text={scene.source} />
    </AbsoluteFill>
  );
};

const TransitionScene: React.FC<{scene: SceneData; frames: number}> = ({scene, frames}) => {
  const frame = useCurrentFrame();
  const split = Math.round(frames * .52);
  const second = frame >= split;
  const flash = interpolate(frame, [split - 3, split, split + 3], [0, 1, 0], clamp);
  const scale = spring({frame: second ? frame - split : frame, fps: 30, config: {damping: 17, stiffness: 140}});
  return (
    <AbsoluteFill style={{background: second ? C.field : C.cream, color: second ? C.cream : C.field}}>
      <PMXLogo />
      <div style={{position: 'absolute', left: 58, right: 58, top: 515}}>
        <div style={{fontFamily: FONT_BODY, fontWeight: 700, letterSpacing: 3, fontSize: 25, color: C.gold2}}>{scene.kicker}</div>
        <div style={{fontFamily: FONT_DISPLAY, fontSize: second ? 210 : 154, lineHeight: .88, marginTop: 20, transform: `scale(${.9 + scale * .1})`, transformOrigin: 'left center'}}>
          {second ? 'WEEK 1' : 'SE ACABÓ LA OFFSEASON.'}
        </div>
      </div>
      <AbsoluteFill style={{background: C.gold, opacity: flash}} />
      <Caption scene={scene} frames={frames} />
      <SourceLine text={scene.source} />
    </AbsoluteFill>
  );
};

const MatchupScene: React.FC<{scene: SceneData; frames: number}> = ({scene, frames}) => {
  const frame = useCurrentFrame();
  const photoScale = interpolate(frame, [0, frames], [1.03, 1.13], clamp);
  const typeIn = spring({frame: frame - 5, fps: 30, config: {damping: 15, stiffness: 150}});
  return (
    <AbsoluteFill style={{background: C.field}}>
      <Img src={staticFile(scene.images[0])} style={{position: 'absolute', top: 0, right: 0, width: '100%', height: 870, objectFit: 'cover', objectPosition: '50% 35%', transform: `scale(${photoScale})`}} />
      <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 920, background: 'linear-gradient(180deg,rgba(8,29,19,.08),rgba(8,29,19,.2) 40%,#081D13 100%)'}} />
      <PMXLogo />
      <div style={{position: 'absolute', left: 58, right: 58, top: 820}}>
        <div style={{fontFamily: FONT_BODY, color: C.gold, fontSize: 24, fontWeight: 700, letterSpacing: 2}}>{scene.kicker}</div>
        <div style={{fontFamily: FONT_DISPLAY, color: C.cream, fontSize: 126, lineHeight: .9, marginTop: 18, opacity: typeIn, transform: `translateY(${(1 - typeIn) * 70}px)`}}>GREEN BAY</div>
        <div style={{fontFamily: FONT_DISPLAY, color: C.gold, fontSize: 94, lineHeight: .8}}>@</div>
        <div style={{fontFamily: FONT_DISPLAY, color: C.cream, fontSize: 126, lineHeight: .9}}>MINNESOTA</div>
        <div style={{display: 'inline-block', marginTop: 28, padding: '14px 18px', background: C.gold, color: C.ink, fontFamily: FONT_BODY, fontSize: 32, fontWeight: 700}}>{scene.key}</div>
      </div>
      <Caption scene={scene} frames={frames} />
      <SourceLine text={scene.source} />
    </AbsoluteFill>
  );
};

const PMXScene: React.FC<{scene: SceneData; frames: number}> = ({scene, frames}) => {
  const frame = useCurrentFrame();
  const chips = ['GAME DAY', 'PODCAST', 'COMUNIDAD', 'ANÁLISIS'];
  return (
    <AbsoluteFill style={{background: `linear-gradient(145deg, ${C.field}, ${C.green})`}}>
      <PMXLogo />
      <div style={{position: 'absolute', top: 260, left: 58, right: 58}}>
        <div style={{fontFamily: FONT_BODY, color: C.gold, fontWeight: 700, letterSpacing: 2, fontSize: 23}}>{scene.kicker}</div>
        <div style={{fontFamily: FONT_DISPLAY, color: C.cream, fontSize: 112, lineHeight: .91, marginTop: 14}}>{scene.title}</div>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 34}}>
          {chips.map((chip, i) => {
            const p = spring({frame: frame - 8 - i * 4, fps: 30, config: {damping: 16, stiffness: 150}});
            return <div key={chip} style={{background: i % 2 ? C.cream : C.gold, color: C.ink, padding: '14px 20px', fontFamily: FONT_BODY, fontWeight: 700, fontSize: 26, transform: `scale(${.84 + p * .16})`, opacity: p}}>{chip}</div>;
          })}
        </div>
      </div>
      <div style={{position: 'absolute', left: 58, right: 58, top: 870, height: 500, display: 'flex', gap: 18}}>
        {scene.images.map((src, i) => <div key={src} style={{flex: 1, overflow: 'hidden', border: `3px solid ${i === 1 ? C.gold : C.cream}`}}><Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} /></div>)}
      </div>
      <Caption scene={scene} frames={frames} />
      <SourceLine text={scene.source} />
    </AbsoluteFill>
  );
};

const EventScene: React.FC<{scene: SceneData; frames: number}> = ({scene, frames}) => {
  const frame = useCurrentFrame();
  const p = spring({frame: frame - 4, fps: 30, config: {damping: 16, stiffness: 145}});
  return (
    <AbsoluteFill style={{background: C.field}}>
      <PMXLogo />
      <div style={{position: 'absolute', left: 58, right: 58, top: 220}}>
        <div style={{fontFamily: FONT_BODY, color: C.gold, fontWeight: 700, fontSize: 24, letterSpacing: 2}}>{scene.kicker}</div>
        <div style={{fontFamily: FONT_DISPLAY, color: C.cream, fontSize: 98, lineHeight: .92, marginTop: 14}}>{scene.title}</div>
      </div>
      <div style={{position: 'absolute', left: 58, top: 510, width: 620, background: C.cream, color: C.ink, padding: 34, transform: `translateY(${(1-p)*60}px)`, opacity: p, boxShadow: '0 24px 60px rgba(0,0,0,.34)'}}>
        <div style={{fontFamily: FONT_DISPLAY, fontSize: 72, lineHeight: .9}}>DOM · 13 SEP</div>
        <div style={{fontFamily: FONT_DISPLAY, fontSize: 96, lineHeight: .88, color: C.green}}>12:00 h</div>
        <div style={{fontFamily: FONT_BODY, fontSize: 34, fontWeight: 700, marginTop: 20}}>PALACIO DE BELLAS ARTES</div>
        <div style={{height: 5, background: C.gold2, margin: '24px 0'}} />
        <div style={{fontFamily: FONT_BODY, fontSize: 28, fontWeight: 700, lineHeight: 1.28}}>Costado izquierdo · pasillo</div>
        <div style={{fontFamily: FONT_BODY, fontSize: 27, fontWeight: 500, lineHeight: 1.28, marginTop: 14}}>Recomendamos llegar 30 min antes</div>
      </div>
      <div style={{position: 'absolute', right: 58, top: 650, width: 330, height: 520, background: C.cream, padding: 10, transform: 'rotate(3deg)', boxShadow: '0 18px 42px rgba(0,0,0,.38)'}}>
        <Img src={staticFile(scene.images[0])} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 50%'}} />
      </div>
      <Caption scene={scene} frames={frames} />
      <SourceLine text={scene.source} />
    </AbsoluteFill>
  );
};

const CloseScene: React.FC<{scene: SceneData; frames: number}> = ({scene, frames}) => {
  const frame = useCurrentFrame();
  const switchAt = frames * .55;
  const final = frame >= switchAt;
  const photoOpacity = interpolate(frame, [0, switchAt - 10, switchAt + 5], [1, .75, 0], clamp);
  const finalIn = spring({frame: frame - switchAt, fps: 30, config: {damping: 18, stiffness: 120}});
  return (
    <AbsoluteFill style={{background: C.field}}>
      <Img src={staticFile(scene.images[0])} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: photoOpacity}} />
      <AbsoluteFill style={{background: `linear-gradient(180deg,rgba(8,29,19,.22),${C.field} 82%)`, opacity: photoOpacity}} />
      <PMXLogo />
      {!final ? <HeadlineBlock scene={scene} frames={frames} /> : (
        <div style={{position: 'absolute', left: 58, right: 58, top: 560, opacity: finalIn, transform: `translateY(${(1-finalIn)*70}px)`}}>
          <div style={{fontFamily: FONT_DISPLAY, color: C.cream, fontSize: 150, lineHeight: .88}}>MÁS QUE NOTICIAS.</div>
          <div style={{fontFamily: FONT_DISPLAY, color: C.gold, fontSize: 150, lineHeight: .88, marginTop: 22}}>VIVIMOS GREEN BAY.</div>
          <div style={{fontFamily: FONT_BODY, color: C.cream, fontSize: 30, fontWeight: 700, letterSpacing: 2, marginTop: 42}}>PACKERS MÉXICO · DESDE 2013</div>
        </div>
      )}
      <Caption scene={scene} frames={frames} />
      <SourceLine text={scene.source} />
    </AbsoluteFill>
  );
};

const SceneRenderer: React.FC<{scene: SceneData; index: number; frames: number}> = ({scene, index, frames}) => {
  let content: React.ReactNode;
  if (scene.variant === 'transition') content = <TransitionScene scene={scene} frames={frames} />;
  else if (scene.variant === 'matchup') content = <MatchupScene scene={scene} frames={frames} />;
  else if (scene.variant === 'roster') content = <RosterScene scene={scene} frames={frames} />;
  else if (scene.variant === 'pmx') content = <PMXScene scene={scene} frames={frames} />;
  else if (scene.variant === 'event') content = <EventScene scene={scene} frames={frames} />;
  else if (scene.variant === 'close') content = <CloseScene scene={scene} frames={frames} />;
  else content = <PhotoScene scene={scene} frames={frames} />;

  return (
    <AbsoluteFill>
      {content}
      <SceneCounter index={index} />
      <Audio src={staticFile(scene.audio)} volume={1} />
    </AbsoluteFill>
  );
};

export const PMXOffseasonV7Week1: React.FC = () => {
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: C.field}}>
      {scenes.map((scene, index) => {
        const timing = timeline.find((t) => t.id === scene.id) ?? timeline[index];
        const from = Math.round(timing.startSeconds * fps);
        const frames = Math.max(1, Math.round(timing.seconds * fps));
        return (
          <Sequence key={scene.id} from={from} durationInFrames={frames} name={`${scene.id} · ${scene.title}`}>
            <SceneRenderer scene={scene} index={index} frames={frames} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
