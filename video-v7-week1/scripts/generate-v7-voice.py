#!/usr/bin/env python3
import asyncio
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "audio"
OUT.mkdir(parents=True, exist_ok=True)

VOICE = "es-MX-DaliaNeural"
RATE = "+8%"
PITCH = "+0Hz"

SCENES = {
    "S01": "¿Pensabas que ya habíamos terminado con el chisme de offseason de Green Bay? Pues no. Porque cuando parecía que el roster estaba cerrando… Gutekunst decidió mover media casa otra vez.",
    "S02": "En cuestión de días llegaron caras nuevas, hubo trades, cortes y movimientos hasta dejar prácticamente armado el equipo que va a arrancar la temporada.",
    "S03": "Primero apareció Jonnu Smith. Sí, otro tight end. Veterano, experiencia de sobra y además ya conoce el sistema de Matt LaFleur.",
    "S04": "Y por si eso no era suficiente… Green Bay todavía fue por Mark Redman vía trade con los Rams. Porque aparentemente la respuesta a ‘¿cuántos tight ends necesitas?’ es: sí.",
    "S05": "También llegó Kaleb Johnson desde Pittsburgh para meter todavía más competencia y profundidad al backfield.",
    "S06": "Kyle McCord salió rumbo a Miami, y después Green Bay sumó a Kedon Slovis al practice squad. Y todavía hubo movimientos hasta en equipos especiales.",
    "S07": "Entre altas, bajas, lesiones y regresos, el roster finalmente tomó forma. Tucker Kraft y MarShawn Lloyd volvieron a meterse de lleno en la conversación… y ahora ya no estamos hablando de campamento.",
    "S08": "Porque ahora sí… se acabó la offseason. Empieza la temporada.",
    "S09": "Y Green Bay empieza con cero margen para dormirse. Semana uno. Minnesota. Vikings contra Packers. Rival de división desde el primer domingo.",
    "S10": "Después de todo lo que cambió durante estos meses, ahora viene la única pregunta que importa: ¿Este equipo está listo para demostrarlo cuando los partidos ya cuentan?",
    "S11": "Y nosotros también arrancamos temporada. Quiniela, análisis, Dr Palma, Game Day, podcast, comunidad… y todo lo que se nos vaya ocurriendo en el camino.",
    "S12": "Pero primero queremos arrancar juntos. Este domingo nos vemos para la foto oficial de la afición Packers en Ciudad de México.",
    "S13": "Nos tomamos la foto… y unas horas después empieza lo bueno. Minnesota nos espera. Go Pack Go.",
}

async def main():
    for scene, text in SCENES.items():
        output = OUT / f"{scene}.mp3"
        print(f"[voice] {scene} -> {output.name}")
        communicator = edge_tts.Communicate(text=text, voice=VOICE, rate=RATE, pitch=PITCH)
        await communicator.save(str(output))
        if not output.exists() or output.stat().st_size < 4096:
            raise RuntimeError(f"Invalid generated voice file: {output}")

if __name__ == "__main__":
    asyncio.run(main())
