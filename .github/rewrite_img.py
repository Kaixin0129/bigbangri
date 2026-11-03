import json,os,re,sys,urllib.parse as U
H=json.load(open('.github/imgmap.json',encoding='utf-8'))['files']
base='https://kaixin0129.github.io/'
rx=re.compile(r'''(?i)(?P<pre>\b(?:src|href|data-src|poster)\s*=\s*)(?P<q>["'])(?P<v>[^"'<>]*)(?P=q)|(?P<pre2>url\(\s*)(?P<q2>["']?)(?P<v2>[^)"'<>]+)(?P=q2)(?P<post2>\s*\))''')
skip={'.git','.history','node_modules','_pagefind','.vscode','.github'}
nf=nr=0
for d,ds,fs in os.walk('.'):
  ds[:]=[x for x in ds if x not in skip]
  rel=os.path.relpath(d,'.').replace('\\','/'); rel='' if rel=='.' else rel
  for fn in fs:
    if not fn.lower().endswith(('.html','.htm')): continue
    p=os.path.join(d,fn); b=open(p,'rb').read()
    try: t=b.decode('utf-8-sig')
    except: continue
    bom=b.startswith(b'\xef\xbb\xbf'); c=[0]
    def f(m):
      u=m.group('v2') is not None; v=m.group('v2') if u else m.group('v')
      if not v or re.match(r'^\s*([a-zA-Z][a-zA-Z0-9+.-]*:|//|#)',v): return m.group(0)
      i=min([k for k in (v.find('?'),v.find('#')) if k>=0],default=-1)
      path,tail=(v[:i],v[i:]) if i>=0 else (v,'')
      dp=U.unquote(path.strip())
      full=dp.lstrip('/') if dp.startswith('/') else (rel+'/'+dp if rel else dp)
      st=[]
      for s in full.replace('\\','/').split('/'):
        if s=='..':
          if st: st.pop()
        elif s not in ('.',''): st.append(s)
      e=H.get('/'.join(st).lower())
      if not e: return m.group(0)
      url=base+e[0]+'/'+'/'.join(U.quote(s,safe='') for s in e[1].split('/'))+tail
      c[0]+=1
      if u: return m.group('pre2')+m.group('q2')+url+m.group('q2')+m.group('post2')
      return m.group('pre')+m.group('q')+url+m.group('q')
    n=rx.sub(f,t)
    if c[0]:
      open(p,'wb').write((b'\xef\xbb\xbf' if bom else b'')+n.encode('utf-8')); nf+=1; nr+=c[0]
print('files',nf,'refs',nr)