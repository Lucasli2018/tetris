// 逻辑层测试：从 index.html 抽取纯逻辑段（常量 ~ 渲染层之间），在 Node 中跑断言
// 运行：node test/logic.test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('// ===== 常量 =====');
const end = html.indexOf('// ===== 渲染层 =====');
assert.ok(start > 0 && end > start, 'index.html 中未找到逻辑代码段');

const logicCode = html.slice(start, end);
const sandbox = {};
new Function('exports', logicCode + `
Object.assign(exports, { COLS, ROWS, EMPTY, GameState, PIECES, createPiece, rotateMatrix, rotatePiece, createBoard, isCellFilled, isOutOfBounds, collides, clearLines, createGame });
`)(sandbox);

const { COLS, ROWS, EMPTY, GameState, createPiece, rotatePiece, rotateMatrix, createBoard, collides, clearLines, createGame } = sandbox;

// --- 棋盘 ---
assert.deepStrictEqual(createBoard(), Array.from({ length: ROWS }, () => Array(COLS).fill(null)), '棋盘应为 20x10 空棋盘');

// --- 方块生成 ---
const piece = createPiece('T');
assert.strictEqual(piece.type, 'T');
assert.deepStrictEqual(piece.matrix, [[0,1,0],[1,1,1]], 'T 块形状');
assert.strictEqual(piece.x, Math.floor(COLS / 2) - 1, 'T 块出生横位居中');

// --- 旋转 ---
const rotated = rotatePiece(piece, 'clockwise');
assert.deepStrictEqual(rotated.matrix, [[1,0],[1,1],[1,0]], 'T 块顺时针旋转');
const back = rotatePiece(rotated, 'counterclockwise');
assert.deepStrictEqual(back.matrix, piece.matrix, '逆时针旋转还原');
assert.deepStrictEqual(rotateMatrix([[1,2],[3,4]]), [[3,1],[4,2]], '矩阵旋转基础用例');

// --- 碰撞：出界 ---
const edgePiece = createPiece('I');
edgePiece.x = COLS - 1;
assert.strictEqual(collides(edgePiece, createBoard()), true, 'I 块右移一格应撞墙');
assert.strictEqual(collides(createPiece('I'), createBoard()), false, '初始位置不应碰撞');

// --- 碰撞：堆叠 ---
const board = createBoard();
board[19][4] = { type: 'I', color: '#00f0f0' };
const dropPiece = createPiece('O');
dropPiece.x = 4;
dropPiece.y = 17;
assert.strictEqual(collides(dropPiece, board), false, '悬空不碰撞');
dropPiece.y = 18;
assert.strictEqual(collides(dropPiece, board), true, '落在已占格子上应碰撞');

// --- 消行 ---
const fullBoard = createBoard();
fullBoard[19].fill({ type: 'I', color: '#00f0f0' });
assert.strictEqual(clearLines(fullBoard), 1, '满一行消 1');
assert.strictEqual(fullBoard[19].every(c => c === EMPTY), true, '消行后底行为空');

const multiBoard = createBoard();
multiBoard[18].fill({ type: 'O', color: '#f0f000' });
multiBoard[19].fill({ type: 'O', color: '#f0f000' });
assert.strictEqual(clearLines(multiBoard), 2, '满两行消 2');

// --- 游戏状态机 ---
const game = createGame();
assert.strictEqual(game.state, GameState.READY, '初始为 ready');
game.start();
assert.strictEqual(game.state, GameState.PLAYING, 'start 后为 playing');
assert.ok(game.piece && game.nextPiece, '生成当前块与下一块');
assert.strictEqual(game.nextQueue.length, 4, 'NEXT 队列保持 4 个（当前预览 + 后续 3）');
assert.strictEqual(game.nextPiece, game.nextQueue[0], 'nextPiece 恒为队列首元素');
game.pause();
assert.strictEqual(game.state, GameState.PAUSED, 'pause 后为 paused');
game.pause();
assert.strictEqual(game.state, GameState.PLAYING, '再 pause 恢复 playing');
assert.strictEqual(game.move(0, 0) === false || game.move(0, 0) === true, true, 'move 返回布尔');

// ready/paused 状态下操作应被拒绝
const idleGame = createGame();
assert.strictEqual(idleGame.move(-1, 0), false, 'ready 状态 move 拒绝');
idleGame.start();
idleGame.pause();
assert.strictEqual(idleGame.rotate('clockwise'), false, 'paused 状态 rotate 拒绝');

// --- 计分与难度 ---
const g2 = createGame();
g2.start();
const scoreBefore = g2.score;
assert.strictEqual(g2.calculateScore(1), 100 * g2.level, '单行 100x等级');
assert.strictEqual(g2.calculateScore(4), 800 * g2.level, '四消 800x等级');
g2.lines = 10;
g2.updateDifficulty();
assert.strictEqual(g2.level, 2, '10 行升到 2 级');
assert.strictEqual(g2.dropInterval, 900, '2 级下落间隔 900ms');
g2.lines = 100;
g2.updateDifficulty();
assert.strictEqual(g2.dropInterval, 100, '下落间隔下限 100ms');

// --- hardDrop ---
const g3 = createGame();
g3.start();
const dropped = g3.hardDrop();
assert.ok(dropped >= 0, 'hardDrop 返回下落格数');
assert.ok(g3.board.some(row => row.some(c => c !== EMPTY)), 'hardDrop 后锁定到底部');

// --- 游戏结束判定：堆满后新块出生即结束 ---
const g4 = createGame();
g4.start();
for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) g4.board[r][c] = { type: 'O', color: '#f0f000' };
}
g4.spawnPiece();
assert.strictEqual(g4.state, GameState.GAME_OVER, '堆满后 spawn 应触发 gameOver');

// --- HOLD 暂存 ---
const g5 = createGame();
g5.start();
assert.strictEqual(g5.holdType, null, '初始暂存区为空');
assert.strictEqual(g5.holdUsed, false, '初始未使用暂存');
const firstType = g5.piece.type;
assert.strictEqual(g5.hold(), true, '首次 hold 成功');
assert.strictEqual(g5.holdType, firstType, '暂存区存入当前块类型');
assert.strictEqual(g5.holdUsed, true, '当回合已用暂存');
assert.strictEqual(g5.hold(), false, '同回合二次 hold 拒绝');
// 锁定后重置
g5.hardDrop();
assert.strictEqual(g5.holdUsed, false, '锁定新块后 hold 重置可用');
// 交换路径：再 hold 一次，应取回暂存区类型
const prevHold = g5.holdType;
assert.strictEqual(g5.hold(), true, '第二次 hold 成功');
assert.strictEqual(g5.piece.type, prevHold, 'hold 交换后当前块为暂存块');
assert.notStrictEqual(g5.holdType, prevHold, '暂存区换入之前的当前块');
// ready 状态拒绝
const g6 = createGame();
assert.strictEqual(g6.hold(), false, 'ready 状态 hold 拒绝');

// --- 连击计分 ---
const g8 = createGame();
g8.start();
g8.score = 0;
// 第一次消行：combo=1，无连击加成
g8.piece = createPiece('O');
g8.piece.x = 4;
g8.piece.y = 18;
for (let c = 0; c < COLS; c++) if (c !== 4 && c !== 5) g8.board[19][c] = { type: 'I', color: '#00f0f0' };
g8.lockPiece();
assert.strictEqual(g8.combo, 1, '首次消行 combo=1');
assert.strictEqual(g8.score, 100, '首次消行只有基础分(100x1级)');
// 第二次连续消行：combo=2，加成 50x等级
g8.piece = createPiece('O');
g8.piece.x = 4;
g8.piece.y = 18;
for (let c = 0; c < COLS; c++) if (c !== 4 && c !== 5) g8.board[19][c] = { type: 'I', color: '#00f0f0' };
g8.lockPiece();
assert.strictEqual(g8.combo, 2, '连续消行 combo=2');
assert.strictEqual(g8.score, 100 + 100 + 50, '第二次消行 = 基础100 + 连击加成50');
// 不消行则清零
g8.piece = createPiece('O');
g8.piece.x = 4;
g8.piece.y = 0;
g8.lockPiece();
assert.strictEqual(g8.combo, 0, '未消行 combo 清零');

// --- NEXT 队列推进 ---
const g9 = createGame();
g9.start();
const q0 = g9.nextQueue.map(p => p.type).join('');
const headType = g9.nextQueue[0].type;
g9.hardDrop();
assert.strictEqual(g9.piece.type, headType, 'hardDrop 后当前块来自队列首元素');
assert.strictEqual(g9.nextQueue.length, 4, '推进后队列仍保持 4 个');

// --- 升级钩子 ---
const levelUps = [];
const g10 = createGame({ onLevelUp: (lv) => levelUps.push(lv) });
g10.start();
g10.lines = 10;
g10.updateDifficulty();
g10.lines = 25;
g10.updateDifficulty();
assert.deepStrictEqual(levelUps, [2, 3], '跨级时触发 onLevelUp（2 级、3 级）');
g10.updateDifficulty();
assert.deepStrictEqual(levelUps, [2, 3], '等级未变不重复触发');

console.log('All logic tests passed ✓');
