const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../src/engine.js');

function game() {
  const e = new Engine({mode: 'wrap', random: () => .5});
  e.rival.nextAt = Infinity; e.karma.nextAt = Infinity; e.food = [];
  e.start(); return e;
}
function reveal(e) {
  e.pantheon.nextAt = 0; e.pantheon.deadline = 0; e.advancePantheon();
}
function warn(e) {
  reveal(e); e.elapsedMs = e.pantheon.until; e.advancePantheon();
}

test('bloom reveals first, then fixes the landing at the newly revealed position', () => {
  const e = game(); reveal(e); assert.equal(e.pantheon.phase, 'reveal');
  assert(e.events.some(x => x.type === 'pantheonReveal'));
  e.snake[0] = {x: 12, y: 9}; e.elapsedMs = e.pantheon.until; e.advancePantheon();
  assert.equal(e.pantheon.phase, 'warning');
  assert.equal(e.pantheon.x, 12); assert.equal(e.pantheon.y, 9);
  assert.equal(e.pantheon.until - e.elapsedMs, 1800);
  e.snake[0] = {x: 14, y: 8}; e.advancePantheon();
  assert.equal(e.pantheon.x, 12); assert.equal(e.pantheon.y, 9);
});

test('landing judges only the head, once, with bounded damage', () => {
  const e = game(); e.score = 100; warn(e);
  e.elapsedMs = e.pantheon.until; e.advancePantheon();
  assert.equal(e.pantheon.phase, 'landing'); assert.equal(e.pantheonHits, 1);
  assert.equal(e.score, 80); assert.equal(e.snake.length, 3); assert.equal(e.concentration, 64);
  e.advancePantheon(); assert.equal(e.pantheonHits, 1); assert.equal(e.score, 80);
  const c = game(); warn(c); c.elapsedMs = c.pantheon.until; c.advancePantheon();
  assert.equal(c.score, 0); assert.equal(c.snake.length, 3);
});

test('leaving the marker dodges even when the tail is still inside', () => {
  const e = game(); warn(e); e.snake[0] = {x: 21, y: 1};
  e.elapsedMs = e.pantheon.until; e.advancePantheon();
  assert.equal(e.pantheonDodges, 1); assert.equal(e.pantheonHits, 0);
  assert.equal(e.snake.length, 6); assert(e.events.some(x => x.type === 'pantheonDodge'));
});

test('toxic shield blocks a landing without spending score or tail', () => {
  const e = game(); e.score = 30; warn(e); e.shield = 20;
  e.elapsedMs = e.pantheon.until; e.advancePantheon();
  assert.equal(e.score, 30); assert.equal(e.snake.length, 6); assert.equal(e.pantheonHits, 0);
  assert(e.events.some(x => x.type === 'pantheonBlocked'));
});

test('rotated landing boundaries match the ellipse drawn on screen', () => {
  const e = game(), p = e.pantheon;
  Object.assign(p, {x: 10, y: 10, angle: Math.PI/4});
  assert(e.pantheonContains({x: 12, y: 12}));
  assert(!e.pantheonContains({x: 12, y: 8}));
  p.angle = 0;
  assert(e.pantheonContains({x: 14.2, y: 10}));
  assert(!e.pantheonContains({x: 14.21, y: 10}));
});

test('pause freezes the reveal, flight and landing timers', () => {
  const e = game(); reveal(e);
  for (const phase of ['reveal', 'warning', 'landing']) {
    assert.equal(e.pantheon.phase, phase); e.pause();
    const before = JSON.stringify(e); e.step(); assert.equal(JSON.stringify(e), before);
    e.start(); e.elapsedMs = e.pantheon.until; e.advancePantheon();
  }
  assert.equal(e.pantheon.phase, 'waiting');
  assert(e.pantheon.nextAt >= e.elapsedMs + 16000);
  e.reset(); assert.equal(e.pantheon.phase, 'waiting'); assert.equal(e.pantheonHits, 0);
});

test('new tether and skyfall starts wait for one another and respect shared spacing', () => {
  const e = game(); e.karma.phase = 'rooted'; reveal(e);
  assert.equal(e.pantheon.phase, 'waiting');
  e.karma.phase = 'waiting'; reveal(e); assert.equal(e.pantheon.phase, 'reveal');
  Object.assign(e.karma, {nextAt: 0, deadline: 0}); e.elapsedMs = e.threatGapUntil;
  e.advanceKarma(); assert.equal(e.karma.phase, 'waiting');
  e.pantheon.phase = 'waiting'; e.advanceKarma(); assert.equal(e.karma.phase, 'tether');
  Object.assign(e.rival, {nextAt: 0, deadline: 0}); e.advanceRival();
  assert.equal(e.rival.phase, 'waiting');
});

test('pseudo-random misses raise the next chance and eventually guarantee a visit', () => {
  const e = game(); e.random = () => .99;
  Object.assign(e.rival, {nextAt: 0, deadline: 60000});
  for (let misses = 1; misses <= 5; misses++) {
    e.advanceRival(); assert.equal(e.rival.phase, 'waiting');
    assert.equal(e.rival.misses, misses); e.elapsedMs = e.rival.nextAt;
  }
  e.advanceRival(); assert.equal(e.rival.phase, 'warning');
  const c = game(); c.random = () => .999;
  Object.assign(c.rival, {nextAt: 0, deadline: 500}); c.elapsedMs = 500;
  c.advanceRival(); assert.equal(c.rival.phase, 'warning');
});

test('initial schedules are jittered independently, within their safe windows', () => {
  const a = new Engine({random: () => 0}), b = new Engine({random: () => .9999});
  for (const key of ['karma', 'pantheon', 'rival']) {
    assert.notEqual(a[key].nextAt, b[key].nextAt);
    assert(a[key].nextAt < a[key].deadline); assert(b[key].nextAt < b[key].deadline);
    assert.equal(a[key].misses, 0);
  }
});

test('three threats all recur over long play with spaced starts and different seeded rhythms', () => {
  const histories = [];
  for (const seed of [7, 291, 8191]) {
    let state = seed;
    const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    const e = new Engine({random}); e.start();
    const starts = [], counts = {rivalWarning: 0, karmaTether: 0, pantheonReveal: 0};
    // Hold the head still to exercise complete roots and landings as world time advances.
    for (let ms = 0; ms < 180000; ms += 160) {
      e.elapsedMs += 160; e.steps++; e.events = [];
      e.advanceKarma(); e.advanceRival(); e.advancePantheon();
      for (const event of e.events) if (event.type in counts) {
        counts[event.type]++; starts.push(e.elapsedMs);
      }
      assert(e.karma.phase === 'waiting' || e.pantheon.phase === 'waiting');
    }
    for (const count of Object.values(counts)) assert(count >= 3);
    for (let n = 1; n < starts.length; n++) assert(starts[n]-starts[n-1] >= 2200);
    histories.push(starts.slice(0, 5));
  }
  assert.notDeepEqual(histories[0], histories[1]); assert.notDeepEqual(histories[1], histories[2]);
});
