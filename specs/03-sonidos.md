# SPEC 03 — Sonidos del juego

- **Estado:** Implementado
- **Fecha:** 2026-06-24
- **Depende de:** 01-mvp-arkanoid (implementado), 02-animacion-explosion-bloques (implementado)
- **Objetivo:** Reproducir `ball-bounce.mp3` en cada rebote de la bola (paredes, techo y pala, pero NO al impactar con bloques) y `break-sound.mp3` al destruir cada bloque, con sonidos solapables y un toggle on/off con la tecla S.

---

## Alcance

**Dentro:**

- Precarga de `assets/sounds/ball-bounce.mp3` y `assets/sounds/break-sound.mp3` al arrancar el juego.
- `ball-bounce.mp3` se reproduce en cada rebote de la bola contra: paredes laterales, techo y pala.
- `break-sound.mp3` se reproduce al destruir cada bloque (en el mismo punto donde se marca `brick.alive = false`).
- Los sonidos se solapan: cada reproducción clona el nodo de audio para permitir varias instancias simultáneas.
- Tecla `S` conmuta el sonido on/off globalmente. El estado se guarda en `state.soundEnabled`.
- Indicador visual mínimo del estado del sonido en el HUD (p. ej. "SFX: ON" / "SFX: OFF").

**Fuera de alcance:**

- Sonidos de pérdida de vida, Game Over o victoria.
- Música de fondo.
- Control de volumen individual por tipo de sonido.
- Persistencia del estado on/off entre sesiones (se reinicia a ON al recargar).
- Sonidos para futuras specs (power-ups, niveles, etc.).

---

## Modelo de datos

Se añade un campo al estado global y dos constantes de audio en `game.js`:

```js
// Al inicio del archivo, junto a CONFIG
const SOUNDS = {
  bounce: new Audio('assets/sounds/ball-bounce.mp3'),
  break:  new Audio('assets/sounds/break-sound.mp3'),
};

// Función auxiliar para reproducir con solapamiento
function playSound(name) {
  if (!state.soundEnabled) return;
  SOUNDS[name].cloneNode().play();
}
```

```js
const state = {
  // ... campos existentes sin cambios ...
  soundEnabled: true, // toggled con tecla S
};
```

No se almacenan instancias activas de audio: `cloneNode()` crea y descarta nodos de forma automática.

---

## Plan de implementación

Cada paso deja el juego ejecutable abriendo `index.html`.

1. **Declarar `SOUNDS` y `playSound()` en `game.js`.** Añadir las constantes `SOUNDS` y la función auxiliar antes del bucle principal. Añadir `soundEnabled: true` al estado inicial. Prueba: la consola no muestra errores al cargar la página.

2. **Reproducir `break-sound` al destruir un bloque.** En el punto donde se marca `brick.alive = false`, llamar a `playSound('break')`. Prueba: se oye el sonido al romper bloques; varios bloques rotos casi a la vez producen sonidos solapados.

3. **Reproducir `bounce` en rebotes de pared, techo y pala.** En los puntos de inversión de `vx` (paredes) y `vy` (techo y pala), llamar a `playSound('bounce')`. Prueba: se oye el rebote al chocar con paredes, techo y pala; no se oye al impactar con bloques.

4. **Toggle de sonido con tecla S.** En el listener de `keydown`, al recibir `'s'` o `'S'`, invertir `state.soundEnabled`. Prueba: pulsando S se silencia y reactiva el sonido correctamente.

5. **Indicador visual en el HUD.** En la función de render del HUD, dibujar `"SFX: ON"` o `"SFX: OFF"` según `state.soundEnabled`. Prueba: el texto cambia en pantalla al pulsar S.

---

## Criterios de aceptación

- [x] Al romper un bloque se oye `break-sound.mp3`.
- [x] Al rebotar la bola en una pared lateral, el techo o la pala se oye `ball-bounce.mp3`.
- [x] Al impactar la bola con un bloque NO se oye `ball-bounce.mp3`.
- [x] Varios sonidos del mismo tipo reproducidos casi a la vez se solapan sin cortarse entre sí.
- [x] Pulsando `S` se silencia el sonido y el HUD muestra "SFX: OFF".
- [x] Pulsando `S` de nuevo se reactiva el sonido y el HUD muestra "SFX: ON".
- [x] Al reiniciar la partida, el sonido arranca en estado ON.

---

## Decisiones

- **Sí:** `cloneNode()` para solapar sonidos. Permite múltiples instancias del mismo audio sin gestión manual de un pool.
- **Sí:** `ball-bounce.mp3` solo en rebotes de superficie (paredes, techo, pala), no al impactar bloques. El `break-sound` ya cubre ese evento; el rebote adicional sonaría redundante.
- **Sí:** tecla `S` para el toggle. Convención habitual en juegos de escritorio; no requiere UI extra.
- **Sí:** indicador "SFX: ON/OFF" en el HUD. El jugador necesita feedback visual inmediato al pulsar S.
- **No:** persistencia del estado on/off entre sesiones. No justifica la complejidad de localStorage para un toggle tan simple.
- **No:** sonidos para pérdida de vida, Game Over o victoria. Solo existen dos assets de audio; ampliar el alcance requeriría otra spec.
