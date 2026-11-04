from html import escape


def code(text):
    return '<pre tabindex="0" aria-label="代码示例，可横向滚动"><code>' + escape(text.strip()) + '</code></pre>'


NOTES = [
    {
        'slug': 'game-loop',
        'title': '小蛇怎么走，才不会跟着帧率忽快忽慢？',
        'summary': '把规则更新和画面绘制分开，再用一个累加器，让每一步都有自己的时间。',
        'category': '图形与交互',
        'label': 'CANVAS / GAME LOOP',
        'source': 'src/page.html',
        'body': '''
<p class="article-lead">画一条蛇不难。做成游戏后，一个很早要想清楚的问题是：屏幕每刷新一次，蛇就要走一格吗？</p>
<h2 id="two-clocks">画面和规则，用两只钟</h2>
<p>如果直接在 <code>requestAnimationFrame</code> 里前进一步，蛇的速度就会受屏幕刷新率影响。我的处理是：绘制可以尽量跟上屏幕，规则更新则按游戏自己的步长进行。</p>
<p>当前项目把规则放在 <code>SnackEngine</code> 中。引擎只关心蛇在哪里、食物有没有被吃掉、这一步是否碰撞；页面拿到状态，再把它画到 Canvas 上。这样改蛇的配色时，不需要同时修改碰撞规则。</p>
''' + code('''function frame(t) {
  const dt = Math.min(t - (lastTime || t), 80);
  lastTime = t;
  if (e.status === 'running') {
    accumulator += dt;
    while (accumulator >= e.interval && e.status === 'running') {
      accumulator -= e.interval;
      e.step();
      for (const event of e.events) onEvent(event);
      updateUI();
    }
  }
  draw(t, dt);
  requestAnimationFrame(frame);
}''') + '''
<h2 id="accumulator">把零碎的时间攒起来</h2>
<p>累加器 <code>accumulator</code> 保存还没有用掉的时间。一次绘制间隔不够走一步，就先攒着；攒够 <code>e.interval</code>，才更新一格，并减去这一步消耗的时间。这里的步长会随着吃到的食物数量变化，但不会直接跟屏幕帧率绑定。</p>
<p>代码还把单次传入的 <code>dt</code> 限制在 80 毫秒。它是一个取舍：切回标签页时，不要为了补上离开的时间，一口气把蛇推进很多格。因此，这里追求的是可玩的节奏，而不是在后台精确追赶现实时间。</p>
<h2 id="pause">暂停，要停哪些东西？</h2>
<p>游戏暂停时，规则引擎不再前进；蛇、牵线、跳大和斧头使用的游戏时间也一起停住。页面仍然可以继续绘制，因此暂停浮层和背景不需要跟着整页冻结。语音的暂停由语音管理器单独处理。</p>
<h2 id="learned">这次记住的一件事</h2>
<p>先区分“状态应该怎样变化”和“状态应该怎样显示”，后面加效果会轻松很多。圆框眼镜、粉蓝蛇身、定身时的提示，都可以在同一套规则之上慢慢调整。</p>
''',
    },
    {
        'slug': 'input-buffer',
        'title': '方向键和手机滑动，最后走同一条路',
        'summary': '输入先变成方向，再进入短队列；处理反向、连按和触屏手势时，少写一套规则。',
        'category': '图形与交互',
        'label': 'INPUT / TOUCH',
        'source': 'src/engine.js',
        'body': '''
<p class="article-lead">电脑按方向键，手机在棋盘上滑动。操作方式不同，但小蛇真正需要收到的东西只有四个方向。</p>
<h2 id="one-entry">先把输入翻译成方向</h2>
<p>页面负责读取按键、滑动和方向按钮，再把它们交给同一个转向入口。规则引擎不用知道玩家是在手机还是电脑上，也不用关心某个触点的坐标。</p>
<p>WASD 和方向键做映射；滑动则比较横向、纵向的位移，位移较大的轴决定转向。项目里把 18 个 CSS 像素作为一次滑动的识别门槛，用来减少手指轻微抖动带来的误转向。</p>
<h2 id="queue">为什么不能只保存最后一次按键？</h2>
<p>假设蛇正在向右走，玩家很快按了“下、左”。如果只记最后一个“左”，它会被当成直接反向而忽略；如果立即改方向，又可能在同一步里反向撞到自己。我用了最多两项的输入队列，让连续两个合法转弯按步执行。</p>
''' + code('''turn(direction) {
  if (!vectors[direction] || this.queue.length >= 2) return false;
  const last = this.queue.length
    ? this.queue[this.queue.length - 1]
    : this.direction;
  const a = vectors[last], b = vectors[direction];
  if (last === direction || (a[0] + b[0] === 0 && a[1] + b[1] === 0)) {
    return false;
  }
  this.queue.push(direction);
  return true;
}''') + '''
<h2 id="reference">相对于队列末尾，判断下一次转向</h2>
<p>这里的小细节是 <code>last</code>：队列不为空时，新输入要和队列最后一个方向比较，而不是一直和当前方向比较。这才接得住“下、左”这样的连续操作。</p>
<p>队列也不宜太长。把好几秒前的输入一直留着，会让蛇看上去不听使唤。两项是这个小项目当前采用的长度，不是所有游戏都应该照搬的标准。</p>
<h2 id="pointer">触屏，还要照顾手指离开棋盘的情况</h2>
<p>按下时使用 Pointer Capture 跟踪同一个触点，抬起、取消或失去捕获时清理手势状态。识别出一次转向后，以当前触点作为新的起点，允许玩家不松手就继续滑出下一次转向。</p>
<p>棋盘设置 <code>touch-action: none</code>，避免操作时整页跟着滚；限制只放在棋盘上，正文部分依然可以正常上下浏览。手机下方也保留方向按钮，让不习惯滑动的人有另一个选择。</p>
''',
    },
    {
        'slug': 'fair-random',
        'title': '随机不等于每隔几秒扔一次骰子',
        'summary': '给干扰事件加冷却、递增概率和起手间隔，让意外出现，也留出反应时间。',
        'category': '工程实践',
        'label': 'STATE / RANDOMNESS',
        'source': 'src/engine.js',
        'body': '''
<p class="article-lead">把卡尔玛牵线和潘森跳大加进来之后，固定时间表太容易猜，完全独立的随机又可能挤成一团。这次我试着在两者之间找一个节奏。</p>
<h2 id="cooldown">先留一段确定不会发生的空窗</h2>
<p>每种干扰都有自己的最短冷却，并加上 0 到 1200 毫秒的抖动。在下一次检测时间之前，事件不会开始。这样刚处理完一个威胁，不会立刻又被同一种事件追着打。</p>
<h2 id="chance">没来过，就慢慢提高概率</h2>
<p>进入检测阶段后，初始触发概率是 18%。一次没触发，下一次就提高 20 个百分点，并在 900 到 1600 毫秒后重试。到达最晚时间时，只要没有其他约束阻拦，就允许触发。</p>
''' + code('''const chance = Math.min(1, .18 + threat.misses * .2);
if (this.elapsedMs >= threat.deadline || this.random() < chance) {
  this.threatGapUntil = this.elapsedMs + 2200
    + Math.floor(this.random() * 1401);
  return true;
}
threat.misses++;
threat.nextAt = this.elapsedMs + 900
  + Math.floor(this.random() * 701);''') + '''
<h2 id="constraints">事件之间，也得互相看一眼</h2>
<p>所有威胁的起手共用一段 2.2 到 3.6 秒的间隔。卡尔玛牵线和潘森跳大还加了互斥：一方正在执行时，另一方暂缓起手，避免玩家被定在落点里却没有合理的逃跑机会。斧头仍可能与已开始的事件重叠，所以画面里的预警依然很重要。</p>
<p>最晚触发时间也不能越过这些约束。换句话说，“到点必出”仍要服从公平性检查，而不是强行把事件塞进去。</p>
<h2 id="test">随机逻辑怎么检查？</h2>
<p>引擎允许从外部传入 <code>random</code> 函数。测试时换成带种子的随机序列，就能重复同一段过程，检查是否真的有冷却、三种威胁能否长期重复出现、起手之间是否留了间隔。</p>
<p>这套方法不会让每一局都恰到好处，但比只看一两次游玩更容易找到长时间不出现、接连触发或暂停后计时出错的问题。节奏最后仍需要实际玩过再调。</p>
''',
    },
    {
        'slug': 'voice-queue',
        'title': '让台词一句句说完：一个很小的语音队列',
        'summary': '同一时刻只播一句，旧反应及时过期；暂停、打断和异步播放失败也都要有去处。',
        'category': '工程实践',
        'label': 'AUDIO / EVENT QUEUE',
        'source': 'src/voice.js',
        'body': '''
<p class="article-lead">几句熟悉的台词能让小蛇热闹起来，但吃东西、开技能和敌人出招挤在一起时，也很容易变成谁都听不清。</p>
<h2 id="director">给声音安排一个入口</h2>
<p>项目里用 <code>VoiceDirector</code> 管理同一个 audio 元素。游戏事件提出“想播哪一句”，管理器再决定现在播放、排队，还是忽略。音效则交给另一条通道，人声和音效可以分别关闭。</p>
<h2 id="expiry">排队的台词也会过时</h2>
<p>队列最多保留两项，按优先级排序；正在播放和已经排队的同一句台词不会重复加入。每项还带一个过期时间，轮到它时如果已经太晚，就直接丢掉。躲过一刀的反应，没必要隔了好几秒才突然补播。</p>
''' + code('''next() {
  if (!this.enabled || this.held) return;
  const item = this.queue.find(item => item.expires >= this.now());
  this.queue = this.queue.filter(candidate =>
    candidate !== item && candidate.expires >= this.now()
  );
  if (item) this.start(item);
  else delete this.player.dataset.clip;
}''') + '''
<h2 id="async">一次旧的播放失败，别打断下一句</h2>
<p><code>audio.play()</code> 返回 Promise。切换台词后，前一次播放的失败结果仍可能回来。项目用一个递增的 <code>generation</code> 标记区分播放请求：过期请求的报错不再处理，避免它把已经开始的新台词停掉。</p>
<h2 id="pause">暂停和静音，各自做什么？</h2>
<p>暂停游戏时保留当前台词的位置，但清掉尚未播放的队列；继续后再尝试接着播放。关闭人声则清空播放状态和队列。这样不会出现重新开启声音后，把很久以前的事件重新念一遍。</p>
<p>浏览器还要求播放经过用户交互，因此人声虽然默认开启，真正发声仍从点击“开吃”等操作之后开始。播放失败时，页面会给出可操作的提示。</p>
<h2 id="assets">素材来源也一起记下来</h2>
<p>游戏代码开源，并不意味着原声素材的权利也随之改变。仓库里的 <code>NOTICE.md</code> 单独记录音频等第三方素材说明，游戏帮助里也保留了对应出处。介绍视频和私人视频工程没有放进公开仓库。</p>
''',
    },
]
