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
  ballSpeed: 5,          // px/frame, constante
  paddleSpeed: 7,        // px/frame con teclado
};

// ---------------------------------------------------------------------------
// Estado global del juego
// ---------------------------------------------------------------------------
const state = {
  phase: 'start',        // 'start' | 'playing' | 'win' | 'gameover'
  score: 0,
  lives: CONFIG.lives,
  paddle: { x: 0, y: 0, w: 100, h: 14 },
  ball:   { x: 0, y: 0, vx: 0, vy: 0, r: 7, stuck: true }, // stuck = pegada a la pala
  bricks: [],            // [{ x, y, w, h, color, alive }]
  input:  { left: false, right: false, mouseX: null },
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
  state.ball.vx = CONFIG.ballSpeed * Math.sin(angle);
  state.ball.vy = -CONFIG.ballSpeed * Math.cos(angle);
}

// Rebote en las paredes laterales y el techo. Reposiciona la bola dentro del
// canvas y fija el signo de la velocidad para evitar dobles rebotes.
function collideWalls() {
  const b = state.ball;
  if (b.x - b.r < 0)            { b.x = b.r;                 b.vx = Math.abs(b.vx); }
  if (b.x + b.r > CONFIG.width) { b.x = CONFIG.width - b.r;  b.vx = -Math.abs(b.vx); }
  if (b.y - b.r < 0)            { b.y = b.r;                 b.vy = Math.abs(b.vy); }
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

  for (let i = 0; i < steps; i++) {
    // Usa la velocidad actual en cada sub-paso: si rebota a mitad de frame,
    // los sub-pasos restantes ya siguen la nueva dirección.
    b.x += b.vx / steps;
    b.y += b.vy / steps;
    collideWalls();
    collidePaddle();
  }
}

// Actualiza la lógica del juego.
function update() {
  updatePaddle();
  updateBall();
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

// Dibuja el frame actual.
function render() {
  // Limpia el canvas en cada frame.
  ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);
  renderBricks();
  renderPaddle();
  renderBall();
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

// Lanzamiento de la bola: barra espaciadora o clic.
window.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault(); // evita el scroll de la página
    launchBall();
  }
});

canvas.addEventListener('click', () => {
  launchBall();
});

// Arranque: esperar a que la spritesheet esté lista antes de dibujar.
loadSpritesheet(() => {
  buildBricks();
  placePaddle();
  loop();
});
