"""Validate and package only the public, generated site for deployment."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib,json,runpy,sys,tarfile

root=Path(__file__).resolve().parents[1]
notes=runpy.run_path(str(root/'src/site/content.py'))['NOTES']
paths=['index.html','404.html','favicon.svg','robots.txt','sitemap.xml',
       'play/index.html','play/favicon.svg','projects/snack-snake/index.html']
paths += [f'notes/{note["slug"]}/index.html' for note in notes]
paths += ['site-assets/'+name for name in ['site.css','site.js','DepartureMono-Regular.woff2',
          'DepartureMono-OFL.txt','grain-tile.png','wallpaper.svg','gameplay.webp']]
public=set(paths)


class Page(HTMLParser):
    def __init__(self,text):
        super().__init__();self.links=[];self.ids=set();self.feed(text)

    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if 'id' in attrs:self.ids.add(attrs['id'])
        for key in ('href','src'):
            if attrs.get(key):self.links.append(attrs[key])


pages={path:Page((root/path).read_text()) for path in paths if path.endswith('.html')}
for path,page in pages.items():
    assert '粤ICP备2026172509号-1' in (root/path).read_text(),path
    for link in page.links:
        url=urlsplit(link)
        if url.scheme or url.netloc:continue
        decoded=unquote(url.path)
        target=(root/decoded.lstrip('/')) if decoded.startswith('/') else (root/path).parent/decoded
        if not decoded:target=root/path
        if decoded.endswith('/'):target=target/'index.html'
        if target.is_dir():target=target/'index.html'
        relative=target.resolve().relative_to(root.resolve()).as_posix()
        assert relative in public,f'{path}: missing public target {link}'
        if url.fragment and relative in pages:
            assert unquote(url.fragment) in pages[relative].ids,f'{path}: missing fragment {link}'

manifest={}
for path in paths:
    p=root/path
    assert p.is_file() and not p.is_symlink(),path
    manifest[path]=hashlib.sha256(p.read_bytes()).hexdigest()
output=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/snack-notebook-site.tar.gz')
with tarfile.open(output,'w:gz') as archive:
    for path in paths:archive.add(root/path,arcname=path,recursive=False)
manifest_path=output.with_suffix('').with_suffix('.manifest.json')
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(paths),'checkedPages':len(pages),'archive':str(output),'bytes':output.stat().st_size,'manifest':str(manifest_path)},ensure_ascii=False))
