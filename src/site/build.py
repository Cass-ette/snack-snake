from pathlib import Path
from html import escape
import hashlib,json,math,re,runpy,shutil

root=globals().get('ROOT',Path(__file__).resolve().parents[2])
source=root/'src/site'
notes=runpy.run_path(str(source/'content.py'))['NOTES']
assets=root/'site-assets'
assets.mkdir(exist_ok=True)
shutil.copy2(source/'retire-worker.js',root/'sw.js')
for origin,name in [
    (source/'style.css','site.css'),(source/'site.js','site.js'),
    (root/'assets/fonts/DepartureMono-Regular.woff2','DepartureMono-Regular.woff2'),
    (root/'assets/fonts/DepartureMono-OFL.txt','DepartureMono-OFL.txt'),
    (root/'assets/images/grain-tile.png','grain-tile.png'),
    (root/'assets/images/wallpaper.svg','wallpaper.svg'),
    (root/'assets/images/gameplay-board.webp','gameplay.webp')]:
    shutil.copy2(origin,assets/name)
version=hashlib.sha256((source/'style.css').read_bytes()+(source/'site.js').read_bytes()).hexdigest()[:10]
game=json.loads((root/'assets/images/gameplay-meta.json').read_text())
SITE='我的编程学习笔记'
REPO='https://github.com/Cass-ette/snack-snake'
DATE='2026-11-04'
icons={
    'book':['1111110','1000010','1011010','1000010','1011010','1000010','0111100'],
    'arrow':['0000000','0011110','0000110','0001010','0010000','0100000','0000000'],
    'play':['0100000','0110000','0111000','0111100','0111000','0110000','0100000'],
    'code':['0010100','0100010','1000001','0100010','0010100','0000000','0000000'],
    'spark':['0001000','0101010','0011100','1111111','0011100','0101010','0001000'],
    'search':['0011100','0100010','0100010','0100010','0011110','0000010','0000001'],
}


def icon(name):
    grid=icons[name]
    pixels=''.join(f'<rect x="{x+1}" y="{y+1}" width="1" height="1"/>' for y,row in enumerate(grid) for x,v in enumerate(row) if v=='1')
    return f'<svg class="pixel-icon" viewBox="0 0 9 9" aria-hidden="true">{pixels}</svg>'


def external(href,label,cls='text-link'):
    return f'<a class="{cls}" href="{href}" target="_blank" rel="noopener noreferrer">{label} {icon("arrow")}</a>'


def layout(title,description,body,path='/',kind='website'):
    full_title=SITE if path=='/' else f'{title} · {SITE}'
    data={'@context':'https://schema.org','@type':'WebSite' if kind=='website' else 'BlogPosting','name':title,'url':'https://viper3.icu'+path,'inLanguage':'zh-CN','description':description}
    if kind=='article':data.update({'headline':title,'datePublished':DATE,'dateModified':DATE,'isPartOf':{'@type':'WebSite','name':SITE,'url':'https://viper3.icu/'}})
    schema_data=json.dumps(data,ensure_ascii=False).replace('<','\\u003c')
    return f'''<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#161617"><title>{escape(full_title)}</title>
<meta name="description" content="{escape(description,quote=True)}"><link rel="canonical" href="https://viper3.icu{path}">
<meta property="og:type" content="{'article' if kind=='article' else 'website'}"><meta property="og:locale" content="zh_CN"><meta property="og:site_name" content="{SITE}">
<meta property="og:title" content="{escape(full_title,quote=True)}"><meta property="og:description" content="{escape(description,quote=True)}"><meta property="og:url" content="https://viper3.icu{path}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="preload" href="/site-assets/DepartureMono-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/site-assets/site.css?v={version}"><script src="/site-assets/site.js?v={version}" defer></script>
<script type="application/ld+json">{schema_data}</script>
</head><body>
<a class="skip-link" href="#main">跳到正文</a><div class="atmosphere" aria-hidden="true"></div><div class="page-grain" aria-hidden="true"></div>
<header class="top-nav"><div class="nav-inner container"><a class="brand" href="/" aria-label="我的编程学习笔记首页"><span class="brand-symbol">{icon('book')}</span>VIPER3 / NOTES</a><nav class="nav-links" aria-label="主导航"><a href="/#projects">项目</a><a class="nav-notes" href="/#notes">笔记</a><a class="nav-about" href="/#about">关于</a><a class="nav-play" href="/play/">试玩小蛇 {icon('arrow')}</a></nav></div></header>
{body}
<footer class="site-footer container"><div class="footer-top"><span class="footer-brand">{icon('book')}{SITE}</span><span class="mono">LEARN A LITTLE. BUILD SOMETHING.</span><span>个人学习与项目记录 · {external(REPO,'源码','footer-source')}</span></div><a class="icp-record" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">粤ICP备2026172509号-1</a></footer>
</body></html>'''


def note_row(note,index):
    words=len(re.sub('<[^>]+>','',note['body']))
    minutes=max(1,math.ceil(words/450))
    searchable=escape(' '.join([note['title'],note['summary'],note['category'],note['label']]),quote=True)
    return f'''<a class="note-row" href="/notes/{note['slug']}/" data-category="{note['category']}" data-search="{searchable}"><span class="note-number">{index:02}</span><div class="note-main"><h3>{note['title']}</h3><p>{note['summary']}</p></div><div class="note-meta"><span>{note['category']} · 约 {minutes} 分钟</span><span class="mono">{DATE.replace('-','.')}</span></div><span class="note-arrow" aria-hidden="true">↗</span></a>'''


def device():
    return f'''<div class="mac-device"><div class="mac-screen"><div class="mac-menubar" aria-hidden="true">{icon('spark')}<span>编程学习笔记</span><span class="menu-extra">文件</span><span class="menu-extra">项目</span><span class="mac-clock">PROJECT / 001</span></div><div class="mac-notch" aria-hidden="true"><i></i>SNACK SNAKE</div>
<a class="desktop-note" href="/notes/game-loop/">{icon('book')}<div><span class="note-label">FROM THE NOTEBOOK</span><strong>先把状态<br>写清楚。</strong><p>规则更新和画面绘制，<br>分开处理。</p><span class="note-bottom">NOTE / 01 <span>↗</span></span></div></a>
<div class="project-window"><div class="window-bar"><span class="traffic-lights" aria-hidden="true"><i></i><i></i><i></i></span><span>projects / snack-snake</span><span class="window-tools">JS · CANVAS</span></div><div class="window-layout"><div class="window-sidebar" aria-hidden="true"><div class="sidebar-title">EXPLORER</div><div class="file-row active"><i></i>engine.js</div><div class="file-row"><i></i>page.html</div><div class="file-row"><i></i>voice.js</div><div class="sidebar-foot">从一个小想法，<br>写到能玩。</div></div><div class="window-body"><div class="preview-score"><span>粉蓝蛇蛇 <strong>{game['score']:03}</strong></span><span class="mono">BLG / PINK &amp; BLUE</span></div><a class="preview-link" href="/play/" aria-label="打开粉蓝蛇蛇，电脑和手机均可游玩"><img src="/site-assets/gameplay.webp" width="1396" height="1164" fetchpriority="high" alt="实际游玩中的粉蓝小蛇，戴着圆框眼镜，棋盘上有 M 豆、黑巧和汉堡"><span class="preview-hint"><span>打开试玩 ↗</span></span></a><div class="window-status"><span>KEYBOARD + TOUCH</span><span>OPEN SOURCE</span></div></div></div></div><span class="desktop-caption" aria-hidden="true">PERSONAL PROJECT / CANVAS EXPERIMENT</span></div><div class="mac-lip" aria-hidden="true"></div></div>'''


home=f'''<main id="main"><section class="hero container" aria-labelledby="homeTitle"><canvas class="hero-canvas" data-glyph-field aria-hidden="true"></canvas><div class="eyebrow">A PERSONAL NOTEBOOK <span class="eyebrow-zh">/ 个人编程学习记录</span></div><div class="hero-heading-row"><h1 id="homeTitle">边学边写，<br>也做点<span>好玩的。</span></h1><div class="hero-intro"><p>把编程里想明白的事记下来，也把小想法做成能打开、能上手的作品。这里放学习笔记、实践项目和它们的迭代记录。</p><a class="text-link" href="#notes">翻翻最近的笔记 <span aria-hidden="true">↓</span></a></div></div><div class="hero-bottom"><span class="location">个人学习 · 项目实践 · 开源记录</span><span>EST. 2026 / ALWAYS LEARNING</span></div></section>
<section class="project-section container" id="projects" aria-labelledby="projectsTitle"><div class="section-head"><div><p class="section-label">01 / SELECTED PROJECT</p><h2 id="projectsTitle">写出来，也跑起来。</h2></div><p class="section-caption">一个正在迭代的小练习。</p></div><div class="project-intro"><div><h3>粉蓝蛇蛇 <span>SNACK SNAKE</span></h3><p>从贪吃蛇开始，练习 Canvas 绘制、状态管理和触屏交互。后来又加上了巧克力、汉堡，以及一些熟悉的梗。</p></div><div class="project-actions"><a class="button primary" href="/play/">试玩一下 {icon('play')}</a><a class="text-link" href="/projects/snack-snake/">项目笔记 {icon('arrow')}</a></div></div>{device()}<div class="project-foot"><span>电脑键盘 / 手机滑动都能玩 · 代码已开源</span><span class="mono">{external(REPO,'VIEW SOURCE','footer-source')}</span></div></section>
<section class="notes-section container" id="notes" aria-labelledby="notesTitle"><div class="section-head"><div><p class="section-label">02 / FIELD NOTES</p><h2 id="notesTitle">从项目里，拆几个问题。</h2></div><p class="section-caption">先做，再把踩过的坑记下来。</p></div><div class="note-tools"><div class="note-filters" role="group" aria-label="按笔记分类筛选"><button class="filter-button" type="button" data-filter="全部" aria-pressed="true">全部</button><button class="filter-button" type="button" data-filter="图形与交互" aria-pressed="false">图形与交互</button><button class="filter-button" type="button" data-filter="工程实践" aria-pressed="false">工程实践</button></div><label class="note-search" for="noteSearch">{icon('search')}<input id="noteSearch" type="search" placeholder="搜索笔记…" aria-label="搜索学习笔记"><span class="notes-count" id="notesCount" aria-live="polite">04</span></label></div><div id="noteList">{''.join(note_row(n,i+1) for i,n in enumerate(notes))}</div><p class="empty-notes" id="emptyNotes" hidden>暂时没有找到这篇，换个关键词试试。</p><noscript><p class="section-caption">所有笔记已列在上方；开启 JavaScript 后可以搜索与筛选。</p></noscript></section>
<section class="about-section container" id="about" aria-labelledby="aboutTitle"><div><p class="section-label">03 / ABOUT THIS SPACE</p><h2 id="aboutTitle">不急着做大，<br>先把小东西做完整。</h2></div><div class="about-copy"><p>这里是我的个人编程学习笔记。喜欢从一个具体的小问题开始：一条蛇怎么转弯，一段声音怎么排队，一个看似随机的事件，怎样才算公平。</p><p>目前的笔记围绕粉蓝蛇蛇这个练习展开，记录代码里的做法、取舍和还想继续改的地方。项目可以直接体验，相关实现也能在开源仓库里找到。</p><div class="about-links"><a class="text-link" href="/projects/snack-snake/">看看这个项目 {icon('arrow')}</a>{external(REPO,'去 GitHub 翻代码')}</div></div></section></main>'''

def write(path,text):
    target=root/path
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(text)


write('index.html',layout(SITE,'记录个人编程学习心得、技术笔记和项目实践。从 Canvas 小游戏开始，把交互、状态管理与工程里的取舍慢慢写清楚。',home))

project_body=f'''<main class="container" id="main"><div class="page-breadcrumb"><a href="/">学习笔记</a><span aria-hidden="true">/</span><a href="/#projects">项目实践</a><span aria-hidden="true">/</span><span>粉蓝蛇蛇</span></div><header class="project-page-hero"><canvas class="hero-canvas" data-glyph-field aria-hidden="true"></canvas><div class="eyebrow">PROJECT / 001 · CANVAS EXPERIMENT</div><h1>粉蓝蛇蛇</h1><p>一条戴圆框眼镜的小蛇，吃 M 豆、黑巧和汉堡。<br>也是我的一次网页游戏练习：从基础规则写起，再慢慢加交互、声音和事件。</p><div class="project-page-actions"><a class="button primary" href="/play/">打开试玩 {icon('play')}</a>{external(REPO,'查看源码','button')}<a class="text-link" href="#projectNotes">读开发笔记 ↓</a></div></header><div class="project-specs"><div><span>BUILT WITH</span>JavaScript / Canvas</div><div><span>INPUT</span>键盘 / 触屏</div><div><span>PROJECT TYPE</span>个人编程练习</div><div><span>STATUS</span>持续迭代</div></div>{device()}<div class="project-longform"><article class="article-body"><h2 id="why">从一条蛇开始</h2><p>最初想做的是一条粉蓝相间、戴圆框眼镜的蛇。食物换成 M 豆、巧克力和汉堡，再把熟悉的二创台词放进来，就有了这个小项目。</p><p>底层依然是贪吃蛇：移动、吃东西、长大、判断碰撞。在这个基础上，我逐步尝试了浓度与护盾、带预警的攻击，以及卡尔玛牵线、探照果实和潘森跳大等事件。</p><h2 id="practice">这个项目练了什么</h2><ul><li><strong>规则和绘制分离：</strong>引擎记录棋盘状态，Canvas 负责把蛇、食物和预警画出来。</li><li><strong>统一输入：</strong>键盘、触屏滑动和方向按钮共用转向队列。</li><li><strong>事件节奏：</strong>冷却、递增概率和互斥约束一起决定下一次干扰。</li><li><strong>语音管理：</strong>用优先级、短队列和过期时间处理多句台词。</li><li><strong>逻辑验证：</strong>用可复现的随机序列检查边界、暂停、伤害和事件间隔。</li></ul><h2 id="play">怎么玩</h2><p>电脑用方向键或 WASD 转向，空格暂停，E 开毒雾；手机可以在棋盘上滑动，也能用下方的方向按钮。先找吃的，再留意橙色斧线、卡尔玛圆圈和潘森金色落点。</p><p>小蛇有四套战袍：BLG 粉蓝、Griffin 红白、EDG 黑白、HLE 橙灰。随时换色，不清空当前进度。游戏内有完整玩法说明和素材出处。</p><h2 id="next">还想慢慢改的地方</h2><p>继续打磨手机上的操作手感，观察事件叠加时有没有不合理的难度，再考虑加入新的干扰角色。先把现有玩法做顺，再往里加东西。</p><h2 id="source">代码与素材</h2><p>游戏代码以 MIT 许可公开，构建脚本、规则引擎和逻辑测试都在同一个仓库里。音频等第三方素材的说明单独放在 <a href="{REPO}/blob/main/NOTICE.md" target="_blank" rel="noopener noreferrer">NOTICE.md</a>，它们不因代码开源而改变原有权利。这里公开的是网站和游戏实现，介绍视频工程留在本地。</p><div class="project-note-index" id="projectNotes"><h2>这个项目的开发笔记</h2>{''.join(f'<a href="/notes/{n["slug"]}/">{n["title"]}<span aria-hidden="true">↗</span></a>' for n in notes)}</div></article><aside class="article-aside project-aside"><canvas class="corner-field" data-glyph-field aria-hidden="true"></canvas><p class="aside-heading">PROJECT FILE</p><dl><dt>项目名称</dt><dd>粉蓝蛇蛇 · Snack Snake</dd><dt>用途</dt><dd>个人学习与作品展示</dd><dt>当前支持</dt><dd>电脑浏览器 / 手机浏览器</dd><dt>源代码</dt><dd>{external(REPO,'GitHub 开源','footer-source')}</dd></dl><a class="button primary" href="/play/">去玩一局 {icon('play')}</a></aside></div></main>'''
write('projects/snack-snake/index.html',layout('粉蓝蛇蛇：一个 Canvas 游戏练习','从贪吃蛇到触屏操作、伪随机事件和语音队列，记录粉蓝蛇蛇这个个人编程项目的实现与取舍。',project_body,'/projects/snack-snake/'))

for index,note in enumerate(notes):
    headings=re.findall(r'<h2 id="([^"]+)">(.*?)</h2>',note['body'])
    toc=''.join(f'<a href="#{key}">{title}</a>' for key,title in headings)
    minutes=max(1,math.ceil(len(re.sub('<[^>]+>','',note['body']))/450))
    body=f'''<main class="container" id="main"><div class="page-breadcrumb"><a href="/">学习笔记</a><span aria-hidden="true">/</span><a href="/#notes">开发记录</a><span aria-hidden="true">/</span><span>{note['category']}</span></div><div class="article-layout"><article><header class="article-header"><div class="eyebrow">NOTE / {index+1:02} · {note['label']}</div><h1>{note['title']}</h1><div class="article-meta"><time datetime="{DATE}">{DATE.replace('-','.')}</time><span>{note['category']}</span><span>约 {minutes} 分钟</span></div></header><div class="article-body">{note['body']}</div><div class="article-end"><a href="/#notes">← 回到全部笔记</a>{external(REPO+'/blob/main/'+note['source'],'对照项目源码','footer-source')}</div></article><aside class="article-aside"><p class="aside-heading">ON THIS PAGE</p><nav class="article-toc" aria-label="文章目录">{toc}</nav><div class="aside-project"><p class="aside-heading">RELATED PROJECT</p><strong>粉蓝蛇蛇</strong><p>这篇笔记来自这个实际运行的 Canvas 游戏练习。</p><a class="text-link" href="/projects/snack-snake/">项目说明 {icon('arrow')}</a><br><a class="text-link" href="/play/">打开试玩 {icon('play')}</a></div></aside></div><section class="related-notes" aria-labelledby="relatedTitle"><div class="section-head"><div><p class="section-label">KEEP READING</p><h2 id="relatedTitle">再翻一篇。</h2></div></div>{note_row(notes[(index+1)%len(notes)],(index+1)%len(notes)+1)}</section></main>'''
    write(f'notes/{note["slug"]}/index.html',layout(note['title'],note['summary'],body,f'/notes/{note["slug"]}/','article'))

write('404.html',layout('这一页还没写到','你访问的页面不存在，可以回到编程学习笔记首页继续浏览。',f'<main class="container site-404" id="main"><p class="eyebrow">404 / PAGE NOT FOUND</p><h1>这一页，还没写到。</h1><p>地址可能变了，也可能是少打了一个字。</p><a class="button" href="/">回到学习笔记 {icon("arrow")}</a></main>','/404.html'))
paths=['/','/projects/snack-snake/','/play/']+[f'/notes/{n["slug"]}/' for n in notes]
write('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>https://viper3.icu{path}</loc></url>' for path in paths)+'</urlset>\n')
write('robots.txt','User-agent: *\nAllow: /\nSitemap: https://viper3.icu/sitemap.xml\n')
print(f'Built home, project page and {len(notes)} notes')
