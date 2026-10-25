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
      this.rival = { phase: 'waiting', nextAt: 28, until: 0, round: 0, lines: [], handled: false, hitThisRound: false };
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
    advanceRival() {
      const r = this.rival;
      if (r.phase === 'waiting' && this.steps >= r.nextAt) {
        r.round++; r.phase = 'warning'; r.until = this.steps + Math.ceil(3900 / this.interval); r.handled = false; r.hitThisRound = false;
        r.lines = [{ axis: 'row', line: this.snake[0].y }, { axis: 'col', line: this.snake[0].x }];
        this.emit({ type: 'rivalWarning', round: r.round });
      } else if (this.steps >= r.until) {
        if (r.phase === 'warning') { r.phase = 'cut1'; r.until = this.steps + 3; r.handled = false; this.emit({ type: 'cut', number: 1 }); }
        else if (r.phase === 'cut1') { r.phase = 'between'; r.until = this.steps + Math.max(4, Math.ceil(1800 / this.interval) - 3); }
        else if (r.phase === 'between') { r.phase = 'cut2'; r.until = this.steps + 3; r.handled = false; this.emit({ type: 'cut', number: 2 }); }
        else if (r.phase === 'cut2') {
          r.phase = 'waiting'; r.nextAt = this.steps + 32; r.lines = [];
          if (!r.hitThisRound) { this.perfectDodges++; this.emit({ type: 'dodge' }); }
        }
      }
      if ((r.phase === 'cut1' || r.phase === 'cut2') && !r.handled) {
        const line = r.lines[r.phase === 'cut1' ? 0 : 1], head = this.snake[0];
        if ((line.axis === 'row' ? head.y : head.x) === line.line) {
          r.handled = true;
          if (this.shield > 0) this.emit({ type: 'blocked' });
          else {
            const lost = Math.min(3, Math.max(0, this.snake.length - 3));
            if (lost) this.snake.splice(-lost, lost);
            const points = Math.min(20, this.score); this.score -= points;
            this.concentration = Math.max(64, this.concentration - 8);
            this.rivalHits++; r.hitThisRound = true;
            this.emit({ type: 'rivalHit', lost, points }); this.fillFood();
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
      this.events = [];
      if (this.shield > 0) this.shield--;
      this.previous = this.snake.map(p => ({ ...p }));
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
      this.steps++; this.advanceRival(); return this.lastEvent;
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = SnackEngine;
  else root.SnackEngine = SnackEngine;
})(typeof window !== 'undefined' ? window : this);
