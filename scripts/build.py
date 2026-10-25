from pathlib import Path
import base64,json,re
root=Path(__file__).resolve().parent.parent
src=root/'src'
page=(src/'page.html').read_text()
clips=json.loads((root/'assets/audio/clips.json').read_text())
for key,clip in clips.items():
 clip['src']='data:audio/mpeg;base64,'+base64.b64encode((root/f'assets/audio/{key}.mp3').read_bytes()).decode()
page=page.replace('/* VOICE_SOURCE */',(src/'voice.js').read_text()).replace('/* ENGINE_SOURCE */',(src/'engine.js').read_text()).replace('/* VOICE_CLIPS */{}',json.dumps(clips,ensure_ascii=False,separators=(',',':')))
(root/'index.html').write_text(page)
(root/'favicon.svg').write_text((root/'assets/favicon.svg').read_text())
print('Built index.html')
