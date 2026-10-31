const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../src/engine.js');

function game(foods = 0) {
  const e = new Engine({mode: 'wrap', random: () => .5});
  e.candies = foods; e.food = []; e.snake = [{x: 8, y: 10}];
  e.rival.nextAt = Infinity; e.pantheon.nextAt = Infinity; e.start();
  return e;
}

function tether(e, overrides = {}) {
  Object.assign(e.karma, {phase: 'tether', x: 8, y: 10, startedAt: e.elapsedMs, until: e.elapsedMs + 2000}, overrides);
}

test('Karma arrives on active game time and gives two seconds at every speed', () => {
  for (const foods of [0, 100]) {
    const e = game(foods);
    while (e.karma.phase === 'waiting' && e.elapsedMs < 15000) e.step();
    assert(e.elapsedMs >= 5000 && e.elapsedMs <= 14000 + e.interval);
    assert.equal(e.karma.phase, 'tether');
    assert.equal(e.karma.until - e.elapsedMs, 2000);
    assert(e.events.some(x => x.type === 'karmaTether'));
    const h = e.snake[0], k = e.karma;
    assert(Math.hypot(h.x-k.x, h.y-k.y) <= k.radius);
    assert(k.x >= 0 && k.x < e.cols && k.y >= 0 && k.y < e.rows);
  }
});

test('leaving the circle on the deadline escapes; standing exactly on it does not', () => {
  const e = game(); e.snake = [{x: 14, y: 10}];
  tether(e, {until: e.interval}); e.step();
  assert.equal(e.karma.phase, 'waiting'); assert.equal(e.karmaEscapes, 1);
  assert.equal(e.karmaRoots, 0); assert(e.events.some(x => x.type === 'karmaEscape'));
  const c = game(); c.snake = [{x: 14, y: 10}];
  tether(c, {x: 8.5, until: c.interval}); c.step();
  assert.equal(c.karma.phase, 'rooted'); assert.equal(c.karmaRoots, 1);
});

test('staying inside for two seconds roots once even under toxic shield', () => {
  const e = game(); tether(e); e.shield = 26;
  e.elapsedMs = 1999; e.advanceKarma(); assert.equal(e.karma.phase, 'tether');
  e.elapsedMs = 2000; e.advanceKarma();
  assert.equal(e.karma.phase, 'rooted'); assert.equal(e.karma.until, 3400);
  assert.equal(e.karmaRoots, 1); assert(e.events.some(x => x.type === 'karmaRoot'));
  e.advanceKarma(); assert.equal(e.karmaRoots, 1);
});

test('root stops the snake but axes and shield countdown continue', () => {
  const e = game(); tether(e); e.elapsedMs = 2000; e.advanceKarma();
  const before = structuredClone(e.snake); e.score = 100; e.shield = 4;
  e.rival = {phase: 'cut1', nextAt: 0, until: e.steps + 3, round: 1, lines: [{axis: 'row', line: 10}, {axis: 'col', line: 8}], handled: false, hitThisRound: false};
  e.step(); assert.deepEqual(e.snake, before); assert.deepEqual(e.previous, before);
  assert.equal(e.steps, 1); assert.equal(e.shield, 3);
  assert(e.events.some(x => x.type === 'blocked'));
  e.shield = 0; e.rival.handled = false; e.step();
  assert(e.events.some(x => x.type === 'rivalHit')); assert.equal(e.score, 80);
  assert.deepEqual(e.snake, before);
});

test('pause freezes tether and root; buffered turn is applied after release', () => {
  const e = game(); tether(e); e.pause();
  const pausedTether = JSON.stringify(e); e.step(); assert.equal(JSON.stringify(e), pausedTether);
  e.start(); e.elapsedMs = 2000; e.advanceKarma(); e.turn('up'); e.pause();
  const pausedRoot = JSON.stringify(e); e.step(); assert.equal(JSON.stringify(e), pausedRoot);
  e.start(); const before = structuredClone(e.snake), rootEnd = e.karma.until;
  while (e.karma.phase === 'rooted') { e.step(); assert.deepEqual(e.snake, before); }
  assert(e.elapsedMs >= rootEnd && e.elapsedMs < rootEnd + e.interval);
  assert(e.events.some(x => x.type === 'karmaRelease'));
  e.step(); assert.deepEqual(e.snake[0], {x: 8, y: 9});
});

test('escaping starts a fresh cooldown and guarantees another visit without repeated roots', () => {
  for (const random of [() => 0, () => .999999]) {
    const e = game(); e.random = random; tether(e); e.snake = [{x: 18, y: 10}]; e.advanceKarma();
    const delay = e.karma.nextAt-e.elapsedMs; assert(delay >= 10000 && delay <= 11200); assert.equal(e.karma.deadline-e.elapsedMs, 20000);
    e.elapsedMs = e.karma.nextAt-1; e.advanceKarma(); assert.equal(e.karma.phase, 'waiting');
    e.elapsedMs=e.karma.deadline; e.advanceKarma(); assert.equal(e.karma.phase, 'tether'); assert.equal(e.karma.round, 1);
  }
});

test('crossing the wrap boundary breaks a tether instead of stretching across the board', () => {
  const e = game(); e.snake = [{x: 23, y: 10}]; tether(e, {x: 22});
  e.step(); assert.equal(e.snake[0].x, 0); assert.equal(e.karma.phase, 'waiting'); assert.equal(e.karmaEscapes, 1);
});

test('restart clears roots, visits, buffered directions and all Karma time', () => {
  const e = game(); tether(e); e.elapsedMs = 2000; e.advanceKarma(); e.turn('up');
  e.karmaEscapes = 2; e.reset();
  assert.equal(e.karma.phase, 'waiting'); assert(e.karma.nextAt >= 5000 && e.karma.nextAt <= 6200); assert.equal(e.karma.deadline, 14000);
  assert.equal(e.karma.round, 0); assert.equal(e.karmaRoots, 0); assert.equal(e.karmaEscapes, 0);
  assert.equal(e.elapsedMs, 0); assert.deepEqual(e.queue, []); assert.deepEqual(e.events, []);
});
