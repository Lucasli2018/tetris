# Tetris 游戏实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 开发一个纯浏览器运行的俄罗斯方块游戏，交付为单个 HTML 文件，包含标准规则、音效、最高分记录、难度递增和颜色主题。

**Architecture:** 采用逻辑与渲染分离的架构。游戏逻辑层（Board、Piece、Game、Score、Sound）为纯函数，无 DOM 操作；渲染层使用 Canvas 绘制；输入层将键盘、鼠标、触摸事件转换为逻辑调用；音效层使用 Web Audio API 合成。

**Tech Stack:** HTML5 Canvas、原生 JavaScript（ES6+）、Web Audio API、localStorage

**Spec:** `tetris/docs/superpowers/specs/2026-09-22-tetris-design.md`

---

## Global Constraints

- 单文件交付：所有 HTML、CSS、JavaScript 内联于 `index.html`
- 零外部依赖：无 npm 包、无图片、无音频文件
- 逻辑层与渲染层分离，逻辑层可独立测试
- 使用 Canvas 渲染，requestAnimationFrame 驱动游戏循环
- 使用 Web Audio API 合成音效
- 最高分使用 localStorage 持久化
- 支持 7 种标准方块（I、O、T、S、Z、J、L）
- 支持消行计分、难度递增、暂停/继续、重新开始

---

## 任务分解

### Task 1: 项目脚手架与基础结构

**Files:**
- Create: `tetris/index.html`
- Create: `tetris/README.md`

**Interfaces:**
- 无外部依赖，为后续任务提供基础文件结构

- [ ] **Step 1: 创建 HTML 骨架**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>俄罗斯方块</title>
    <style>
        /* 全局样式 */
    </style>
</head>
<body>
    <div id="app">
        <!-- 游戏容器 -->
    </div>
    <script>
        // 游戏逻辑
    </script>
</body>
</html>
```

- [ ] **Step 2: 创建 README.md**

```markdown
# 俄罗斯方块

一个纯浏览器运行的俄罗斯方块游戏，单 HTML 文件交付。

## 功能
- 标准俄罗斯方块规则
- Web Audio API 合成音效
- 最高分记录
- 难度递增
- 方块颜色主题

## 运行
直接双击 `index.html` 打开即可。

## 操作
- ←/→：左右移动
- ↓：加速下落
- ↑/X：顺时针旋转
- Z：逆时针旋转
- 空格：瞬间下落
- P/Esc：暂停/继续
- R：重新开始
```

- [ ] **Step 3: 验证文件结构**

```bash
# 确认 index.html 和 README.md 存在
# 确认无外部资源引用
```

---

### Task 2: 游戏逻辑层 - 棋盘与方块

**Files:**
- Create: `tetris/index.html`（内联 script 部分）

**Interfaces:**
- 无外部依赖
- 为 Task 3 提供 `Board`、`Piece` 数据结构

- [ ] **Step 1: 定义棋盘数据结构**

```javascript
const COLS = 10;
const ROWS = 20;
const EMPTY = null;

function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
}

function isCellFilled(board, row, col) {
    return board[row] && board[row][col] !== EMPTY;
}

function isCellEmpty(board, row, col) {
    return row >= 0 && row < ROWS && col >= 0 && col < COLS && board[row][col] === EMPTY;
}

function isOutOfBounds(row, col) {
    return row < 0 || row >= ROWS || col < 0 || col >= COLS;
}
```

- [ ] **Step 2: 定义方块数据结构**

```javascript
const PIECES = {
    I: { color: '#00f0f0', matrix: [[1,1,1,1]] },
    O: { color: '#f0f000', matrix: [[1,1],[1,1]] },
    T: { color: '#a000f0', matrix: [[0,1,0],[1,1,1]] },
    S: { color: '#00f000', matrix: [[0,1,1],[1,1,0]] },
    Z: { color: '#f00000', matrix: [[1,1,0],[0,1,1]] },
    J: { color: '#0000f0', matrix: [[1,0,0],[1,1,1]] },
    L: { color: '#f0a000', matrix: [[0,0,1],[1,1,1]] }
};

function createPiece(type) {
    const piece = PIECES[type];
    return {
        type,
        color: piece.color,
        matrix: piece.matrix,
        x: Math.floor(COLS / 2) - Math.floor(piece.matrix[0].length / 2),
        y: 0
    };
}

function rotateMatrix(matrix) {
    const N = matrix.length;
    const M = matrix[0].length;
    const rotated = Array.from({ length: M }, () => Array(N).fill(0));
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < M; x++) {
            rotated[x][N - 1 - y] = matrix[y][x];
        }
    }
    return rotated;
}

function rotatePiece(piece, direction) {
    const rotated = rotateMatrix(piece.matrix);
    return {
        ...piece,
        matrix: direction === 'clockwise' ? rotated : rotateMatrix(rotated)
    };
}
```

- [ ] **Step 3: 验证数据结构**

```javascript
// 在浏览器控制台运行
console.log(createBoard());
console.log(createPiece('T'));
console.log(rotatePiece(createPiece('T'), 'clockwise'));
```

---

### Task 3: 游戏逻辑层 - 碰撞检测与消行

**Files:**
- Create: `tetris/index.html`（内联 script 部分）

**Interfaces:**
- 使用 Task 2 的 `Board`、`Piece` 数据结构
- 为 Task 4 提供 `collides`、`clearLines` 函数

- [ ] **Step 1: 实现碰撞检测**

```javascript
function collides(piece, board) {
    for (let y = 0; y < piece.matrix.length; y++) {
        for (let x = 0; x < piece.matrix[y].length; x++) {
            if (piece.matrix[y][x]) {
                const boardX = piece.x + x;
                const boardY = piece.y + y;
                if (isOutOfBounds(boardY, boardX) || isCellFilled(board, boardY, boardX)) {
                    return true;
                }
            }
        }
    }
    return false;
}
```

- [ ] **Step 2: 实现消行逻辑**

```javascript
function clearLines(board) {
    let linesCleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== EMPTY)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(EMPTY));
            linesCleared++;
            y++; // 重新检查当前行
        }
    }
    return linesCleared;
}
```

- [ ] **Step 3: 验证碰撞与消行**

```javascript
// 在浏览器控制台运行
const board = createBoard();
board[19].fill({ type: 'I', color: '#00f0f0' });
console.log(clearLines(board)); // 期望输出 1
```

---

### Task 4: 游戏逻辑层 - 游戏流程与状态机

**Files:**
- Create: `tetris/index.html`（内联 script 部分）

**Interfaces:**
- 使用 Task 2、Task 3 的函数
- 为 Task 5 提供 `Game` 对象

- [ ] **Step 1: 定义游戏状态机**

```javascript
const GameState = {
    READY: 'ready',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
};
```

- [ ] **Step 2: 实现 Game 对象**

```javascript
function createGame() {
    return {
        state: GameState.READY,
        board: createBoard(),
        piece: null,
        nextPiece: null,
        score: 0,
        lines: 0,
        level: 1,
        dropInterval: 1000,
        lastDrop: 0,
        bag: [],

        start() {
            this.state = GameState.PLAYING;
            this.board = createBoard();
            this.score = 0;
            this.lines = 0;
            this.level = 1;
            this.dropInterval = 1000;
            this.bag = [];
            this.nextPiece = this.getNextPiece();
            this.spawnPiece();
        },

        spawnPiece() {
            this.piece = this.nextPiece;
            this.nextPiece = this.getNextPiece();
            if (collides(this.piece, this.board)) {
                this.state = GameState.GAME_OVER;
            }
        },

        getNextPiece() {
            if (this.bag.length === 0) {
                this.bag = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
                // Fisher-Yates shuffle
                for (let i = this.bag.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
                }
            }
            return createPiece(this.bag.pop());
        },

        move(dx, dy) {
            if (this.state !== GameState.PLAYING) return false;
            const moved = { ...this.piece, x: this.piece.x + dx, y: this.piece.y + dy };
            if (!collides(moved, this.board)) {
                this.piece = moved;
                return true;
            }
            return false;
        },

        rotate(direction) {
            if (this.state !== GameState.PLAYING) return false;
            const rotated = rotatePiece(this.piece, direction);
            if (!collides(rotated, this.board)) {
                this.piece = rotated;
                return true;
            }
            return false;
        },

        hardDrop() {
            if (this.state !== GameState.PLAYING) return 0;
            let distance = 0;
            while (this.move(0, 1)) distance++;
            this.lockPiece();
            return distance;
        },

        lockPiece() {
            this.piece.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        this.board[this.piece.y + y][this.piece.x + x] = {
                            type: this.piece.type,
                            color: this.piece.color
                        };
                    }
                });
            });
            const linesCleared = clearLines(this.board);
            this.lines += linesCleared;
            this.score += this.calculateScore(linesCleared);
            this.level = Math.floor(this.lines / 10) + 1;
            this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
            this.spawnPiece();
        },

        calculateScore(linesCleared) {
            const points = [0, 100, 300, 500, 800];
            return points[linesCleared] * this.level;
        },

        tick(timestamp) {
            if (this.state !== GameState.PLAYING) return;
            if (!this.lastDrop) this.lastDrop = timestamp;
            const elapsed = timestamp - this.lastDrop;
            if (elapsed > this.dropInterval) {
                this.move(0, 1);
                this.lastDrop = timestamp;
            }
        },

        pause() {
            if (this.state === GameState.PLAYING) {
                this.state = GameState.PAUSED;
            } else if (this.state === GameState.PAUSED) {
                this.state = GameState.PLAYING;
            }
        },

        reset() {
            this.start();
        }
    };
}
```

- [ ] **Step 3: 验证游戏流程**

```javascript
// 在浏览器控制台运行
const game = createGame();
game.start();
console.log(game.state); // 期望输出 'playing'
game.pause();
console.log(game.state); // 期望输出 'paused'
game.pause();
console.log(game.state); // 期望输出 'playing'
```

---

### Task 5: 渲染层 - Canvas 绘制

**Files:**
- Create: `tetris/index.html`（内联 script 部分）

**Interfaces:**
- 使用 Task 4 的 `Game` 对象
- 为 Task 6 提供 `render` 函数

- [ ] **Step 1: 初始化 Canvas**

```javascript
const canvas = document.getElementById('tetris-canvas');
const ctx = canvas.getContext('2d');
const BLOCK_SIZE = 30;
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;
```

- [ ] **Step 2: 实现棋盘渲染**

```javascript
function drawBoard(board) {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制网格
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(canvas.width, y * BLOCK_SIZE);
        ctx.stroke();
    }

    // 绘制已固定方块
    board.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell) {
                drawBlock(x, y, cell.color);
            }
        });
    });
}

function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.strokeRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
}
```

- [ ] **Step 3: 实现方块渲染**

```javascript
function drawPiece(piece) {
    piece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(piece.x + x, piece.y + y, piece.color);
            }
        });
    });
}
```

- [ ] **Step 4: 实现幽灵块和下一块预览渲染**

```javascript
function getGhostPosition(piece, board) {
    let ghostY = piece.y;
    while (!collides({ ...piece, y: ghostY + 1 }, board)) ghostY++;
    return { x: piece.x, y: ghostY };
}

function drawGhost(game) {
    if (!game.piece) return;
    const ghost = getGhostPosition(game.piece, game.board);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    game.piece.matrix.forEach((row, y) => {
        row.forEach((val, x) => {
            if (val) {
                ctx.strokeRect((ghost.x + x) * BLOCK_SIZE + 1, (ghost.y + y) * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
            }
        });
    });
}

function drawNextPiece(game) {
    if (!game.nextPiece) return;
    // 在右侧小区域绘制下一块预览
    const offsetX = COLS * BLOCK_SIZE + 20;
    const offsetY = 20;
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.fillText('NEXT', offsetX, offsetY);
    game.nextPiece.matrix.forEach((row, y) => {
        row.forEach((val, x) => {
            if (val) drawBlockAt(x + 2, y + 2, game.nextPiece.color, offsetX, offsetY);
        });
    });
}

function drawBlockAt(x, y, color, offsetX = 0, offsetY = 0) {
    ctx.fillStyle = color;
    ctx.fillRect(offsetX + x * BLOCK_SIZE + 1, offsetY + y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
}
```

- [ ] **Step 5: 实现渲染函数**

```javascript
function render(game) {
    drawBoard(game.board);
    if (game.piece) {
        drawGhost(game);
        drawPiece(game.piece);
    }
    drawNextPiece(game);
}
```

- [ ] **Step 5: 验证渲染**

```javascript
// 在浏览器中打开 index.html
// 确认 Canvas 正常显示棋盘和方块
```

---

### Task 6: 输入层 - 键盘与鼠标控制

**Files:**
- Create: `tetris/index.html`（内联 script 部分）

**Interfaces:**
- 使用 Task 4 的 `Game` 对象
- 为 Task 7 提供输入处理函数

- [ ] **Step 1: 实现键盘事件处理**

```javascript
function handleKeyDown(event, game) {
    switch (event.key) {
        case 'ArrowLeft':
            game.move(-1, 0);
            break;
        case 'ArrowRight':
            game.move(1, 0);
            break;
        case 'ArrowDown':
            game.move(0, 1);
            break;
        case 'ArrowUp':
        case 'x':
        case 'X':
            game.rotate('clockwise');
            break;
        case 'z':
        case 'Z':
            game.rotate('counterclockwise');
            break;
        case ' ':
            event.preventDefault();
            game.hardDrop();
            break;
        case 'p':
        case 'P':
        case 'Escape':
            game.pause();
            break;
        case 'r':
        case 'R':
            game.reset();
            break;
    }
}

document.addEventListener('keydown', (event) => {
    handleKeyDown(event, game);
});
```

- [ ] **Step 2: 实现鼠标按钮**

```javascript
document.getElementById('start-btn').addEventListener('click', () => {
    game.start();
});

document.getElementById('pause-btn').addEventListener('click', () => {
    game.pause();
});

document.getElementById('reset-btn').addEventListener('click', () => {
    game.reset();
});
```

- [ ] **Step 3: 验证输入**

```javascript
// 在浏览器中测试键盘和鼠标输入
// 确认方块能够移动、旋转、下落、暂停、重新开始
```

---

### Task 7: 音效层 - Web Audio API

**Files:**
- Create: `tetris/index.html`（内联 script 部分）

**Interfaces:**
- 使用 Task 4 的 `Game` 对象
- 为 Task 8 提供音效函数

- [ ] **Step 1: 初始化 AudioContext**

```javascript
let audioContext = null;

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

function playTone(frequency, duration, type = 'sine', volume = 0.1) {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
}
```

- [ ] **Step 2: 实现音效函数**

```javascript
function playMoveSound() {
    playTone(200, 0.05, 'square', 0.05);
}

function playRotateSound() {
    playTone(300, 0.05, 'square', 0.05);
}

function playClearSound(linesCleared) {
    const notes = [440, 554, 659, 880];
    notes.slice(0, linesCleared).forEach((note, index) => {
        setTimeout(() => playTone(note, 0.1, 'sine', 0.1), index * 80);
    });
}

function playGameOverSound() {
    const notes = [392, 330, 262, 196];
    notes.forEach((note, index) => {
        setTimeout(() => playTone(note, 0.2, 'sine', 0.1), index * 150);
    });
}
```

- [ ] **Step 3: 集成音效到游戏逻辑**

```javascript
// 在 Game 对象的 move、rotate、lockPiece、start 方法中调用对应音效
```

- [ ] **Step 4: 验证音效**

```javascript
// 在浏览器中测试各种操作
// 确认音效正常播放
```

---

### Task 8: 最高分记录与难度递增

**Files:**
- Create: `tetris/index.html`（内联 script 部分）

**Interfaces:**
- 使用 Task 4 的 `Game` 对象
- 为 Task 9 提供最高分和难度功能

- [ ] **Step 1: 实现最高分记录**

```javascript
const BEST_SCORE_KEY = 'tetris-best-score';

function getBestScore() {
    return parseInt(localStorage.getItem(BEST_SCORE_KEY) || '0', 10);
}

function updateBestScore(score) {
    const best = getBestScore();
    if (score > best) {
        localStorage.setItem(BEST_SCORE_KEY, score.toString());
        return true;
    }
    return false;
}
```

- [ ] **Step 2: 实现难度递增**

```javascript
function updateDifficulty(game) {
    game.level = Math.floor(game.lines / 10) + 1;
    game.dropInterval = Math.max(100, 1000 - (game.level - 1) * 100);
}
```

- [ ] **Step 3: 验证最高分和难度**

```javascript
// 在浏览器中测试
// 确认最高分记录在刷新后保留
// 确认消行后难度递增
```

---

### Task 9: 游戏循环与主渲染

**Files:**
- Create: `tetris/index.html`（内联 script 部分）

**Interfaces:**
- 使用 Task 4-8 的所有功能
- 为最终交付提供完整游戏循环

- [ ] **Step 1: 实现游戏循环**

```javascript
function gameLoop(timestamp) {
    game.tick(timestamp);
    render(game);
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
```

- [ ] **Step 2: 实现 HUD 更新**

```javascript
function updateHUD() {
    document.getElementById('score').textContent = game.score;
    document.getElementById('lines').textContent = game.lines;
    document.getElementById('level').textContent = game.level;
    document.getElementById('best').textContent = getBestScore();
}
```

- [ ] **Step 3: 验证游戏循环**

```javascript
// 在浏览器中测试
// 确认游戏循环正常运行
// 确认方块自动下落
```

---

### Task 10: 主题切换与最终整合

**Files:**
- Create: `tetris/index.html`（内联 script 部分）

**Interfaces:**
- 使用 Task 1-9 的所有功能
- 为最终交付提供完整游戏

- [ ] **Step 1: 实现主题切换**

```javascript
const THEMES = {
    classic: {
        background: '#1a1a2e',
        grid: 'rgba(255,255,255,0.05)',
        blocks: {
            I: '#00f0f0',
            O: '#f0f000',
            T: '#a000f0',
            S: '#00f000',
            Z: '#f00000',
            J: '#0000f0',
            L: '#f0a000'
        }
    },
    neon: {
        background: '#0a0a1a',
        grid: 'rgba(0,255,255,0.1)',
        blocks: {
            I: '#00ffff',
            O: '#ffff00',
            T: '#ff00ff',
            S: '#00ff00',
            Z: '#ff0000',
            J: '#0000ff',
            L: '#ff8800'
        }
    }
};

function applyTheme(themeName) {
    const theme = THEMES[themeName];
    document.documentElement.style.setProperty('--bg', theme.background);
    document.documentElement.style.setProperty('--grid', theme.grid);
    Object.entries(theme.blocks).forEach(([type, color]) => {
        document.documentElement.style.setProperty(`--${type.toLowerCase()}`, color);
    });
}
```

- [ ] **Step 2: 实现主题选择按钮**

```javascript
document.getElementById('theme-btn').addEventListener('click', () => {
    const current = localStorage.getItem('tetris-theme') || 'classic';
    const next = current === 'classic' ? 'neon' : 'classic';
    applyTheme(next);
    localStorage.setItem('tetris-theme', next);
});
```

- [ ] **Step 3: 最终整合测试**

```javascript
// 在浏览器中测试
// 确认所有功能正常工作
// 确认单文件交付无外部依赖
```

---

### Task 11: 测试与文档

**Files:**
- Create: `tetris/test/logic.test.js`
- Create: `tetris/test/browser.test.js`
- Modify: `tetris/README.md`

**Interfaces:**
- 使用 Task 1-10 的所有功能
- 为最终交付提供测试和文档

- [ ] **Step 1: 编写逻辑层测试**

```javascript
// test/logic.test.js
const assert = require('assert');

// 测试棋盘初始化
assert.deepStrictEqual(createBoard(), Array.from({ length: 20 }, () => Array(10).fill(null)));

// 测试方块生成
const piece = createPiece('T');
assert.strictEqual(piece.type, 'T');
assert.deepStrictEqual(piece.matrix, [[0,1,0],[1,1,1]]);

// 测试旋转
const rotated = rotatePiece(piece, 'clockwise');
assert.deepStrictEqual(rotated.matrix, [[1,0],[1,1],[0,1]]);

// 测试碰撞
const board = createBoard();
const edgePiece = createPiece('I');
edgePiece.x = COLS - 1;
assert.strictEqual(collides(edgePiece, board), true);

// 测试消行
const fullBoard = createBoard();
fullBoard[19].fill({ type: 'I', color: '#00f0f0' });
assert.strictEqual(clearLines(fullBoard), 1);

console.log('All logic tests passed');
```

- [ ] **Step 2: 编写浏览器测试**

```javascript
// test/browser.test.js
// 在浏览器中运行以下测试
// 1. 键盘输入 → 方块移动/旋转
// 2. 消行 → 分数更新、等级提升
// 3. 游戏结束 → 状态切换、音效播放
// 4. 最高分持久化 → 刷新后仍保留
```

- [ ] **Step 3: 更新 README.md**

```markdown
# 俄罗斯方块

一个纯浏览器运行的俄罗斯方块游戏，单 HTML 文件交付。

## 功能
- 标准俄罗斯方块规则
- Web Audio API 合成音效
- 最高分记录
- 难度递增
- 方块颜色主题

## 运行
直接双击 `index.html` 打开即可。

## 操作
- ←/→：左右移动
- ↓：加速下落
- ↑/X：顺时针旋转
- Z：逆时针旋转
- 空格：瞬间下落
- P/Esc：暂停/继续
- R：重新开始

## 测试
```bash
node test/logic.test.js
```

## 浏览器测试
打开 `index.html` 后，按以下步骤测试：
1. 按 ←/→ 确认方块移动
2. 按 ↑ 确认方块旋转
3. 按空格确认瞬间下落
4. 消行确认分数更新
5. 刷新确认最高分保留
```

- [ ] **Step 4: 运行测试**

```bash
node test/logic.test.js
```

- [ ] **Step 5: 最终检查**

```bash
# 确认 index.html 无外部资源引用
# 确认所有功能正常工作
# 确认单文件交付
```

---

## 执行顺序

1. Task 1: 项目脚手架与基础结构
2. Task 2: 游戏逻辑层 - 棋盘与方块
3. Task 3: 游戏逻辑层 - 碰撞检测与消行
4. Task 4: 游戏逻辑层 - 游戏流程与状态机
5. Task 5: 渲染层 - Canvas 绘制
6. Task 6: 输入层 - 键盘与鼠标控制
7. Task 7: 音效层 - Web Audio API
8. Task 8: 最高分记录与难度递增
9. Task 9: 游戏循环与主渲染
10. Task 10: 主题切换与最终整合
11. Task 11: 测试与文档

---

## 验收标准

- [ ] 双击 `index.html` 即可运行
- [ ] 7 种方块均可正常生成、旋转、下落
- [ ] 左右移动、加速下落、瞬间下落均响应
- [ ] 消行动画流畅，无卡顿
- [ ] 音效在浏览器自动播放策略下可正常触发
- [ ] 最高分记录在刷新后保留
- [ ] 难度递增符合预期（每 10 行升一级）
- [ ] 主题切换正常工作
- [ ] 单文件交付，无外部依赖
- [ ] 逻辑层测试全部通过
