# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

Juego de Arkanoid/Breakout en **HTML, CSS y JavaScript con cero dependencias**, para jugar directamente en el navegador. El objetivo es que sea ejecutable abriendo un archivo HTML sin build ni servidor.

**Estado actual:** el juego todavía NO está implementado. Por ahora solo existen los assets (spritesheet + sonidos), el sistema de dibujado de sprites (`assets/spritesheet.js`) y el flujo de trabajo basado en specs. No hay `index.html`, `specs/` ni código del juego aún.


## Flujo de trabajo: desarrollo dirigido por specs

Este repo usa un método **spec-driven**. No se escribe código de funcionalidades sin una spec aprobada primero. Hay dos skills instaladas (en `.agents/skills/`, enlazadas desde `.claude/skills/`):

- **`/spec <descripción>`** — Diseña una spec sección a sección haciendo preguntas antes de proponer estructura. NO escribe código. Guarda el resultado en `specs/NN-slug.md` con estado `Draft`.
- **`/spec-impl <NN-slug>`** — Implementa una spec, pero **solo si su estado significa "Aprobado"** (`Approved`/`Aprobado`/equivalente). Crea una rama git `spec-NN-slug`, muestra el resumen de la spec e implementa paso a paso pausando tras cada paso para revisar el diff.

Reglas clave de este flujo:
- El cambio de estado de `Draft` → `Approved` lo hace el humano manualmente, nunca el agente.
- `/spec-impl` se niega a implementar specs en `Draft`, `In review`, etc. El bloqueo es intencional.
- Las specs siguen la plantilla de `.agents/skills/spec/template.md` (header con estado/objetivo en una frase, scope con "in" y "out", modelo de datos, plan de implementación commitable paso a paso, criterios de aceptación booleanos, decisiones tomadas y descartadas).

Las skills están registradas en `skills-lock.json`.

## Sistema de sprites (`assets/spritesheet.js`)

Único módulo de código existente. Punto de partida para el render del juego:

- `loadSpritesheet(cb)` — Carga `assets/spritesheet-breakout.png` y la copia a un canvas offscreen (`ssImg`). Invoca `cb` cuando está lista; si ya estaba cargada, llama de inmediato. Hay que esperar a la carga antes de dibujar (las funciones de dibujo no hacen nada si `ssLoaded` es false).
- `drawSprite(ctx, name, x, y, w, h)` — Dibuja un sprite por nombre. Para bloques se usa el prefijo `block_` (p. ej. `block_red`, `block_cyan`); el resto son nombres directos (`paddle`, `ball`).
- `drawFrame(ctx, frame, x, y, w, h)` — Dibuja un frame arbitrario por coordenadas, usado para las animaciones de explosión.
- `SPRITES` define las coordenadas (sx/sy/sw/sh) de pala, bola y 7 colores de bloque. `EXPLOSION_FRAMES` define 4 frames de explosión por color, con `EXPLOSION_DURATION = 150` ms.

## Cómo ejecutar

Al ser cero dependencias, una vez exista el HTML del juego se abre directamente en el navegador (`open index.html`) o con cualquier servidor estático simple. No hay sistema de build, ni linter, ni tests configurados.

## Convenciones de código

- Documentación y comentarios en **español**; nombres de variables en **inglés**.
- Mantener cero dependencias: nada de npm/bundlers/frameworks salvo que una spec lo decida explícitamente.
