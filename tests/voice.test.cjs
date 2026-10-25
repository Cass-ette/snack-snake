const test=require('node:test');
const assert=require('node:assert/strict');
const VoiceDirector=require('../src/voice.js');
function setup(){
 const listeners={},player={dataset:{},paused:true,currentTime:0,volume:1,
  addEventListener(type,listener){listeners[type]=listener},
  play(){this.paused=false;return Promise.resolve()},pause(){this.paused=true},
  finish(){this.paused=true;listeners.ended()}};
 let clock=0;
 const voice=new VoiceDirector(player,{protect:{src:'protect'},cut:{src:'cut'},kenchana:{src:'kenchana'}},{now:()=>clock});
 voice.setEnabled(true);
 return {voice,player,advance:time=>clock+=time};
}
test('quotes play one at a time; axe line precedes queued reaction',()=>{
 const {voice,player}=setup();voice.play('protect',{priority:4});voice.play('kenchana');voice.play('cut',{priority:4});
 assert.equal(player.src,'protect');player.finish();assert.equal(player.src,'cut');player.finish();assert.equal(player.src,'kenchana');
});
test('pause preserves current speech but discards queued calls; mute clears all',()=>{
 const {voice,player}=setup();voice.play('protect');voice.play('cut');player.currentTime=.8;voice.pause();
 assert(player.paused);assert.equal(player.currentTime,.8);assert.equal(voice.queue.length,0);
 voice.resume();assert(!player.paused);voice.setEnabled(false);assert(player.paused);assert.equal(voice.current,null);
 voice.play('cut');assert.equal(voice.current,null);
});
test('a stale queued reaction does not play after a long speech',()=>{
 const {voice,player,advance}=setup();voice.play('protect');voice.play('kenchana');advance(3000);player.finish();
 assert.equal(voice.current,null);assert.equal(voice.queue.length,0);assert(player.paused);
});
test('priority action replaces current speech without leaving old queued clips',()=>{
 const {voice,player}=setup();voice.play('protect');voice.play('kenchana');voice.play('cut',{priority:4});
 assert.equal(player.src,'cut');assert.equal(voice.queue.length,0);voice.setVolume(1.4);assert.equal(player.volume,1);
 voice.stop();assert(player.paused);assert.equal(player.currentTime,0);player.finish();assert.equal(voice.current,null);
});
