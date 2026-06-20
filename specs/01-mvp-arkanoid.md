# SPEC 01 — MVP jugable de Arkanoid

- **Estado:** Aprobado 
- **Fecha:** 2026-06-20
- **Depende de:** ninguna (primer spec del proyecto)
- **Objetivo:** Implementar un Arkanoid mínimo jugable en un canvas de 800×600 con pala (ratón y teclado), bola de rebote predecible, una rejilla de 10×6 bloques que se destruyen, 3 vidas, puntuación de 10 puntos por bloque y pantallas de inicio, victoria y Game Over.

---

## Alcance

**Dentro:**

- Canvas de 800×600 px dibujado con la API 2D y los sprites de `assets/spritesheet.js`.
- Pala controlada simultáneamente por ratón (sigue el cursor en horizontal) y teclado (flechas ←/→).
- Bola con física predecible: velocidad constante y rebote en paredes, techo y pala; el ángulo de salida en la pala depende del punto de impacto.
- Lanzamiento de la bola: empieza pegada a la pala y se lanza con clic o barra espaciadora (al inicio y tras perder vida).
- Rejilla fija de 10 columnas × 6 filas de bloques (un color por fila); cada bloque se destruye de un golpe y desaparece.
- Sistema de 3 vidas: se pierde una vida cuando la bola cae por debajo de la pala.
- Puntuación: 10 puntos por bloque destruido, visible en pantalla junto a las vidas (HUD).
- Cuatro estados de juego: **inicio**, **jugando**, **victoria** (todos los bloques destruidos), **Game Over** (0 vidas).
- Pantallas simples de inicio, victoria y Game Over, con reinicio mediante Enter o clic.
- Overlay semitransparente de "GAME OVER" (o vidas) y "¡GANASTE!" (cuando se hayan destruido todos los bloques)

**Fuera de alcance (para futuras specs):**

- Sonidos (`ball-bounce.mp3`, `break-sound.mp3`).
- Animación de explosión de bloques.
- Múltiples niveles y dificultad progresiva.
- Power-ups.
- Aceleración de la bola.
- Bloques de varios golpes o indestructibles.
- Persistencia de puntuaciones máximas (high-scores).
- Versión móvil / controles táctiles.

---

## Modelo de datos

Sin librerías ni clases obligatorias; estado en objetos planos dentro de `game.js`.

```js
// Constantes de configuración
const CONFIG = {
  width: 800,
  height: 600,
  lives: 3,
  pointsPerBlock: 10,
  cols: 10,
  rows: 6,
  rowColors: ['red', 'hotpink', 'yellow', 'green', 'cyan', 'magenta'], // fila 0 arriba
  ballSpeed: 5,          // px/frame, constante
  paddleSpeed: 7,        // px/frame con teclado
};

// Estado global del juego
const state = {
  phase: 'start',        // 'start' | 'playing' | 'win' | 'gameover'
  score: 0,
  lives: 3,
  paddle: { x: 0, y: 0, w: 100, h: 14 },
  ball:   { x: 0, y: 0, vx: 0, vy: 0, r: 7, stuck: true }, // stuck = pegada a la pala
  bricks: [],            // [{ x, y, w, h, color, alive }]
  input:  { left: false, right: false, mouseX: null },
};
```

```js
// Cada bloque de la rejilla
// { x, y, w, h, color: 'red', alive: true }
```

**Convenciones:**

- Origen de coordenadas: esquina superior izquierda.
- Velocidades en píxeles por frame.
- La rejilla se centra horizontalmente; el tamaño de bloque y los márgenes se calculan a partir de `cols`/`rows` y un hueco fijo entre bloques.
- `ball.stuck === true`: la bola sigue a la pala y no se mueve hasta el lanzamiento.
- Total de bloques = 60 → puntuación máxima = 600.

---

## Plan de implementación

Cada paso deja el sistema ejecutable abriendo `index.html` en el navegador.

1. **Crear `index.html`** con el `<canvas id="game" width="800" height="600">`, estilos mínimos inline (centrado, fondo oscuro) y los `<script>` a `assets/spritesheet.js` y `game.js`. Prueba: la página carga sin errores en consola y se ve el canvas negro.

2. **Crear `game.js` con arranque y bucle.** Definir `CONFIG` y `state`, obtener el contexto 2D, llamar a `loadSpritesheet` y montar el `requestAnimationFrame` con `update()` y `render()` vacíos. Prueba: consola sin errores; el bucle corre.

3. **Inicializar la rejilla y la pala.** Función que rellena `state.bricks` (10×6, color por fila, centrada) y posiciona la pala. Render de bloques y pala con `drawSprite`. Prueba: se ven los 60 bloques de colores y la pala.

4. **Control de la pala (ratón + teclado).** Listeners de `mousemove`, `keydown`/`keyup` (←/→). `update()` mueve la pala respetando los bordes. Prueba: la pala se mueve con ambos controles y no sale del canvas.

5. **Bola pegada y lanzamiento.** Dibujar la bola sobre la pala mientras `stuck`; al hacer clic o pulsar espacio, lanzar hacia arriba. Prueba: la bola sigue a la pala y se lanza al disparar.

6. **Física de la bola: paredes, pala y sub-pasos.** Mover la bola repartiendo `vx/vy` en sub-pasos de tamaño ≤ `min(brickH, paddle.h)/2` para evitar tunneling; rebote en laterales y techo, y rebote en la pala con ángulo según el punto de impacto. Prueba: la bola rebota de forma predecible y no atraviesa la pala ni a alta velocidad.

7. **Colisión bola-bloque y puntuación.** Detectar impacto con bloques `alive`, marcar `alive=false`, invertir la componente vertical, sumar 10 puntos. Prueba: romper un bloque lo elimina y suma 10.

8. **Vidas y caída de la bola.** Si la bola cae por debajo del canvas, restar una vida y volver a dejar la bola pegada; a 0 vidas, `phase='gameover'`. Prueba: perder la bola resta vida; a las 3 caídas pasa a Game Over.

9. **HUD.** Dibujar puntuación y vidas en pantalla durante `playing`. Prueba: el marcador y las vidas se actualizan en tiempo real.

10. **Estados y pantallas (inicio / victoria / Game Over).** Render por `phase`; pantalla de inicio inicial; victoria al destruir los 60 bloques; reinicio con Enter o clic que resetea `state`. Prueba: ciclo completo inicio → jugar → victoria/Game Over → reinicio.

---

## Criterios de aceptación

- [ ] La página carga abriendo `index.html` sin errores en la consola.
- [ ] Se muestra una pantalla de inicio y la partida arranca con Enter o clic.
- [ ] Al empezar (y tras perder vida) la bola aparece pegada a la pala y se lanza con clic o barra espaciadora.
- [ ] La pala se mueve con el ratón y con las flechas ←/→, y nunca sale del canvas.
- [ ] Se dibujan 60 bloques (10 columnas × 6 filas), un color por fila, centrados.
- [ ] La bola rebota en las paredes laterales, el techo y la pala.
- [ ] El ángulo de rebote en la pala cambia según el punto de impacto (centro = más vertical, extremos = más abierto).
- [ ] La velocidad de la bola se mantiene constante durante toda la partida.
- [ ] La bola nunca atraviesa un bloque ni la pala (se rompe/rebota el primer obstáculo en su trayectoria dentro del frame).
- [ ] Romper un bloque lo elimina y suma exactamente 10 puntos.
- [ ] El HUD muestra puntuación y vidas actualizadas en tiempo real.
- [ ] Cuando la bola cae por debajo de la pala se pierde una vida.
- [ ] Al llegar a 0 vidas se muestra la pantalla de Game Over.
- [ ] Al destruir los 60 bloques se muestra la pantalla de Victoria.
- [ ] Desde Victoria o Game Over, Enter o clic reinicia una partida nueva (puntuación 0, 3 vidas, rejilla completa).

---

## Decisiones

- **Sí:** un único archivo `game.js` con estado en objetos planos (sin clases). El MVP es pequeño y no justifica una arquitectura mayor.
- **Sí:** estilos inline en `index.html`. Cero dependencias y poco CSS; no merece un `styles.css` aparte todavía.
- **Sí:** ratón y teclado activos a la vez. Más cómodo y no añade complejidad real.
- **Sí:** bola pegada a la pala con lanzamiento manual (clic / espacio). Da control al jugador y es el patrón clásico.
- **Sí:** rebote en la pala según el punto de impacto. Sigue siendo predecible y evita bucles aburridos de reflexión pura.
- **Sí:** velocidad constante de la bola. Cumple el requisito de "física predecible".
- **Sí:** movimiento por sub-pasos (colisión continua). Elimina el tunneling de raíz en lugar de solo mitigarlo limitando la velocidad.
- **Sí:** colisión bola-bloque resuelta invirtiendo solo la componente vertical. Suficiente para el MVP; el rebote lateral fino se deja para más adelante.
- **No:** sonidos en el MVP. Los assets existen pero se posponen a otra spec.
- **No:** animación de explosión. El bloque simplemente desaparece; se pospone.
- **No:** múltiples niveles, power-ups, aceleración y high-scores. Cada uno irá en su propia spec.
- **No:** clases/módulos ES o bundler. Mantener cero dependencias y carga directa por `<script>`.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| **Tunneling** a velocidad alta. | **Eliminado** mediante movimiento por sub-pasos: cada sub-paso es ≤ medio bloque, así que la bola siempre detecta el obstáculo antes de cruzarlo. |
| **Bucles aburridos**: la bola queda rebotando casi horizontal y no baja. | El rebote en la pala depende del punto de impacto, lo que rompe trayectorias planas. |
| **Doble colisión** con varios bloques en un mismo frame. | Procesar un solo impacto por frame (el primer bloque detectado) e invertir la vertical una vez. |
| **`requestAnimationFrame` ligado a la tasa de refresco** (física más rápida en pantallas de 120 Hz). | Aceptado en el MVP; si molesta, se pasa a delta-time en otra spec. |

---

## Lo que **no** entra en esta spec

- Sonidos y animación de explosión.
- Múltiples niveles, power-ups y aceleración de la bola.
- High-scores y persistencia.
- Controles táctiles / versión móvil.
- Física con delta-time independiente de la tasa de refresco.

Cada uno, si se aborda, irá en su propia spec.
