# SPEC 04 — Tres niveles de juego

- **Estado:** Aprobado
- **Fecha:** 2026-06-24
- **Depende de:** 01-mvp-arkanoid (implementado)
- **Objetivo:** Añadir 3 niveles consecutivos al juego, donde cada nivel aumenta la velocidad de la bola, la partida progresa automáticamente al completar cada nivel con una pantalla intermedia, y las vidas y puntuación se conservan entre niveles.

---

## Alcance

**Dentro:**

- 3 niveles consecutivos con velocidad de bola creciente (definida en `CONFIG.levels`).
- Al destruir todos los bloques de un nivel: pantalla de "Nivel X completado" con instrucción de continuar (Enter o clic).
- Al confirmar, se carga el siguiente nivel: rejilla completa regenerada, bola pegada a la pala, velocidad del nuevo nivel; vidas y puntuación se conservan.
- Al completar el nivel 3: se muestra la pantalla de victoria existente (`phase: 'win'`), sin cambios en ella.
- `state.level` almacena el nivel actual (1–3).
- El juego siempre arranca en el nivel 1.
- La pantalla de HUD muestra el nivel actual junto a puntuación y vidas.

**Fuera de alcance:**

- Layouts de bloques distintos por nivel (todos usan la misma rejilla 10×6).
- Incremento de velocidad progresivo durante el nivel (la velocidad es fija para cada nivel).
- Selección manual de nivel.
- Vidas extra al completar un nivel.
- Efectos visuales o de sonido específicos del cambio de nivel (se tratarán en otras specs si procede).
- Delta-time independiente de la tasa de refresco.

---

## Modelo de datos

Se amplía `CONFIG` con los datos de cada nivel y se añaden dos campos al estado global:

```js
const CONFIG = {
  // ... campos existentes sin cambios ...
  levels: [
    { ballSpeed: 5 },   // nivel 1 — igual que el MVP actual
    { ballSpeed: 7 },   // nivel 2
    { ballSpeed: 9 },   // nivel 3
  ],
};
```

```js
const state = {
  // ... campos existentes sin cambios ...
  level:  1,             // nivel actual (1–3)
  phase: 'start',        // nuevo valor posible: 'levelcomplete'
};
```

`phase: 'levelcomplete'` se usa exclusivamente entre niveles (pantalla "Nivel X completado"). Al reiniciar la partida completa, `level` vuelve a 1.

---

## Plan de implementación

Cada paso deja el juego ejecutable abriendo `index.html`.

1. **Añadir `CONFIG.levels` y `state.level` al estado inicial.** Incluir los tres objetos de nivel en `CONFIG` y `level: 1` en `state`. La velocidad inicial de la bola se lee de `CONFIG.levels[0].ballSpeed`. Prueba: el juego arranca y se comporta igual que antes.

2. **Mostrar el nivel en el HUD.** En la función de render del HUD, dibujar `"Nivel: X"` junto a puntuación y vidas. Prueba: el HUD muestra "Nivel: 1" durante la partida.

3. **Detectar nivel completado.** En `update()`, cuando todos los bloques están destruidos y `state.level < 3`, cambiar `phase` a `'levelcomplete'` en lugar de `'win'`. Si `state.level === 3`, seguir mostrando `'win'` como hasta ahora. Prueba: al destruir todos los bloques del nivel 1 o 2 aparece la nueva pantalla; al destruir los del nivel 3 aparece la victoria.

4. **Renderizar la pantalla `'levelcomplete'`.** En `render()`, para `phase === 'levelcomplete'` mostrar un overlay con "¡Nivel X completado!" e instrucción "Pulsa Enter o haz clic para continuar". Prueba: la pantalla se muestra correctamente al acabar el nivel.

5. **Transición al siguiente nivel.** Al recibir Enter o clic desde `'levelcomplete'`: incrementar `state.level`, regenerar la rejilla, reiniciar la bola pegada a la pala, aplicar `CONFIG.levels[state.level - 1].ballSpeed`; conservar vidas y puntuación; cambiar `phase` a `'playing'`. Prueba: el nivel 2 arranca con rejilla completa, mismas vidas y puntuación, y la bola va más rápida.

6. **Reinicio completo.** Al reiniciar desde Game Over o Victoria, `state.level` vuelve a 1 y la velocidad a `CONFIG.levels[0].ballSpeed`. Prueba: reiniciar desde cualquier pantalla final devuelve al nivel 1 con velocidad inicial.

---

## Criterios de aceptación

- [ ] El HUD muestra el nivel actual durante la partida.
- [ ] Al destruir todos los bloques del nivel 1 o 2 se muestra la pantalla "¡Nivel X completado!" en lugar de la victoria.
- [ ] Desde esa pantalla, Enter o clic carga el siguiente nivel con la rejilla completa y la bola pegada a la pala.
- [ ] Las vidas y la puntuación se conservan al pasar de nivel.
- [ ] La velocidad de la bola en el nivel 2 es mayor que en el nivel 1, y en el nivel 3 mayor que en el nivel 2.
- [ ] Al destruir todos los bloques del nivel 3 se muestra la pantalla de victoria existente.
- [ ] Al reiniciar desde Game Over o Victoria, el juego vuelve al nivel 1 con la velocidad inicial.

---

## Decisiones

- **Sí:** solo la velocidad cambia entre niveles (no el layout). Es el comportamiento clásico de Arkanoid y mantiene la spec acotada.
- **Sí:** `CONFIG.levels` como array de objetos. Permite añadir más propiedades por nivel en specs futuras sin cambiar la estructura.
- **Sí:** `phase: 'levelcomplete'` como estado propio. Mantiene la máquina de estados limpia y evita flags adicionales en `state`.
- **Sí:** vidas y puntuación se conservan entre niveles. Es el comportamiento estándar; perderlas sería confuso para el jugador.
- **Sí:** pantalla de victoria existente al acabar el nivel 3. Reusar la pantalla existente mantiene la spec pequeña; una pantalla especial de "fin de juego" se puede añadir en otra spec.
- **No:** selección de nivel. Se empieza siempre en el nivel 1; la progresión es lineal.
- **No:** vidas extra al completar un nivel. Añadiría complejidad de balance fuera del alcance de esta spec.
- **No:** layouts distintos por nivel. Se pospone a una spec futura si se desea mayor variedad visual.
