# SPEC 02 — Animación de explosión al destruir bloques

- **Estado:** Aprobado
- **Fecha:** 2026-06-24
- **Depende de:** 01-mvp-arkanoid (implementado)
- **Objetivo:** Reproducir una animación visual de 4 frames al destruir cada bloque, usando `EXPLOSION_FRAMES` y `EXPLOSION_DURATION` del spritesheet existente, almacenando las explosiones activas en `state.explosions` sin afectar la física del juego.

---

## Alcance

**Dentro:**

- Array `state.explosions` que almacena las explosiones activas con su posición, color, tamaño y timestamp de inicio.
- Al destruir un bloque: `alive` pasa a `false` inmediatamente (colisiones desactivadas) y se añade una entrada a `state.explosions`.
- Render de cada explosión activa: se calcula el frame actual con `performance.now()` y se dibuja con `drawFrame` — función ya disponible en `assets/spritesheet.js` — usando los frames definidos en `EXPLOSION_FRAMES` (4 frames por color: red, cyan, green, magenta, yellow, hotpink, gray).
- Las explosiones terminadas (pasados `EXPLOSION_DURATION` = 150 ms) se eliminan del array en cada frame.
- Al reiniciar la partida, `state.explosions` se vacía junto con el resto del estado.

**Fuera de alcance:**

- Sonidos de ruptura (`break-sound.mp3`). Se posponen a otra spec.
- Animación de explosión en Game Over o en pérdida de vida.
- Escala o efectos extra sobre la explosión (partículas, shake, flash).
- Delta-time para la física de la bola (ya pospuesto en spec 01).

---

## Modelo de datos

Se añade un único campo nuevo al estado global existente de `game.js`:

```js
const state = {
  // ... campos existentes sin cambios ...
  explosions: [], // [{ x, y, w, h, color, startTime }]
};
```

Cada entrada del array representa una explosión activa:

```js
// { x, y, w, h, color, startTime }
// x, y, w, h  — posición y tamaño del bloque destruido (en px)
// color       — string del color del bloque (p. ej. 'red', 'cyan')
// startTime   — timestamp de performance.now() en el momento del impacto
```

El frame a dibujar se calcula en render sin almacenarlo en el objeto:

```js
const elapsed = performance.now() - explosion.startTime;
const frameIndex = Math.min(
  Math.floor(elapsed / EXPLOSION_DURATION * 4),
  3
);
const frame = EXPLOSION_FRAMES[explosion.color][frameIndex];
```

---

## Plan de implementación

Cada paso deja el juego ejecutable abriendo `index.html`.

1. **Añadir `explosions: []` al estado inicial** en `game.js` y vaciarlo en la función de reinicio. Prueba: el juego arranca y reinicia sin errores en consola.

2. **Registrar explosión al destruir un bloque.** En el punto donde se marca `brick.alive = false`, añadir `{ x, y, w, h, color, startTime: performance.now() }` a `state.explosions`. Prueba: en consola, `state.explosions` crece al romper bloques.

3. **Renderizar las explosiones activas en `render()`.** Iterar `state.explosions`, calcular `frameIndex` con la fórmula del modelo de datos y llamar a `drawFrame`. Prueba: al romper un bloque aparece la animación de 4 frames sobre su posición.

4. **Limpiar explosiones terminadas en `update()`.** Filtrar `state.explosions` eliminando las entradas donde `performance.now() - startTime >= EXPLOSION_DURATION`. Prueba: las explosiones desaparecen ~150 ms después del impacto sin acumular entradas.

---

## Criterios de aceptación

- [ ] Al romper un bloque, el bloque desaparece inmediatamente para colisiones (la bola no rebota contra él tras el impacto).
- [ ] Al romper un bloque, se reproduce una animación de 4 frames sobre su posición con el color correspondiente.
- [ ] La animación dura exactamente `EXPLOSION_DURATION` (150 ms) independientemente de la tasa de refresco del monitor.
- [ ] Pueden existir varias explosiones simultáneas sin interferirse entre sí.
- [ ] Al terminar la animación, la entrada se elimina de `state.explosions` sin dejar rastro visual.
- [ ] Al reiniciar la partida, no quedan explosiones activas de la partida anterior.
- [ ] El resto de la física y el HUD no sufren regresiones visibles.

---

## Decisiones

- **Sí:** `state.explosions` como array separado. Mantiene `state.bricks` limpio (solo bloques vivos) y facilita el vaciado al reiniciar.
- **Sí:** tiempo real con `performance.now()`. La animación dura 150 ms a cualquier tasa de refresco, sin depender de que el juego corra a exactamente 60 Hz.
- **Sí:** el bloque desaparece inmediatamente para colisiones al impactar. Evita bugs de doble colisión y es la respuesta visual más natural.
- **No:** sonidos en esta spec. `break-sound.mp3` se pospone a otra spec para mantener cada spec acotada y reversible.
- **No:** efectos adicionales (partículas, screen shake, flash). Los frames del spritesheet ya proveen la animación; añadir más sería gold-plating.
- **No:** animación de explosión en Game Over o pérdida de vida. No hay bloques destruyéndose en esos eventos; está fuera del modelo.
