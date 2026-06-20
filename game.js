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

// Actualiza la lógica del juego.
function update() {
  updatePaddle();
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

// Dibuja el frame actual.
function render() {
  // Limpia el canvas en cada frame.
  ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);
  renderBricks();
  renderPaddle();
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

// Arranque: esperar a que la spritesheet esté lista antes de dibujar.
loadSpritesheet(() => {
  buildBricks();
  placePaddle();
  loop();
});
