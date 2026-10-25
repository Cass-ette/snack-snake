(function(root){
 'use strict';
 class VoiceDirector {
  constructor(player,clips,{now=()=>performance.now(),onChange=()=>{},onError=()=>{}}={}){
   this.player=player;this.clips=clips;this.now=now;this.onChange=onChange;this.onError=onError;
   this.enabled=false;this.current=null;this.queue=[];this.held=false;this.generation=0;
   player.addEventListener('ended',()=>{this.current=null;this.next();this.onChange()});
   player.addEventListener('error',()=>{if(this.current){this.stop();this.onError()}});
  }
  setEnabled(value){this.enabled=Boolean(value);if(!this.enabled)this.stop();this.onChange()}
  setVolume(value){this.player.volume=Math.max(0,Math.min(1,Number(value)||0))}
  play(key,{priority=1,interrupt=false,ttl=2000}={}){
   if(!this.enabled||!this.clips[key])return;
   if(interrupt){this.stop();this.held=false}
   if(this.held||this.current?.key===key||this.queue.some(item=>item.key===key))return;
   if(this.current&&priority>this.current.priority)this.stop();
   const item={key,priority,expires:this.now()+ttl};
   if(this.current){
    this.queue.push(item);this.queue.sort((a,b)=>b.priority-a.priority);this.queue=this.queue.slice(0,2);
   }else this.start(item);
  }
  start(item){
   this.current=item;this.player.src=this.clips[item.key].src;
   this.player.dataset.clip=item.key;this.player.currentTime=0;
   this.tryPlay();this.onChange();
  }
  tryPlay(){
   const generation=++this.generation;
   Promise.resolve(this.player.play()).catch(error=>{
    if(generation!==this.generation||error?.name==='AbortError')return;
    this.stop();this.onError();
   });
  }
  next(){
   if(!this.enabled||this.held)return;
   const item=this.queue.find(item=>item.expires>=this.now());
   this.queue=this.queue.filter(candidate=>candidate!==item&&candidate.expires>=this.now());
   if(item)this.start(item);else delete this.player.dataset.clip;
  }
  pause(){this.held=true;this.generation++;this.player.pause();this.queue=[];this.onChange()}
  resume(){this.held=false;if(this.enabled&&this.current)this.tryPlay();this.onChange()}
  stop(){
   this.generation++;this.player.pause();this.player.currentTime=0;
   this.current=null;this.queue=[];this.held=false;delete this.player.dataset.clip;this.onChange();
  }
 }
 if(typeof module!=='undefined'&&module.exports)module.exports=VoiceDirector;
 else root.VoiceDirector=VoiceDirector;
})(typeof window!=='undefined'?window:this);
