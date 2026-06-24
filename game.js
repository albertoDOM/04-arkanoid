// game.js — Lógica del juego Arkanoid (MVP).
// Cero dependencias; estado en objetos planos. Ver specs/01-mvp-arkanoid.md.

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------
const CONFIG = {
  width: 800,
  height: 600,
  lives: 3,
  pointsPerBlock: 10,
  cols: 10,
  rows: 6,
  rowColors: ['red', 'hotpink', 'yellow', 'green', 'cyan', 'magenta'], // fila 0 arriba
  paddleSpeed: 7,        // px/frame con teclado
  levels: [
    { ballSpeed: 5 },    // nivel 1
    { ballSpeed: 7 },    // nivel 2
    { ballSpeed: 9 },    // nivel 3
  ],
};

// ---------------------------------------------------------------------------
// Sonidos
// ---------------------------------------------------------------------------
const SOUNDS = {
  bounce: new Audio('assets/sounds/ball-bounce.mp3'),
  break:  new Audio('assets/sounds/break-sound.mp3'),
};

// Reproduce el sonido indicado clonando el nodo para permitir solapamiento.
function playSound(name) {
  if (!state.soundEnabled) return;
  SOUNDS[name].cloneNode().play();
}

// ---------------------------------------------------------------------------
// Estado global del juego
// ---------------------------------------------------------------------------
const state = {
  phase: 'start',        // 'start' | 'playing' | 'win' | 'gameover' | 'levelcomplete'
  score: 0,
  lives: CONFIG.lives,
  level: 1,              // nivel actual (1–3)
  paddle: { x: 0, y: 0, w: 100, h: 14 },
  ball:   { x: 0, y: 0, vx: 0, vy: 0, r: 7, stuck: true }, // stuck = pegada a la pala
  bricks:     [],        // [{ x, y, w, h, color, alive }]
  explosions: [],        // [{ x, y, w, h, color, startTime }]
  input:  { left: false, right: false, mouseX: null },
  soundEnabled: true,    // toggled con tecla S
};

// ---------------------------------------------------------------------------
// Contexto de dibujado
// ---------------------------------------------------------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ---------------------------------------------------------------------------
// Disposición de la rejilla (calculada a partir de cols/rows y un hueco fijo)
// ---------------------------------------------------------------------------
const LAYOUT = {
  brickW: 72,   // ancho de cada bloque
  brickH: 24,   // alto de cada bloque
  gap: 4,       // hueco fijo entre bloques (horizontal y vertical)
  topOffset: 50, // margen superior antes de la primera fila (deja sitio al HUD)
};

// ---------------------------------------------------------------------------
// Inicialización de la rejilla y la pala
// ---------------------------------------------------------------------------

// Rellena state.bricks con una rejilla de cols×rows centrada horizontalmente.
// Un color por fila según CONFIG.rowColors.
function buildBricks() {
  const { cols, rows, rowColors } = CONFIG;
  const { brickW, brickH, gap, topOffset } = LAYOUT;

  // Ancho total de la rejilla para centrarla en el canvas.
  const gridWidth = cols * brickW + (cols - 1) * gap;
  const startX = (CONFIG.width - gridWidth) / 2;

  state.bricks = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      state.bricks.push({
        x: startX + col * (brickW + gap),
        y: topOffset + row * (brickH + gap),
        w: brickW,
        h: brickH,
        color: rowColors[row],
        alive: true,
      });
    }
  }
}

// Coloca la pala centrada y cerca del borde inferior del canvas.
function placePaddle() {
  state.paddle.x = (CONFIG.width - state.paddle.w) / 2;
  state.paddle.y = CONFIG.height - 40;
}

// Reinicia una partida nueva: puntuación 0, vidas completas, rejilla completa,
// pala centrada, bola pegada y fase de inicio.
function resetGame() {
  state.phase = 'start';
  state.score = 0;
  state.lives = CONFIG.lives;
  buildBricks();
  placePaddle();
  state.ball.stuck = true;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.explosions = [];
}

// ---------------------------------------------------------------------------
// Bucle principal
// ---------------------------------------------------------------------------

// Restringe un valor al rango [min, max].
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Mueve la pala según teclado y/o ratón, sin salir del canvas.
function updatePaddle() {
  const p = state.paddle;

  // Teclado: desplaza la pala a velocidad constante.
  if (state.input.left)  p.x -= CONFIG.paddleSpeed;
  if (state.input.right) p.x += CONFIG.paddleSpeed;

  // Ratón: si hay posición registrada, centra la pala en el cursor.
  if (state.input.mouseX !== null) {
    p.x = state.input.mouseX - p.w / 2;
  }

  // Respeta los bordes del canvas.
  p.x = clamp(p.x, 0, CONFIG.width - p.w);
}

// Lanza la bola hacia arriba si está pegada a la pala.
// Sale con un ángulo ligeramente inclinado para evitar trayectorias verticales.
function launchBall() {
  if (!state.ball.stuck) return;
  state.ball.stuck = false;
  const angle = 0.35; // radianes respecto a la vertical (~20°)
  const speed = CONFIG.levels[state.level - 1].ballSpeed;
  state.ball.vx = speed * Math.sin(angle);
  state.ball.vy = -speed * Math.cos(angle);
}

// Rebote en las paredes laterales y el techo. Reposiciona la bola dentro del
// canvas y fija el signo de la velocidad para evitar dobles rebotes.
function collideWalls() {
  const b = state.ball;
  let hit = false;
  if (b.x - b.r < 0)            { b.x = b.r;                 b.vx = Math.abs(b.vx);  hit = true; }
  if (b.x + b.r > CONFIG.width) { b.x = CONFIG.width - b.r;  b.vx = -Math.abs(b.vx); hit = true; }
  if (b.y - b.r < 0)            { b.y = b.r;                 b.vy = Math.abs(b.vy);  hit = true; }
  if (hit) playSound('bounce');
}

// Rebote en la pala: solo si la bola baja y solapa la pala. El ángulo de salida
// depende del punto de impacto (centro = vertical, extremos = más abierto).
// La velocidad se mantiene constante (magnitud = CONFIG.ballSpeed).
function collidePaddle() {
  const b = state.ball;
  const p = state.paddle;
  const overlaps =
    b.vy > 0 &&
    b.y + b.r >= p.y && b.y - b.r <= p.y + p.h &&
    b.x + b.r >= p.x && b.x - b.r <= p.x + p.w;
  if (!overlaps) return;

  // Punto de impacto normalizado en [-1, 1] respecto al centro de la pala.
  const hit = clamp((b.x - (p.x + p.w / 2)) / (p.w / 2), -1, 1);
  const maxAngle = Math.PI / 3; // 60° máximo respecto a la vertical
  const angle = hit * maxAngle;
  b.vx = CONFIG.ballSpeed * Math.sin(angle);
  b.vy = -CONFIG.ballSpeed * Math.cos(angle);
  b.y = p.y - b.r; // recoloca encima de la pala para no quedarse pegada
  playSound('bounce');
}

// Colisión bola-bloque. Detecta el primer bloque vivo que solapa la bola,
// lo destruye, invierte solo la componente vertical y suma puntos.
// Devuelve true si hubo impacto (para procesar uno solo por frame).
function collideBricks() {
  const b = state.ball;
  for (const brick of state.bricks) {
    if (!brick.alive) continue;
    const overlaps =
      b.x + b.r > brick.x && b.x - b.r < brick.x + brick.w &&
      b.y + b.r > brick.y && b.y - b.r < brick.y + brick.h;
    if (!overlaps) continue;

    brick.alive = false;
    playSound('break');
    state.explosions.push({ x: brick.x, y: brick.y, w: brick.w, h: brick.h, color: brick.color, startTime: performance.now() });
    b.vy = -b.vy;
    state.score += CONFIG.pointsPerBlock;
    return true;
  }
  return false;
}

// Pierde una vida: deja la bola pegada de nuevo y, si no quedan vidas,
// pasa a Game Over. Dejarla pegada también detiene su caída.
function loseLife() {
  state.lives--;
  state.ball.stuck = true;
  state.ball.vx = 0;
  state.ball.vy = 0;
  if (state.lives <= 0) state.phase = 'gameover';
}

// Actualiza la posición de la bola.
// Mientras está pegada, sigue a la pala; al lanzarse, se mueve por sub-pasos
// (cada uno ≤ medio bloque/pala) para evitar tunneling, rebotando en cada uno.
function updateBall() {
  const b = state.ball;
  if (b.stuck) {
    b.x = state.paddle.x + state.paddle.w / 2;
    b.y = state.paddle.y - b.r;
    return;
  }

  // Reparte el desplazamiento del frame en sub-pasos pequeños.
  const maxStep = Math.min(LAYOUT.brickH, state.paddle.h) / 2;
  const speed = Math.hypot(b.vx, b.vy);
  const steps = Math.max(1, Math.ceil(speed / maxStep));

  // Solo se procesa un impacto con bloque por frame (mitiga dobles colisiones).
  let brickHit = false;

  for (let i = 0; i < steps; i++) {
    // Usa la velocidad actual en cada sub-paso: si rebota a mitad de frame,
    // los sub-pasos restantes ya siguen la nueva dirección.
    b.x += b.vx / steps;
    b.y += b.vy / steps;
    collideWalls();
    collidePaddle();
    if (!brickHit) brickHit = collideBricks();
  }

  // Caída por debajo de la pala: la bola sale del canvas por abajo.
  if (b.y - b.r > CONFIG.height) loseLife();
}

// Actualiza la lógica del juego. Solo se simula durante la fase 'playing'.
function update() {
  if (state.phase !== 'playing') return;
  updatePaddle();
  updateBall();
  // Elimina las explosiones cuya duración ha expirado.
  const now = performance.now();
  state.explosions = state.explosions.filter((exp) => now - exp.startTime < EXPLOSION_DURATION);
  // Victoria: todos los bloques destruidos.
  if (state.bricks.every((brick) => !brick.alive)) state.phase = 'win';
}

// Dibuja los bloques vivos de la rejilla.
function renderBricks() {
  for (const brick of state.bricks) {
    if (!brick.alive) continue;
    drawSprite(ctx, 'block_' + brick.color, brick.x, brick.y, brick.w, brick.h);
  }
}

// Dibuja la pala.
function renderPaddle() {
  const p = state.paddle;
  drawSprite(ctx, 'paddle', p.x, p.y, p.w, p.h);
}

// Dibuja la bola.
function renderBall() {
  const b = state.ball;
  drawSprite(ctx, 'ball', b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
}

// Dibuja el HUD: puntuación a la izquierda y vidas a la derecha.
function renderHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '20px monospace';
  ctx.textBaseline = 'top';

  ctx.textAlign = 'left';
  ctx.fillText('PUNTOS: ' + state.score, 12, 12);

  ctx.textAlign = 'right';
  ctx.fillText('VIDAS: ' + state.lives, CONFIG.width - 12, 12);
}

// Dibuja un texto centrado horizontalmente a la altura dada.
function drawCenteredText(text, y, font, color) {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, CONFIG.width / 2, y);
}

// Pantalla de inicio.
function renderStartScreen() {
  drawCenteredText('ARKANOID', CONFIG.height / 2 - 40, 'bold 56px monospace', '#fff');
  drawCenteredText('Pulsa Enter o haz clic para jugar', CONFIG.height / 2 + 30, '24px monospace', '#ccc');
}

// Overlay semitransparente con un título y la puntuación (victoria / Game Over).
function renderOverlay(title) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  drawCenteredText(title, CONFIG.height / 2 - 40, 'bold 56px monospace', '#fff');
  drawCenteredText('Puntuación: ' + state.score, CONFIG.height / 2 + 20, '28px monospace', '#fff');
  drawCenteredText('Pulsa Enter o haz clic para reiniciar', CONFIG.height / 2 + 70, '22px monospace', '#ccc');
}

// Dibuja las explosiones activas usando los frames del spritesheet.
function renderExplosions() {
  const now = performance.now();
  for (const exp of state.explosions) {
    const elapsed = now - exp.startTime;
    const frameIndex = Math.min(Math.floor(elapsed / EXPLOSION_DURATION * 4), 3);
    const frame = EXPLOSION_FRAMES[exp.color][frameIndex];
    drawFrame(ctx, frame, exp.x, exp.y, exp.w, exp.h);
  }
}

// Dibuja el frame actual según la fase.
function render() {
  // Limpia el canvas en cada frame.
  ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);

  if (state.phase === 'start') {
    renderStartScreen();
    return;
  }

  // 'playing', 'win' y 'gameover' muestran el tablero.
  renderBricks();
  renderExplosions();
  renderPaddle();
  renderBall();
  renderHUD();

  if (state.phase === 'win')      renderOverlay('¡GANASTE!');
  if (state.phase === 'gameover') renderOverlay('GAME OVER');
}

// Bucle ligado a requestAnimationFrame.
function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
// Entrada del usuario (ratón + teclado)
// ---------------------------------------------------------------------------

// Ratón: convierte la posición del cursor a coordenadas del canvas.
// Mover el ratón reactiva el control por ratón.
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  // Escala por si el canvas se muestra a un tamaño distinto al real.
  const scaleX = CONFIG.width / rect.width;
  state.input.mouseX = (e.clientX - rect.left) * scaleX;
});

// Teclado: flechas ←/→ mueven la pala. Pulsar una flecha desactiva el ratón
// para que el teclado tome el control hasta el siguiente movimiento de ratón.
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft')  { state.input.left = true;  state.input.mouseX = null; }
  if (e.key === 'ArrowRight') { state.input.right = true; state.input.mouseX = null; }
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft')  state.input.left = false;
  if (e.key === 'ArrowRight') state.input.right = false;
});

// Acción principal (Enter o clic): avanza de pantalla o lanza la bola.
function primaryAction() {
  if (state.phase === 'start') {
    state.phase = 'playing';
  } else if (state.phase === 'win' || state.phase === 'gameover') {
    resetGame(); // vuelve a la pantalla de inicio con una partida nueva
  } else if (state.phase === 'playing') {
    launchBall();
  }
}

// Enter: solo cambia de pantalla (no lanza la bola).
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (state.phase === 'start') state.phase = 'playing';
    else if (state.phase === 'win' || state.phase === 'gameover') resetGame();
  }
});

// Barra espaciadora: lanza la bola durante el juego.
window.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault(); // evita el scroll de la página
    if (state.phase === 'playing') launchBall();
  }
});

// Clic: acción principal según la fase.
canvas.addEventListener('click', () => {
  primaryAction();
});

// Arranque: esperar a que la spritesheet esté lista antes de dibujar.
loadSpritesheet(() => {
  resetGame();
  loop();
});
