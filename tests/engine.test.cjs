const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../src/engine.js');
test('eating M candy adds ten points, grows once and replaces food safely', () => {
  const e = new Engine(); e.start(); for(let i=0;i<4;i++) e.step();
  assert.equal(e.score, 10); assert.equal(e.candies,1); assert.equal(e.snake.length,7); assert.equal(e.food.length,6);
  for(const f of e.food) assert(!e.snake.some(p=>p.x===f.x&&p.y===f.y));
});
test('burger adds thirty points and counts separately', () => {
  const e = new Engine(); e.food=[{x:9,y:10,type:'burger'}]; e.start(); e.step();
  assert.equal(e.score,30); assert.equal(e.burgers,1); assert.equal(e.snake.length,7);
});
test('turn buffer accepts two legal corners and rejects reversals', () => {
  const e = new Engine(); assert.equal(e.turn('left'),false); assert(e.turn('up')); assert(e.turn('left')); assert.equal(e.turn('down'),false);
  e.start(); e.step(); assert.deepEqual(e.snake[0],{x:8,y:9}); e.step(); assert.deepEqual(e.snake[0],{x:7,y:9});
});
test('classic stops at a wall while wrap exits on the other side', () => {
  for(const mode of ['classic','wrap']) {
    const e = new Engine({mode}); e.snake=[{x:23,y:10},{x:22,y:10}]; e.start(); const event=e.step();
    if(mode==='classic') {assert.equal(e.status,'over');assert.equal(event.type,'wall');}
    else {assert.equal(e.status,'running');assert.deepEqual(e.snake[0],{x:0,y:10});}
  }
});
test('self collision stops but moving into a vacated tail is allowed', () => {
  const e = new Engine(); e.snake=[{x:2,y:2},{x:2,y:3},{x:3,y:3},{x:3,y:2}]; e.food=[]; e.start(); e.step(); assert.equal(e.status,'running');
  const c = new Engine(); c.snake=[{x:2,y:2},{x:2,y:3},{x:3,y:3},{x:3,y:2},{x:4,y:2}]; c.food=[]; c.start(); c.step(); assert.equal(c.status,'over');
});
test('pause freezes state, restart clears points and turns', () => {
  const e = new Engine(); e.start(); e.step(); e.pause(); const before=JSON.stringify(e.snake); e.step(); assert.equal(JSON.stringify(e.snake),before);
  e.start(); e.step(); assert.notEqual(JSON.stringify(e.snake),before); e.turn('up'); e.reset(); assert.equal(e.score,0); assert.equal(e.queue.length,0); assert.equal(e.status,'ready');
});
test('last free cell wins without looping in food generation', () => {
  const e = new Engine({cols:2,rows:2}); e.snake=[{x:0,y:0},{x:0,y:1},{x:1,y:1}];e.food=[{x:1,y:0,type:'candy'}];e.start();e.step();assert.equal(e.status,'won');assert.equal(e.snake.length,4);
});
test('72% and 80% chocolate set concentration to their actual labels', () => {
  for(const purity of [72,80]) {
    const e=new Engine();e.concentration=80;e.food=[{x:9,y:10,type:'chocolate',purity}];e.start();e.step();
    assert.equal(e.concentration,purity);assert.equal(e.score,purity===80?20:10);assert.equal(e.cocoa72+e.cocoa80,1);
  }
});
test('blue M beans charge by two and cap at eighty; double score starts on the next bite', () => {
  const e=new Engine();e.concentration=78;e.food=[{x:9,y:10,type:'candy',color:0},{x:10,y:10,type:'candy',color:0}];e.start();e.step();
  assert.equal(e.concentration,80);assert.equal(e.score,10);assert.equal(e.events[0].charged,true);
  e.step();assert.equal(e.concentration,80);assert.equal(e.score,30);assert.equal(e.events[0].multiplier,2);
});
test('burger gets double points at eighty but drops concentration by eight', () => {
  const e=new Engine();e.concentration=80;e.food=[{x:9,y:10,type:'burger'}];e.start();e.step();
  assert.equal(e.score,60);assert.equal(e.concentration,72);assert.equal(e.burgers,1);
});
test('power needs a running game, full concentration and no active shield', () => {
  const e=new Engine();e.concentration=80;assert.equal(e.activate(),null);e.start();e.concentration=72;assert.equal(e.activate(),null);
  e.concentration=80;assert.equal(e.activate().type,'power');assert.equal(e.concentration,72);assert.equal(e.shield,26);
  e.concentration=80;assert.equal(e.activate(),null);e.pause();e.step();assert.equal(e.shield,26);
});
test('rival telegraphs both cuts and can only damage a head on the active line once', () => {
  const e=new Engine();e.score=100;e.steps=28;e.advanceRival();assert.equal(e.rival.phase,'warning');assert.equal(e.score,100);
  e.steps=e.rival.until;e.advanceRival();assert.equal(e.rival.phase,'cut1');assert.equal(e.score,80);assert.equal(e.snake.length,3);assert.equal(e.rivalHits,1);
  e.steps++;e.advanceRival();assert.equal(e.score,80);
  e.steps=e.rival.until;e.advanceRival();assert.equal(e.rival.phase,'between');e.steps=e.rival.until;e.advanceRival();
  assert.equal(e.rival.phase,'cut2');assert.equal(e.score,60);assert.equal(e.snake.length,3);assert.equal(e.rivalHits,2);
});
test('toxic shield blocks axes and dodging both cuts triggers kenchana', () => {
  const e=new Engine();e.score=10;e.shield=26;e.steps=28;e.advanceRival();e.steps=e.rival.until;e.advanceRival();
  assert(e.events.some(x=>x.type==='blocked'));assert.equal(e.score,10);assert.equal(e.rivalHits,0);
  e.steps=e.rival.until;e.advanceRival();e.steps=e.rival.until;e.advanceRival();e.steps=e.rival.until;e.advanceRival();assert.equal(e.perfectDodges,1);assert(e.events.some(x=>x.type==='dodge'));
});
test('rival cuts never produce negative score and reset clears all meme state', () => {
  const e=new Engine();e.steps=28;e.advanceRival();e.steps=e.rival.until;e.advanceRival();assert.equal(e.score,0);e.reset();
  assert.equal(e.concentration,72);assert.equal(e.shield,0);assert.equal(e.rivalHits,0);assert.equal(e.rival.phase,'waiting');assert.equal(e.events.length,0);
});

test('attack timing leaves room for complete voices even after speed increases',()=>{
 for(const foods of [0,100]){
  const e=new Engine();e.candies=foods;e.steps=28;e.advanceRival();
  assert((e.rival.until-e.steps)*e.interval>=3900);
  e.steps=e.rival.until;e.advanceRival();const first=e.steps;
  e.steps=e.rival.until;e.advanceRival();e.steps=e.rival.until;e.advanceRival();
  assert.equal(e.rival.phase,'cut2');assert((e.steps-first)*e.interval>=1800);
 }
});
