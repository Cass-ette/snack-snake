(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const nav = document.querySelector('.top-nav');
  const syncNav = () => nav?.classList.toggle('scrolled', scrollY > 15);
  syncNav(); addEventListener('scroll', syncNav, {passive:true});

  // The grain is a fixed PNG. Each canvas keeps its own slowly changing character grid.
  for (const canvas of document.querySelectorAll('[data-glyph-field]')) {
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    const alphabet = '01+−*:.';
    let width=0,height=0,size=10,cols=0,rows=0,cells=[],pointer={x:-9999,y:-9999},visible=false;
    const draw = () => {
      ctx.clearRect(0,0,width,height);
      ctx.font = `${width<600?8:7}px DepartureMono,monospace`;
      ctx.textBaseline = 'middle';
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        const x=col*size+size/2,y=row*size+size/2;
        const sun=Math.max(0,1-Math.hypot((x-width*.86)/(width*.42),(y-height*.12)/(height*.8)));
        const mouse=Math.max(0,1-Math.hypot(x-pointer.x,y-pointer.y)/130);
        const alpha=Math.min(.42,.012+sun*.13+mouse*.3);
        const rgb=mouse>.12?'164,201,223':'193,193,202';
        ctx.fillStyle=`rgba(${rgb},${alpha})`;
        ctx.fillText(cells[row*cols+col],x,y);
      }
    };
    const resize = () => {
      const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
      width=rect.width;height=rect.height;size=innerWidth<780?14:10;
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
      cols=Math.ceil(width/size);rows=Math.ceil(height/size);
      cells=Array.from({length:cols*rows},()=>alphabet[Math.floor(Math.random()*alphabet.length)]);
      draw();
    };
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)draw()}).observe(canvas);
    addEventListener('pointermove',event=>{
      if(!visible||reduced.matches)return;
      const rect=canvas.getBoundingClientRect();pointer={x:event.clientX-rect.left,y:event.clientY-rect.top};draw();
    },{passive:true});
    document.addEventListener('pointerleave',()=>{pointer={x:-9999,y:-9999};if(visible)draw()});
    setInterval(()=>{
      if(!visible||document.hidden||reduced.matches)return;
      for(let i=0;i<Math.min(6,cells.length);i++)cells[Math.floor(Math.random()*cells.length)]=alphabet[Math.floor(Math.random()*alphabet.length)];
      draw();
    },150);
    document.fonts.ready.then(resize);
  }

  const search=document.querySelector('#noteSearch'),rows=[...document.querySelectorAll('#noteList .note-row')];
  let category='全部';
  const filter=()=>{
    const query=(search?.value||'').normalize('NFKC').trim().toLocaleLowerCase();
    let count=0;
    for(const row of rows){
      const match=(category==='全部'||row.dataset.category===category)&&row.dataset.search.toLocaleLowerCase().includes(query);
      row.hidden=!match;if(match)count++;
    }
    const empty=document.querySelector('#emptyNotes'),counter=document.querySelector('#notesCount');
    if(empty)empty.hidden=count>0;
    if(counter)counter.textContent=String(count).padStart(2,'0');
  };
  search?.addEventListener('input',filter);
  for(const button of document.querySelectorAll('[data-filter]'))button.addEventListener('click',()=>{
    category=button.dataset.filter;
    for(const sibling of document.querySelectorAll('[data-filter]'))sibling.setAttribute('aria-pressed',String(sibling===button));
    filter();
  });
  if(rows.length)filter();

  const toc=[...document.querySelectorAll('.article-toc a')];
  if(toc.length){
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting)for(const link of toc)link.classList.toggle('active',link.hash==='#'+entry.target.id);
    },{rootMargin:'-100px 0px -60% 0px'});
    for(const link of toc){const heading=document.getElementById(link.hash.slice(1));if(heading)observer.observe(heading)}
  }
})();
