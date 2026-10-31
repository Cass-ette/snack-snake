(function (root) {
  'use strict';
  const vectors = { right: [1, 0], down: [0, 1], left: [-1, 0], up: [0, -1] };
  class SnackEngine {
    constructor({ cols = 24, rows = 20, mode = 'classic', random = Math.random } = {}) {
      this.cols = cols; this.rows = rows; this.mode = mode; this.random = random;
      this.reset();
    }
    reset() {
      const x = Math.floor(this.cols / 3), y = Math.floor(this.rows / 2);
      this.snake = Array.from({ length: Math.min(6, x + 1) }, (_, i) => ({ x: x - i, y }));
      this.previous = this.snake.map(p => ({ ...p }));
      this.direction = 'right'; this.queue = []; this.score = 0; this.candies = 0; this.burgers = 0;
      this.steps = 0; this.status = 'ready'; this.lastEvent = null; this.food = []; this.events = [];
      this.concentration = 72; this.shield = 0; this.cocoa72 = 0; this.cocoa80 = 0;
      this.rivalHits = 0; this.perfectDodges = 0;
      this.elapsedMs = 0; this.threatGapUntil = 0; this.karmaRoots = 0; this.karmaEscapes = 0;
      this.pantheonHits = 0; this.pantheonDodges = 0;
      this.rival = { phase: 'waiting', until: 0, round: 0, lines: [], handled: false, hitThisRound: false };
      this.karma = { phase: 'waiting', until: 0, startedAt: 0, round: 0, x: 0, y: 0, radius: 6.5 };
      this.pantheon = { phase: 'waiting', until: 0, startedAt: 0, round: 0, x: 0, y: 0, angle: 0, radiusLong: 4.2, radiusShort: 2.1, side: 0 };
      this.scheduleThreat(this.rival, 3500, 11000);
      this.scheduleThreat(this.karma, 5000, 14000);
      this.scheduleThreat(this.pantheon, 9000, 22000);
      const spots = [
        { x: x + 4, y, type: 'candy', color: 0 },
        { x: this.cols - 5, y: 4, type: 'burger', color: 0 },
        { x: 5, y: this.rows - 5, type: 'chocolate', purity: 72 },
        { x: this.cols - 7, y: this.rows - 5, type: 'chocolate', purity: 80 },
        { x: 6, y: 4, type: 'candy', color: 0 },
        { x: this.cols - 5, y: this.rows - 8, type: 'candy', color: 0 }
      ];
      for (const f of spots) if (f.x >= 0 && f.y >= 0 && f.x < this.cols && f.y < this.rows && !this.occupied(f)) this.food.push(f);
      this.fillFood(); return this;
    }
    get totalFood() { return this.candies + this.burgers + this.cocoa72 + this.cocoa80; }
    get interval() { return Math.max(85, 160 - Math.floor(this.totalFood / 4) * 9); }
    get level() { return 1 + Math.floor(this.totalFood / 4); }
    emit(event) { this.events.push(event); return event; }
    scheduleThreat(threat, minMs, maxMs) {
      threat.nextAt = this.elapsedMs + minMs + Math.floor(this.random() * 1201);
      threat.deadline = this.elapsedMs + maxMs; threat.misses = 0;
    }
    canStartThreat(threat, kind) {
      if (this.elapsedMs < threat.nextAt || this.elapsedMs < this.threatGapUntil) return false;
      // Do not begin a landing while rooted, or a new tether during a landing warning.
      if (kind === 'pantheon' && this.karma.phase !== 'waiting') return false;
      if (kind === 'karma' && this.pantheon.phase !== 'waiting') return false;
      const chance = Math.min(1, .18 + threat.misses * .2);
      if (this.elapsedMs >= threat.deadline || this.random() < chance) {
        this.threatGapUntil = this.elapsedMs + 2200 + Math.floor(this.random() * 1401);
        return true;
      }
      threat.misses++;
      threat.nextAt = this.elapsedMs + 900 + Math.floor(this.random() * 701);
      return false;
    }
    damageSnake(type) {
      const lost = Math.min(3, Math.max(0, this.snake.length - 3));
      if (lost) this.snake.splice(-lost, lost);
      const points = Math.min(20, this.score); this.score -= points;
      this.concentration = Math.max(64, this.concentration - 8);
      this.emit({ type, lost, points }); this.fillFood();
    }
    occupied(p) { return this.snake.some(s => s.x === p.x && s.y === p.y) || this.food.some(f => f.x === p.x && f.y === p.y); }
    fillFood() {
      const target = Math.min(6, this.cols * this.rows - this.snake.length);
      while (this.food.length < target) {
        const free = [];
        for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) if (!this.occupied({ x, y })) free.push({ x, y });
        if (!free.length) break;
        const p = free[Math.min(free.length - 1, Math.floor(this.random() * free.length))];
        let item = { type: 'candy', color: 0 };
        if (!this.food.some(f => f.type === 'chocolate' && f.purity === 80)) item = { type: 'chocolate', purity: 80 };
        else if (!this.food.some(f => f.type === 'chocolate' && f.purity === 72)) item = { type: 'chocolate', purity: 72 };
        else if (!this.food.some(f => f.type === 'burger')) item = { type: 'burger' };
        this.food.push({ ...p, ...item });
      }
    }
    activate() {
      if (this.status !== 'running' || this.concentration < 80 || this.shield > 0) return null;
      this.concentration = 72; this.shield = 26;
      return this.emit({ type: 'power' });
    }
    finishKarma(type) {
      const k = this.karma;
      k.phase = 'waiting'; k.until = 0;
      this.scheduleThreat(k, 10000, 20000);
      return this.emit({ type });
    }
    advanceKarma() {
      const k = this.karma, head = this.snake[0];
      if (k.phase === 'waiting') {
        if (!this.canStartThreat(k, 'karma')) return;
        const [dx, dy] = vectors[this.direction], side = this.random() < .5 ? -2 : 2;
        // Karma stays put. Her marker never blocks a cell; only the tether can root.
        k.x = Math.max(0, Math.min(this.cols - 1, head.x + dx * 2 - dy * side));
        k.y = Math.max(0, Math.min(this.rows - 1, head.y + dy * 2 + dx * side));
        k.phase = 'tether'; k.round++; k.startedAt = this.elapsedMs; k.until = this.elapsedMs + 2000;
        this.emit({ type: 'karmaTether' });
      } else if (k.phase === 'tether') {
        // Test range before the deadline: leaving on the last allowed step still escapes.
        if (Math.hypot(head.x - k.x, head.y - k.y) > k.radius) {
          this.karmaEscapes++; this.finishKarma('karmaEscape');
        } else if (this.elapsedMs >= k.until) {
          k.phase = 'rooted'; k.startedAt = this.elapsedMs; k.until = this.elapsedMs + 1400;
          this.karmaRoots++; this.emit({ type: 'karmaRoot' });
        }
      } else if (k.phase === 'rooted' && this.elapsedMs >= k.until) {
        this.finishKarma('karmaRelease');
      }
    }
    pantheonContains(head) {
      const p = this.pantheon, dx = head.x - p.x, dy = head.y - p.y;
      const x = dx * Math.cos(p.angle) + dy * Math.sin(p.angle);
      const y = -dx * Math.sin(p.angle) + dy * Math.cos(p.angle);
      return (x / p.radiusLong) ** 2 + (y / p.radiusShort) ** 2 <= 1;
    }
    advancePantheon() {
      const p = this.pantheon, head = this.snake[0];
      if (p.phase === 'waiting') {
        if (!this.canStartThreat(p, 'pantheon')) return;
        p.phase = 'reveal'; p.round++; p.startedAt = this.elapsedMs; p.until = this.elapsedMs + 900;
        p.x = head.x; p.y = head.y; p.side = Math.floor(this.random() * 4);
        this.emit({ type: 'pantheonReveal' });
      } else if (p.phase === 'reveal' && this.elapsedMs >= p.until) {
        // The bloom reveals the current location; the landing marker then stays fixed.
        p.x = head.x; p.y = head.y; p.angle = Math.floor(this.random() * 4) * Math.PI / 4;
        p.phase = 'warning'; p.startedAt = this.elapsedMs; p.until = this.elapsedMs + 1800;
        this.emit({ type: 'pantheonWarning' });
      } else if (p.phase === 'warning' && this.elapsedMs >= p.until) {
        p.phase = 'landing'; p.startedAt = this.elapsedMs; p.until = this.elapsedMs + 650;
        const hit = this.pantheonContains(head);
        if (hit && this.shield > 0) this.emit({ type: 'pantheonBlocked' });
        else if (hit) { this.pantheonHits++; this.damageSnake('pantheonHit'); }
        else { this.pantheonDodges++; this.emit({ type: 'pantheonDodge' }); }
      } else if (p.phase === 'landing' && this.elapsedMs >= p.until) {
        p.phase = 'waiting'; this.scheduleThreat(p, 16000, 28000);
      }
    }
    advanceRival() {
      const r = this.rival;
      if (r.phase === 'waiting' && this.canStartThreat(r, 'rival')) {
        r.round++; r.phase = 'warning'; r.until = this.steps + Math.ceil(3900 / this.interval); r.handled = false; r.hitThisRound = false;
        r.lines = [{ axis: 'row', line: this.snake[0].y }, { axis: 'col', line: this.snake[0].x }];
        this.emit({ type: 'rivalWarning', round: r.round });
      } else if (this.steps >= r.until) {
        if (r.phase === 'warning') { r.phase = 'cut1'; r.until = this.steps + 3; r.handled = false; this.emit({ type: 'cut', number: 1 }); }
        else if (r.phase === 'cut1') { r.phase = 'between'; r.until = this.steps + Math.max(4, Math.ceil(1800 / this.interval) - 3); }
        else if (r.phase === 'between') { r.phase = 'cut2'; r.until = this.steps + 3; r.handled = false; this.emit({ type: 'cut', number: 2 }); }
        else if (r.phase === 'cut2') {
          r.phase = 'waiting'; this.scheduleThreat(r, 5000, 15000); r.lines = [];
          if (!r.hitThisRound) { this.perfectDodges++; this.emit({ type: 'dodge' }); }
        }
      }
      if ((r.phase === 'cut1' || r.phase === 'cut2') && !r.handled) {
        const line = r.lines[r.phase === 'cut1' ? 0 : 1], head = this.snake[0];
        if ((line.axis === 'row' ? head.y : head.x) === line.line) {
          r.handled = true;
          if (this.shield > 0) this.emit({ type: 'blocked' });
          else {
            this.rivalHits++; r.hitThisRound = true;
            this.damageSnake('rivalHit');
          }
        }
      }
    }
    turn(direction) {
      if (!vectors[direction] || this.queue.length >= 2) return false;
      const last = this.queue.length ? this.queue[this.queue.length - 1] : this.direction;
      const a = vectors[last], b = vectors[direction];
      if (last === direction || (a[0] + b[0] === 0 && a[1] + b[1] === 0)) return false;
      this.queue.push(direction); return true;
    }
    start() { if (this.status === 'ready' || this.status === 'paused') this.status = 'running'; }
    pause() { if (this.status === 'running') this.status = 'paused'; }
    step() {
      if (this.status !== 'running') return null;
      this.events = []; this.lastEvent = null;
      this.elapsedMs += this.interval;
      if (this.shield > 0) this.shield--;
      this.previous = this.snake.map(p => ({ ...p }));
      if (this.karma.phase === 'rooted') {
        // World time and axes keep moving while the snake is immobilized.
        this.steps++; this.advanceKarma(); this.advanceRival(); this.advancePantheon();
        return this.lastEvent;
      }
      if (this.queue.length) this.direction = this.queue.shift();
      const [dx, dy] = vectors[this.direction], old = this.snake[0];
      let x = old.x + dx, y = old.y + dy;
      if (this.mode === 'wrap') { x = (x + this.cols) % this.cols; y = (y + this.rows) % this.rows; }
      if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) { this.status = 'over'; return this.lastEvent = this.emit({ type: 'wall' }); }
      const index = this.food.findIndex(f => f.x === x && f.y === y), eaten = this.food[index];
      // The tail moves away on a non-eating step, so that cell is legal.
      const body = eaten ? this.snake : this.snake.slice(0, -1);
      if (body.some(p => p.x === x && p.y === y)) { this.status = 'over'; return this.lastEvent = this.emit({ type: 'self' }); }
      this.snake.unshift({ x, y });
      if (eaten) {
        this.food.splice(index, 1);
        const before = this.concentration;
        const multiplier = before >= 80 && eaten.type !== 'chocolate' ? 2 : 1;
        const points = (eaten.type === 'burger' ? 30 : eaten.purity === 80 ? 20 : 10) * multiplier;
        this.score += points;
        if (eaten.type === 'candy') { this.candies++; this.concentration = Math.min(80, before + 2); }
        else if (eaten.type === 'burger') { this.burgers++; this.concentration = Math.max(64, before - 8); }
        else { this[eaten.purity === 80 ? 'cocoa80' : 'cocoa72']++; this.concentration = eaten.purity; }
        this.lastEvent = this.emit({ type: 'eat', food: eaten, points, multiplier, charged: before < 80 && this.concentration === 80 });
        if (this.snake.length === this.cols * this.rows) { this.status = 'won'; this.food = []; return this.lastEvent = this.emit({ type: 'won', food: eaten }); }
        this.fillFood();
      } else { this.snake.pop(); this.lastEvent = null; }
      this.steps++; this.advanceKarma(); this.advanceRival(); this.advancePantheon(); return this.lastEvent;
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = SnackEngine;
  else root.SnackEngine = SnackEngine;
})(typeof window !== 'undefined' ? window : this);
