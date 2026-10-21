const $=s=>document.querySelector(s),esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LS={g(k){try{return localStorage.getItem('hsn:'+k)}catch(e){return null}},s(k,v){try{localStorage.setItem('hsn:'+k,v)}catch(e){}},d(k){try{localStorage.removeItem('hsn:'+k)}catch(e){}}};
const A={mode:LS.g('mode'),tk:LS.g('tk')||'',role:LS.g('role')||'',v:null,ver:0,off:0,tab:'arena',adm:null,at:'Soal',ef:null,err:0};
const Perf={r:[],add(a,t,s){this.r.push({a,t,s});if(this.r.length>100)this.r.shift()}}; // Perf.r di console
function toast(m,e){const d=document.createElement('div');d.textContent=m;if(e)d.className='e';$('#toast').appendChild(d);setTimeout(()=>d.remove(),3200)}

// ── Pemanggil server (fetch ke GAS): timeout, retry baca, reqId idempoten untuk tulis ──
function call(a,d,to){const w=!/^(boot|poll|admData|getAudio)$/.test(a),id=w?(self.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random()):'';
 const once=async()=>{const c=new AbortController(),tm=setTimeout(()=>c.abort(),to||(w?30000:15000)),t0=performance.now();
  try{const rs=await fetch(GAS_URL,{method:'POST',redirect:'follow',cache:'no-store',signal:c.signal,headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({a:a,d:d||{},tk:A.tk,id:id})});
   const r=JSON.parse(await rs.text());Perf.add(a,Math.round(performance.now()-t0),r.ms);return r}
  catch(e){return{success:false,retry:1,message:e.name==='AbortError'?'Server terlalu lama merespons':'Koneksi terputus'}}finally{clearTimeout(tm)}};
 return(async()=>{let r;for(let i=0;i<(w?2:3);i++){if(i)await new Promise(x=>setTimeout(x,900*i));r=await once();if(r.success||!r.retry)break}
  if(!r.success&&r.code==='AUTH')logout();return r})()}

// ── Audio arena (sintesis WebAudio: tanpa berkas, tanpa delay) ──
const Snd={c:null,on(){if(!this.c)this.c=new(window.AudioContext||window.webkitAudioContext)();if(this.c.resume)this.c.resume();A.audio=1},
 t(f,d,ty,v,at){const s=A.v&&A.v.s;if(!this.c||(s&&s.mute))return;const c=this.c,o=c.createOscillator(),g=c.createGain(),t=c.currentTime+(at||0);o.type=ty||'sine';o.frequency.value=f;g.gain.setValueAtTime(v||.15,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+d)},
 buzz(){this.t(880,.25,'square',.2);this.t(660,.3,'square',.2,.12)},ok(){[523,659,784,1046].forEach((f,i)=>this.t(f,.28,'triangle',.18,i*.1))},bad(){this.t(220,.5,'sawtooth',.15);this.t(160,.5,'sawtooth',.15,.2)},tick(){this.t(1200,.05,'square',.08)},end(){this.t(300,.9,'sawtooth',.2)}};
Object.assign(Snd,{
 nz(d,v,f,at){const s=A.v&&A.v.s;if(!this.c||(s&&s.mute))return;const c=this.c,n=Math.floor(c.sampleRate*d),b=c.createBuffer(1,n,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);const src=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain();src.buffer=b;fl.type='bandpass';fl.frequency.value=f||1500;g.gain.value=v||.15;src.connect(fl);fl.connect(g);g.connect(c.destination);src.start(c.currentTime+(at||0))},
 whoosh(){this.nz(.45,.18,900);this.t(180,.4,'sine',.05)},pop(i){this.t(660+(i||0)*35,.14,'triangle',.12)},clap(){for(let i=0;i<14;i++)this.nz(.12,.1,2500,i*.09+Math.random()*.05)},
 reveal(){[392,494,587].forEach((f,k)=>this.t(f,.3,'triangle',.15,k*.12))},chime(){this.t(988,.3,'sine',.08);this.t(1319,.4,'sine',.07,.1)},sting(){[196,294,392,587].forEach((f,k)=>this.t(f,.9,'sawtooth',.1,k*.18))}});
// Backsound per fase (PRD US-04): pembukaan, tema utama, soal tegang, waktu kritis, kemenangan
const M={idle:{ms:320,v:.06,w:'triangle',m:1,ch:[[220,261.6,329.6],[174.6,220,261.6],[196,246.9,293.7],[164.8,207.7,246.9]]},
 tense:{ms:240,v:.07,w:'sawtooth',m:2,ch:[[110,130.8,164.8],[110,130.8,164.8],[103.8,123.5,155.6],[98,116.5,146.8]]},
 crit:{ms:130,v:.08,w:'square',m:2,ch:[[220,261.6,329.6],[233,277,349]]},
 intro:{ms:230,v:.1,w:'triangle',m:2,ch:[[261.6,329.6,392],[220,261.6,329.6],[174.6,220,261.6],[196,246.9,293.7]]},
 win:{ms:200,v:.1,w:'triangle',m:2,ch:[[261.6,329.6,392],[349.2,440,523],[392,493,587],[261.6,329.6,392]]}};
const Bgm={k:'',h:null,n:0,duck:0,
 set(k){if(!A.audio||(k===this.k&&(this.h||AU.cb)))return;this.k=k;this.n=0;clearInterval(this.h);this.h=null;if(AU.bgm('bgm_'+k))return;if(Snd.c)this.h=setInterval(()=>this.tick(),M[k].ms)},
 stop(){clearInterval(this.h);this.h=null;this.k='';AU.bgm(null)},
 tick(){const s=A.v&&A.v.s;if(!Snd.c||!s||s.mute||s.bgm===false)return;const c=M[this.k],d=A.dg,ch=c.ch[(this.n>>3)%c.ch.length],f=ch[this.n%3]*(this.n%8>=4?c.m:1);Snd.t(f,.4,c.w,c.v*d);if(this.n%8===0)ch.forEach(x=>Snd.t(x/2,1.6,'sine',c.v*.8*d));if(this.k==='tense'&&this.n%4===0)Snd.t(60,.25,'sine',.18*d);this.n++}};
// Audio kustom: diambil lewat Apps Script → blob (di-cache di browser), crossfade BGM, loop & volume per slot
async function auBlob(c){const key='/hsn-audio/'+c.id;try{const ca=await caches.open('hsn-au'),h=await ca.match(key);if(h)return URL.createObjectURL(await h.blob())}catch(e){}
 const r=await call('getAudio',{id:c.id},180000);if(!r.success)throw new Error(r.message||'gagal memuat');const bin=atob(r.data),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);const b=new Blob([u],{type:r.mime||'audio/mpeg'});
 try{const ca=await caches.open('hsn-au');await ca.put(key,new Response(b))}catch(e){}return URL.createObjectURL(b)}
const AU={el:{},im:{},cb:null,q:Promise.resolve(),
 load(cfg){Object.keys(this.el).forEach(k=>{if(!cfg[k]||cfg[k].id!==this.el[k]._c.id){this.el[k].pause();if(this.cb===this.el[k])this.cb=null;delete this.el[k]}});
  Object.keys(cfg).forEach(k=>{if(k.indexOf('img_')===0){const ik=k+':'+cfg[k].id;if(AU.im[ik]===undefined){AU.im[ik]='';AU.q=AU.q.then(async()=>{try{AU.im[ik]=await auBlob(cfg[k]);paint()}catch(x){toast('Gambar latar gagal dimuat',1)}})}return}let e=this.el[k];if(!e){e=new Audio();e.preload='auto';e._g=k.indexOf('bgm_')===0?0:1;e._gt=e._g;e._fd=900;e._c=cfg[k];this.el[k]=e;
   this.q=this.q.then(async()=>{try{const u=await auBlob(e._c);if(this.el[k]!==e)return;e.src=u;e.load();if(this.cb===e){e.currentTime=0;e.play().catch(()=>{})}}catch(x){toast('Audio "'+e._c.name+'" gagal dimuat',1)}})}
   e._c=cfg[k];e.loop=!!cfg[k].loop})},
 sfx(k){const e=this.el[k];if(!e||!e.src)return false;e.currentTime=0;e._g=1;e._gt=1;e.play().catch(()=>{});return true},
 bgm(k){const n=k&&this.el[k];if(this.cb&&this.cb!==n)this.cb._gt=0;this.cb=n||null;if(n){n.currentTime=0;n._g=0;n._gt=1;n.play().catch(()=>{})}return !!n},
 tick(){const s=A.v&&A.v.s,mu=s&&s.mute,bg=s&&s.bgm===false,vo=Object.assign({},VO,(s&&s.vo)||{}),tg=(Bgm.spk>0||Date.now()<Bgm.hold)?vo.duck/100:1;A.dg+=(tg-A.dg)*(tg<A.dg?.3:.08);Object.keys(this.el).forEach(k=>{const e=this.el[k],b=k.indexOf('bgm_')===0;
  if(e._g!==e._gt){const st=100/e._fd;e._g=e._g<e._gt?Math.min(e._gt,e._g+st):Math.max(e._gt,e._g-st);if(e._g<=0&&b&&e!==this.cb)e.pause()}
  e.volume=Math.max(0,Math.min(1,e._g*(e._c.vol/100)*((mu||(b&&bg))?0:1)*(b?A.dg:1)))})},
 async prev(k){const c=(A.au||{})[k];if(!c)return;if(A.pv){A.pv.pause();A.pv=null;if(A.pvk===k){A.pvk=null;return}}A.pvk=k;toast('Memuat audio…');
  try{const a=new Audio(await auBlob(c));a.loop=!!c.loop;a.volume=c.vol/100;A.pv=a;await a.play()}catch(e){toast('Gagal memutar: '+(e.message||'format tidak didukung'),1)}}};
setInterval(()=>AU.tick(),100);
[['buzz','sfx_buzz'],['bad','sfx_salah']].forEach(x=>{const o=Snd[x[0]];Snd[x[0]]=function(){if(!AU.sfx(x[1]))o.apply(this,arguments)}});
// Narator: kalimat per kalimat, scene menunggu narator selesai, ducking BGM halus & stabil
const VO={open:"Assalamu'alaikum warahmatullahi wabarakatuh. Selamat datang di Hari Santri Nasional Arena, Sunan Ampel. Mari kita sambut para peserta.",peserta:'Peserta nomor {no}. {nama}. Kelas {kelas}.',tutup:'Selamat bertanding untuk seluruh peserta. Semoga sukses. Mari kita mulai!',jopen:'Hadirin sekalian, inilah saatnya kita mengumumkan para juara.',j3:'Juara ketiga diraih oleh {nama}, kelas {kelas}, dengan perolehan {skor} poin. Selamat!',j2:'Juara kedua diraih oleh {nama}, kelas {kelas}, dengan perolehan {skor} poin. Selamat!',j1:'Dan juara pertama diraih oleh {nama}, kelas {kelas}, dengan perolehan {skor} poin. Selamat dan sukses!',jend:'Selamat kepada seluruh juara. Semoga ilmu yang didapat membawa keberkahan.',rate:90,duck:45,vol:100,vn:''};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fill=(t,i,s)=>{let x=String(t).replace(/\{total\}/g,s.tm.length);if(i!=null&&s.tm[i])x=x.replace(/\{no\}/g,i+1).replace(/\{nama\}/g,s.tm[i].n).replace(/\{kelas\}/g,s.tm[i].i);return x};
function one(p,vo,force){return new Promise(res=>{const est=Math.max(1500,p.length*85/(vo.rate/100)+1000),mu=!force&&A.v&&A.v.s.mute;
 if(!(A.audio||force)||mu||typeof speechSynthesis==='undefined'){setTimeout(res,est);return}
 let done=0,on=0;const fin=()=>{if(done)return;done=1;clearTimeout(tm);if(on)Bgm.spk--;Bgm.hold=Date.now()+900;res()},tm=setTimeout(fin,est*2+3000);
 try{const u=new SpeechSynthesisUtterance(p);u.lang='id-ID';u.rate=vo.rate/100;u.volume=Math.min(1,vo.vol/100);if(vo.vn){const v=speechSynthesis.getVoices().find(x=>x.name===vo.vn);if(v)u.voice=v}u.onstart=()=>{if(!done&&!on){on=1;Bgm.spk++}};u.onend=u.onerror=fin;speechSynthesis.speak(u)}catch(e){fin()}})}
async function speakP(text,ok,vo,force){vo=vo||Object.assign({},VO,(A.v&&A.v.s.vo)||{});const parts=String(text).match(/[^.!?]+[.!?]*/g)||[];for(const p of parts){if(ok&&!ok())return;if(p.trim()){await one(p.trim(),vo,force);await sleep(220)}}}
function speak(t){try{speechSynthesis.cancel()}catch(e){}setTimeout(()=>speakP(t),80)}
Bgm.spk=0;Bgm.hold=0;A.dg=1;

// ── Data & tampilan ──
const rank=s=>s.tm.map(t=>Object.assign({},t,{p:s.sc[t.id].n,x:s.sc[t.id].x,st:s.sc[t.id].st})).sort((a,b)=>b.p-a.p).map((t,i)=>Object.assign(t,{r:i+1}));
const ini=n=>esc(String(n).replace(/^Regu /,'').slice(0,2).toUpperCase());
const VER='2.0';
const hdr=(sub,nav)=>`<header class="top"><div><h1>HSN Arena <span class="tag gd">Sunan Ampel</span></h1><small>${sub} · v${VER}</small></div>${nav||''}<div class="sg" style="text-align:right"><b id="clk" style="font-size:20px">--:--:--</b><small>WIB · SYNC AKTIF</small></div></header>`;
const ring='<div class="ring" id="rn"><svg width="150" height="150"><circle cx="75" cy="75" r="66" fill="none" stroke="#1E3A4B" stroke-width="8"/><circle id="rg" cx="75" cy="75" r="66" fill="none" stroke="#00F2FE" stroke-width="8" stroke-linecap="round" stroke-dasharray="415"/></svg><b class="tm">00</b></div>';
const RES={benar:['ok','JAWABAN BENAR'],salah:['er','JAWABAN SALAH'],lempar:['gd','DILEMPAR — REBUTAN ULANG'],gugur:['gd','SOAL GUGUR']};

function pick(){return hdr('Pilih mode perangkat')+`<div class="wrap grid" style="max-width:720px"><h2>Masuk sebagai</h2>
<button class="card br" data-act="pm:ifp" style="min-height:90px;text-align:left"><h3>Layar IFP</h3><span class="mut" style="text-transform:none">Panggung utama + buzzer sentuh (tanpa login)</span></button>
<button class="card" data-act="pm:pantau" style="min-height:90px;text-align:left"><h3>Pantau Skor</h3><span class="mut" style="text-transform:none">Live scoreboard read-only (tanpa login)</span></button>
<button class="card" data-act="pm:mod" style="min-height:90px;text-align:left"><h3>Panel Moderator</h3><span class="mut" style="text-transform:none">Butuh PIN Moderator</span></button>
<button class="card gold" data-act="pm:adm" style="min-height:90px;text-align:left"><h3>Dashboard Admin</h3><span class="mut" style="text-transform:none">Butuh PIN Admin</span></button></div>`}
function loginV(){return hdr('Akses panitia')+`<div class="ov"><div class="card act"><h2>${A.want==='adm'?'PIN Admin':'PIN Moderator'}</h2><label for="pin">Masukkan PIN</label><input id="pin" type="password" inputmode="numeric" autocomplete="off" autofocus>
<div class="row" style="margin-top:12px"><button data-act="pm:">Batal</button><button class="ok" data-act="lg">Masuk</button></div></div></div>`}

function lbV(s){return rank(s).map(t=>{const x=t.x||(s.done&&t.st!=='Lolos');return `<div class="lb ${t.r===1?'r1':''} ${x?'xx':''}" data-n="${esc(t.n+' '+t.i).toLowerCase()}" data-r="${t.r}" data-x="${x?1:0}"><div class="rk">${t.r}</div>${t.f?`<img class="av" src="${esc(t.f)}" alt="">`:`<div class="av">${ini(t.n)}</div>`}<div style="flex:1"><h3>${esc(t.n)}</h3><span class="mut">${esc(t.i)}</span></div><span class="tag ${x?'er':'ok'}">${s.done?(x?'GUGUR':'LOLOS'):'SAFE'}</span><div class="big" style="font-size:32px">${t.p}</div><small class="sg">PTS</small></div>`}).join('')}

const pcard=(t,s,i,rd,rk)=>{const c=s.sc[t.id],dl=s.sl==='skor'&&s.pj===t.id&&(s.res==='benar'||s.res==='salah')?`<span class="tag ${s.res==='benar'?'ok':'er'} dl">${s.res==='benar'?'+'+s.q.bobot:'−'+s.salah}</span>`:'';return `<div class="pc ${c.x?'out':''} ${s.lock===t.id?'on':''} ${rd?'rdy':''}" ${rd?`data-act="buzz" data-id="${t.id}"`:''} ${i!=null?`style="animation-delay:${i*.45}s"`:''}>${t.f?`<img src="${esc(t.f)}" alt="" loading="lazy">`:`<div class="ph0">${ini(t.n)}</div>`}<span class="tag gd pt">${c.n}</span>${rk?`<span class="tag rkb ${rk===1?'gd':''}">#${rk}</span>`:''}${dl}<div class="nm">${esc(t.n)}<small>${esc(t.i)}</small></div></div>`};
// Layar penuh + cegah layar mati (IFP)
const fsOn=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
const fsOk=()=>true; // selalu tampil; bila ditolak browser akan muncul pesan
async function wake(){try{if(navigator.wakeLock&&!A.wl){A.wl=await navigator.wakeLock.request('screen');A.wl.addEventListener('release',()=>{A.wl=null})}}catch(e){}}
function fsToggle(){try{const d=document,e=d.documentElement,r=fsOn()?(d.exitFullscreen||d.webkitExitFullscreen).call(d):(e.requestFullscreen||e.webkitRequestFullscreen).call(e);Promise.resolve(r).catch(()=>toast('Layar penuh ditolak oleh browser',1))}catch(x){toast('Layar penuh tidak didukung di perangkat ini',1)}wake()}
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,()=>{if(A.mode==='ifp')paint()}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&A.mode==='ifp')wake()});
const startOv=()=>'<div class="ov" style="z-index:90"><div class="card act br"><h2>Mulai Arena</h2><p class="mut" style="margin:8px 0 16px">Ketuk sekali untuk mengaktifkan suara & narator.</p><button class="bz" style="width:100%" data-act="snd">Mulai Arena</button>'+(fsOk()?'<button class="ghost" style="width:100%;margin-top:10px" data-act="sndfs">Mulai Arena + Layar Penuh</button>':'')+'</div></div>';
const exitOv='<div class="ov" style="z-index:70"><div class="card act"><h2>Keluar dari layar IFP</h2><p class="mut" style="margin:6px 0 4px">Konfirmasi dengan PIN moderator atau admin.</p><label for="xpin">PIN</label><input id="xpin" type="password" inputmode="numeric" autocomplete="off"><div class="row" style="margin-top:12px"><button data-act="xc">Batal</button><button class="er" data-act="xk">Keluar</button></div></div></div>';
const wheelOv=W=>`<div class="ov" style="z-index:60"><div style="text-align:center"><h2 style="margin-bottom:12px">Roda giliran menjawab</h2><div class="whl"><canvas id="wc" width="600" height="600"></canvas><i></i></div><h1 id="wn" style="margin-top:16px;visibility:hidden">${esc(W.n)} · ${esc(W.i)}</h1></div></div>`;
const I0=12000,IP=5000,IC=7000;
function iscene(s){return(s.intro&&A.ik===s.intro.k&&A.isc!=null)?A.isc:-9} // scene digerakkan sequencer, bukan jam
function bn(s){return !!(s.rt&&s.res&&Date.now()+A.off-s.rt<(s.res==='lempar'?2200:3000))}
function bgmMode(s){if(s.cover)return 'idle';if(s.wn&&wnOn(s))return 'win';if(s.intro&&iscene(s)>-9)return 'intro';if(s.done)return 'win';const t=s.t;if(t.st==='run'&&t.end&&(t.end-(Date.now()+A.off))/1000<=5)return 'crit';return(s.show&&!s.res)?'tense':'idle'}
const slideOf=s=>s.done?'skor':(s.sl==='skor'&&bn(s)&&s.res!=='lempar')?'soal':(s.sl||'soal');
function introV(s){const sc=iscene(s),N=s.tm.length,ex='<button data-act="xo" style="position:absolute;top:10px;right:10px;z-index:2;opacity:.35;min-height:36px">Keluar</button>'+(fsOk()?'<button data-act="fs" style="position:absolute;top:10px;right:90px;z-index:2;opacity:.35;min-height:36px">⛶</button>':'');
 if(sc===-1)return `<div class="intro">${ex}<div class="t"><span class="tag gd">Hari Santri Nasional</span><h1>HSN ARENA</h1><h2>Sunan Ampel</h2><p class="mut" style="margin-top:14px;font-size:20px">Selamat datang · ${esc(s.nama)}</p></div></div>`;
 if(sc>=N)return `<div class="intro">${ex}<div style="text-align:center;width:100%;position:relative"><h1 class="gdt" style="margin-bottom:18px">Selamat bertanding!</h1><div class="pcs" style="justify-content:center">${s.tm.map((t,i)=>pcard(t,s,i)).join('')}</div></div></div>`;
 const t=s.tm[sc];return `<div class="intro">${ex}<div class="p ${sc%2?'rv':''}"><div class="l"><span class="tag gd">PESERTA ${sc+1} / ${N}</span><h1 class="gdt" style="margin:10px 0">${esc(t.n)}</h1><h2 class="mut">${esc(t.i)}</h2></div><div class="r">${t.f?`<img src="${esc(t.f)}" alt="">`:`<div class="ph0">${ini(t.n)}</div>`}</div></div></div>`}
function bannerV(s){const t=s.tm.find(x=>x.id===(s.res==='lempar'?(s.out||[]).slice(-1)[0]:s.pj)),m={benar:['ok','✓','JAWABAN BENAR','+'+s.q.bobot+' POIN'],salah:['er','✕','JAWABAN SALAH','−'+s.salah+' POIN'],lempar:['gd','↷','DILEMPAR','Rebutan dibuka untuk peserta lain'],gugur:['gd','∅','SOAL GUGUR','Tanpa poin']}[s.res]||['gd','','',''];
 return `<div class="rbn b-${m[0]}"><div class="ic">${m[1]}</div><h1>${m[2]}</h1><h2>${t?esc(t.n)+' · ':''}${m[3]}</h2></div>`}
function introSfx(sc,s){const N=s.tm.length;Snd.whoosh();if(sc===-1)Snd.sting();else if(sc>=N){Snd.ok();Snd.clap()}else Snd.pop(2)}
async function runIntro(s){const tok=A.rt,N=s.tm.length,vo=Object.assign({},VO,s.vo||{}),ok=()=>tok===A.rt;
 const step=async(sc,text,min,gap)=>{if(!ok())return false;A.isc=sc;paint();if(A.audio)introSfx(sc,s);Bgm.hold=Date.now()+900;const t0=Date.now();await sleep(450);if(!ok())return false;await speakP(text,ok,vo);if(!ok())return false;const rest=min-(Date.now()-t0);if(rest>0)await sleep(rest);Bgm.hold=Date.now()+gap+400;await sleep(gap);return ok()};
 if(!await step(-1,fill(vo.open,null,s),8000,1400))return;
 for(let i=0;i<N;i++)if(!await step(i,fill(vo.peserta,i,s),4000,800))return;
 if(!await step(N,fill(vo.tutup,null,s),5500,1800))return;
 A.isc=-9;paint()}
function skorSfx(s){if(AU.sfx('sfx_skor'))return;Snd.whoosh();s.tm.forEach((t,i)=>setTimeout(()=>Snd.pop(i),300+i*450));if(s.done)setTimeout(()=>{Snd.ok();Snd.clap()},500)}
function ifpTick(s){if(A.mode!=='ifp')return;
 const ik=s.intro?s.intro.k:null;if(ik!==A.ik){A.ik=ik;A.rt=(A.rt||0)+1;try{speechSynthesis.cancel()}catch(e){}if(ik&&Date.now()+A.off-ik<8000)runIntro(s);else{A.isc=-9;paint()}}
 const wk=s.wn?s.wn.k:null;if(wk!==A.wk){A.wk=wk;A.rw=(A.rw||0)+1;try{speechSynthesis.cancel()}catch(e){}if(wk&&Date.now()+A.off-wk<8000)runWin(s);else{A.ws=wk?4:-9;paint()}}
 const b=bn(s)?1:0;if(b!==A.bl){A.bl=b;paint()}
 if(A.audio)Bgm.set(bgmMode(s))}
function ifpV(s){const q=s.q,sl=slideOf(s),ch=A.psl!==sl,op=s.show&&!A.pshow,cl=!s.show&&A.pshow&&A.lq&&A.psl==='soal',rs=RES[s.res],sp=s.spin,age=sp?Date.now()+A.off-sp.k:1e9,W=sp&&s.tm.find(t=>t.id===sp.pid),H=s.tm.find(t=>t.id===s.lock)||s.tm.find(t=>t.id===(s.turn||{}).pid);
 const head=hdr('Stage 1 · IFP · '+esc(s.nama),'<span class="tag ok"><i class="dot"></i> TERHUBUNG</span> '+(fsOk()?'<button data-act="fs" style="min-height:40px">'+(fsOn()?'Keluar layar penuh':'⛶ Layar penuh')+'</button> ':'')+'<button data-act="xo" style="min-height:40px">Keluar</button>')+(A.audio?'':startOv())+(A.xo?exitOv:'')+(age<12000&&W?wheelOv(W):'')+(s.intro&&iscene(s)>-9?introV(s):'')+(bn(s)?bannerV(s):'');
 if(s.show)A.lq={text:q.text,img:q.img};if(cl)A.pcl=1;if(s.cover)return head+coverV(s);if(s.wn&&wnOn(s))return head+podiumV(s);if(sl==='skor')return head+`<div class="wrap sl sk ${ch?'in':''}"><div class="row sp" style="margin-bottom:14px"><h1>${s.done?'Klasemen akhir':'Skor sementara'}</h1><span class="tag gd">${s.done?'SELESAI':'SETELAH SOAL '+q.no+' / '+q.tot}</span></div><div class="pcs" style="justify-content:center">${rank(s).map((t,i)=>pcard(t,s,ch?i:null,false,i+1)).join('')}</div></div>`;
 const chips=s.buz?`<div class="row" style="margin-top:14px">${s.tm.filter(t=>!s.sc[t.id].x&&s.out.indexOf(t.id)<0).map(t=>`<button class="chip" data-act="buzz" data-id="${t.id}">${t.f?`<img src="${esc(t.f)}" alt="">`:`<div class="ph0">${ini(t.n)}</div>`}<b class="sg" style="font-size:13px">${esc(t.n)}</b></button>`).join('')}</div>`:'';
 return head+`<div class="wrap grid g2 sl ${ch?'in':''}"><div class="card br act" style="min-height:62vh"><div class="row sp"><span class="tag gd">SOAL ${q.no} / ${q.tot}</span><span class="tag">${esc(q.kat||'')}</span><span class="tag gd">+${q.bobot} POIN</span></div>
 ${(cl?A.lq.img:(s.show?q.img:''))?`<img class="qi" src="${esc(cl?A.lq.img:q.img)}" alt="">`:''}<div class="q ${(cl?A.lq.text:q.text)?'':'ph'} ${op?'qo':''} ${cl?'qc':''}">${(cl?A.lq.text:q.text)?esc(cl?A.lq.text:q.text):'MENUNGGU MODERATOR…'}</div>${s.ans?`<div class="aj">Jawaban: ${esc(s.aj)}</div>`:''}
 <div class="row sp" style="margin-top:10px"><span class="tag ${s.buz?'ok':''}">${s.buz?'REBUTAN TERBUKA — TEKAN NAMAMU!':H?'MENJAWAB: '+esc(H.n):'MENUNGGU GILIRAN'}</span>${rs?`<span class="tag ${rs[0]==='ok'?'ok':rs[0]==='er'?'er':'gd'}">${rs[1]}</span>`:''}</div>${chips}</div>
 <div class="grid"><div class="card">${ring}<p class="sg mut" style="text-align:center;margin-top:8px">SISA WAKTU (DETIK)</p></div>${H&&!s.buz?`<div><p class="sg mut" style="margin-bottom:6px">GILIRAN MENJAWAB</p><div class="pcs">${pcard(H,s,null,false)}</div></div>`:''}</div></div>`}
function wheel(s){const sp=s.spin,c=$('#wc');if(!c||!sp)return;const N=s.tm.length,a=2*Math.PI/N,x=c.getContext('2d'),age=Date.now()+A.off-sp.k,fin='rotate('+(2160-(sp.i+.5)*360/N)+'deg)';
 x.clearRect(0,0,600,600);s.tm.forEach((t,i)=>{x.beginPath();x.moveTo(300,300);x.arc(300,300,296,i*a-Math.PI/2,(i+1)*a-Math.PI/2);x.closePath();x.fillStyle=i%2?'#112B3B':'#0b4a5a';x.fill();x.strokeStyle='#00F2FE';x.stroke();x.save();x.translate(300,300);x.rotate((i+.5)*a-Math.PI/2);x.fillStyle='#F0FDFF';x.font='700 '+(N>20?20:32)+'px Space Grotesk,sans-serif';x.textAlign='right';x.fillText(i+1,282,10);x.restore()});
 const wn=$('#wn');
 if(A.sk!==sp.k){A.sk=sp.k;setTimeout(paint,Math.max(500,12000-age));
  if(age<3000){c.style.transition='none';c.style.transform='rotate(0deg)';c.offsetWidth;c.style.transition='';c.style.transform=fin;if(A.audio&&!AU.sfx('sfx_roda'))for(let i=0;i<24;i++)setTimeout(()=>Snd.tick(),i*i*9);setTimeout(()=>{const e=$('#wn');if(e)e.style.visibility='visible';if(A.audio)Snd.ok()},5300);return}}
 c.style.transition='none';c.style.transform=fin;if(wn&&age>5300)wn.style.visibility='visible'}
function pantauV(s){return hdr('Live scoreboard · read-only','<button data-act="xp" style="min-height:40px">Ganti mode</button>')+`<div class="wrap"><div class="card" style="margin-bottom:12px"><div class="row sp"><h2>${esc(s.nama)}</h2><span class="tag gd">${s.done?'SELESAI':'SOAL '+s.q.no+' / '+s.q.tot}</span><span class="tag ok"><i class="dot"></i> LIVE</span></div></div>
 <div class="row" style="margin-bottom:12px"><input id="fq" placeholder="Cari regu atau pesantren…" aria-label="Cari"><select id="ff" aria-label="Filter"><option value="">Semua regu</option><option value="top">Peringkat teratas</option><option value="safe">Status aman</option><option value="out">Gugur</option></select></div>${lbV(s)}</div>`}
function flt(){const q=($('#fq')||{}).value,f=($('#ff')||{}).value;document.querySelectorAll('.lb[data-n]').forEach(e=>{e.hidden=!!((q&&e.dataset.n.indexOf(q.toLowerCase())<0)||(f==='top'&&+e.dataset.r>2)||(f==='safe'&&e.dataset.x==='1')||(f==='out'&&e.dataset.x!=='1'))})}

function arena(s){const q=s.q,L=s.lock&&s.tm.find(t=>t.id===s.lock),can=L&&!s.res;
 return `<div class="wrap grid g2"><div class="grid"><div class="card br"><div class="row sp"><span class="tag gd">${esc(s.nama)}</span><span class="tag">SOAL ${q.no}/${q.tot}</span><span class="tag gd">+${q.bobot} / −${s.salah}</span></div>
 ${q.img?`<img class="qi" src="${esc(q.img)}" alt="">`:''}<div class="q" style="font-size:20px;padding:14px">${esc(q.text)}</div><div class="card gold" style="padding:10px"><label style="margin:0">Kunci jawaban · hanya moderator</label><b>${esc(A.v.kunci)}</b></div>
 <div class="row" style="margin-top:10px"><button class="ok" data-act="show">Tampilkan ke IFP</button><button data-act="read">Bacakan soal</button></div>
 <div class="row" style="margin-top:8px"><button class="gd" data-act="spin" ${s.turn&&s.turn.left>0?'disabled':''}>Putar roda</button><button data-act="ans">Tampilkan jawaban di IFP</button><button data-act="rc">${(s.sl||'soal')==='skor'?'Kembali ke slide soal':'Tampilkan slide skor'}</button></div><div class="row" style="margin-top:8px"><button class="gd" data-act="intro">Mulai pembukaan</button><button data-act="introx">Lewati</button><button data-act="bgm">BGM ${s.bgm===false?'OFF':'ON'}</button><button data-act="mute">Suara ${s.mute?'MUTE':'ON'}</button></div><div class="row" style="margin-top:8px"><button data-act="cov">Sampul ${s.cover?'ON':'OFF'}</button><button class="gd" data-act="win">Penobatan juara</button><button data-act="winx">Tutup penobatan</button></div>${s.turn?`<p class="mut" style="margin-top:8px">Giliran: <b>${esc((s.tm.find(t=>t.id===s.turn.pid)||{}).n)}</b> · sisa ${s.turn.left} soal</p>`:''}</div>
 <div class="card"><div class="row sp"><h3>Jam & buzzer</h3><span class="tm big" style="font-size:44px">00</span></div><div class="row"><button data-act="tm:start">Mulai</button><button data-act="tm:pause">Pause</button><button data-act="tm:reset">Reset</button></div>
 <div class="row" style="margin-top:8px"><button class="bz" data-act="open" ${s.buz?'disabled':''}>Buka buzzer & mulai rebutan</button><button data-act="close">Kunci semua</button></div>
 <p style="margin-top:10px">${L?'<span class="tag gd">TERKUNCI</span> <b>'+esc(L.n)+'</b>'+(s.bt?' · '+s.bt.ms.toFixed(2)+'s':''):s.buz?'<span class="tag ok">BUZZER TERBUKA</span>':'<span class="tag">BUZZER TERTUTUP</span>'}</p></div></div>
 <div class="grid"><div class="card act"><h3 style="margin-bottom:8px">Keputusan dewan juri</h3><div class="row"><button class="ok" data-act="j:benar" ${can?'':'disabled'}>Benar +${q.bobot}</button><button class="er" data-act="j:salah" ${can?'':'disabled'}>Salah −${s.salah}</button></div>
 <div class="row" style="margin-top:8px"><button data-act="j:lempar" ${can?'':'disabled'}>Lempar</button><button data-act="j:gugur">Soal gugur / waktu habis</button></div></div>
 <div class="card"><h3 style="margin-bottom:6px">Koreksi manual darurat</h3><select id="mp" aria-label="Regu">${s.tm.map(t=>`<option value="${t.id}">${esc(t.n)} (${s.sc[t.id].n})</option>`).join('')}</select><input id="why" placeholder="Alasan (mis. interupsi juri sah)" style="margin:8px 0" aria-label="Alasan">
 <div class="row">${[-10,-5,5,10].map(x=>`<button data-act="m:${x}">${x>0?'+':''}${x}</button>`).join('')}</div><button class="er" style="margin-top:8px;width:100%" data-act="el">Gugurkan / pulihkan peserta</button></div>
 <button class="gd bz" data-act="nx" ${s.done?'disabled':''}>${q.no>=q.tot?'Tutup pertandingan':'Soal berikutnya ›'}</button><div class="card">${lbV(s)}</div></div></div>`}

function admV(){const D=A.adm;if(!D){loadAdm();return '<div class="wrap"><div class="card">Memuat data admin…</div></div>'}
 const t=A.at,tabs=['Soal','Peserta','Pertandingan','Audio'].map(n=>`<button class="${n===t?'ok':''}" data-act="at:${n}">${n}</button>`).join('');let b;const fb=(l,i)=>`<label class="tag" style="cursor:pointer;margin:0">${l}${i}</label>`;
 if(t==='Audio')b=audV();else if(t==='Pertandingan'){const pk=[...new Set(D.Soal.rows.map(r=>r[2]))];
  b=`<div class="scr"><table><tr><th>ID</th><th>Sesi</th><th>Status</th></tr>${D.Pertandingan.rows.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[5])}</td></tr>`).join('')}</table></div>
  <h3 style="margin-top:12px">Pertandingan baru</h3><label for="mn">Nama sesi</label><input id="mn" value="Penyisihan"><label for="mk">Paket soal</label><select id="mk">${pk.map(p=>`<option>${esc(p)}</option>`).join('')}</select>
  <div class="row"><div><label for="mt">Soal per giliran</label><input id="mt" type="number" min="1" value="2"></div><div><label for="ml">Jumlah lolos</label><input id="ml" type="number" min="1" value="8"></div></div><label>Peserta</label>
  ${D.Peserta.rows.map(r=>`<label style="display:flex;gap:8px;align-items:center;font-size:13px;letter-spacing:0"><input class="pk" type="checkbox" value="${esc(r[0])}" checked style="width:20px;min-height:20px"> ${esc(r[1])} — ${esc(r[2])}</label>`).join('')}<button class="gd" style="margin-top:12px" data-act="nm">Buat pertandingan & aktifkan</button>`}
 else{const d=D[t],P=t==='Peserta',ix=P?[0,1,2,4]:[0,1,2,3],lb=c=>({Instansi:'Kelas',ID_Foto_Drive:'Foto'}[c]||c),show=c=>!P||/^(ID_Peserta|Nama_Lengkap|Instansi)$/.test(c);
  const tb=`<div class="row" style="margin-bottom:12px"><a class="tag" href="Template_HSN.xlsx" download>Unduh template Excel</a>${fb('Import '+t+' (Excel)',`<input type="file" accept=".xlsx,.xls,.csv" hidden data-imp="${t}">`)}${P?fb('Upload foto (banyak; nama file = nama peserta)','<input type="file" id="fp" accept="image/*" multiple hidden>'):''}</div>`;
  b=tb+`<div class="scr"><table><tr>${ix.map(k=>`<th>${lb(d.cols[k])}</th>`).join('')}<th></th></tr>${d.rows.map((r,i)=>`<tr>${ix.map(k=>`<td>${esc(P&&k===4?(r[4]?'✓':'–'):String(r[k]).slice(0,60))}</td>`).join('')}<td style="white-space:nowrap"><button data-act="ed:${i}">Ubah</button> <button class="er" data-act="dl:${esc(r[0])}">Hapus</button></td></tr>`).join('')}</table></div>
  <h3 style="margin-top:12px">${A.ef?'Ubah':'Tambah'} ${t}</h3><form id="af" onsubmit="return false">${d.cols.filter(show).map(c=>`<label>${lb(c)}</label><input name="${c}" value="${esc(A.ef?A.ef[c]:'')}" ${c.indexOf('ID_')===0?'placeholder="otomatis jika kosong"':''}>`).join('')}</form><button class="ok" style="margin-top:12px" data-act="sv">Simpan</button>`}
 return `<div class="wrap"><div class="card"><div class="row" style="margin-bottom:12px">${tabs}</div>${b}</div></div>`}
function loadAdm(){if(A.ld)return;A.ld=1;call('admData').then(r=>{A.ld=0;if(r.success){A.adm=r.data;A.au=r.au||{};A.vo=r.vo||{};paint()}else toast(r.message,1)})}

function staffV(s){const adm=A.role==='adm',n=[['arena','Arena'],['skor','Skor']].concat(adm?[['admin','Admin']]:[]).map(x=>`<button class="${A.tab===x[0]?'on':''}" data-act="tab:${x[0]}">${x[1]}</button>`).join('')+'<button data-act="out">Keluar</button>';
 return hdr('Panel '+(adm?'admin':'moderator'),`<nav class="nav">${n}</nav>`)+(A.tab==='skor'?skorV(s):A.tab==='admin'&&adm?admV():arena(s))}

function paint(){const a=$('#app');
 if(!A.mode){a.innerHTML=pick();return}if(A.mode==='login'){a.innerHTML=loginV();setTimeout(()=>{const p=$('#pin');p&&p.focus()},50);return}
 if(!A.v){a.innerHTML=`<div class="boot">${A.err?'GAGAL MEMUAT <button class="ok" data-act="rt">Coba lagi</button>':'<span class="dot"></span> MEMUAT ARENA…'}</div>`;return}
 const ae=document.activeElement;if(ae&&/INPUT|SELECT|TEXTAREA/.test(ae.tagName)&&a.contains(ae)){A.dirty=1;return}
 const s=A.v.s;a.innerHTML=A.mode==='ifp'?ifpWrap(s):A.mode==='pantau'?pantauV(s):staffV(s);flt();tick();if(A.mode==='ifp'){const ns=slideOf(s);if(A.audio&&A.psl&&A.psl!==ns){if(ns==='skor')skorSfx(s);else Snd.whoosh()}A.psl=ns;A.pshow=!!s.show;if(A.pcl){A.pcl=0;setTimeout(paint,800)}wheel(s)}}

function events(p,s){ // efek suara & narator di layar IFP saja
 if(A.mode==='ifp'&&A.audio&&p){
  if(p.buz&&!s.buz&&s.lock&&s.lock!==p.lock&&s.lock!==A.sb)Snd.buzz();
  const k=s.q.no+s.res+(s.pj||'');if(s.res&&k!==A.pk){if(s.res==='benar'){if(!AU.sfx('sfx_benar')){Snd.ok();Snd.clap()}}else if(s.res==='salah'||s.res==='gugur')Snd.bad();else Snd.whoosh()}
  if(!p.show&&s.show)Snd.whoosh();if(!p.ans&&s.ans)Snd.reveal();if(p.q.no!==s.q.no)Snd.chime();
  if(s.read!==p.read&&s.q.text)speak(s.q.text)}
 A.pk=s.q.no+s.res+(s.pj||'');A.sb=null}
function setV(r){const p=A.v&&A.v.s;A.v={v:r.v,now:r.now,s:r.s,kunci:r.kunci,cat:r.cat};A.ver=r.v;A.off=r.now-Date.now();if(A.mode!=='staff'&&A.mode!=='login')LS.s('view',JSON.stringify(A.v));if(A.mode==='ifp')AU.load(r.s.au||{});events(p,r.s);paint()}

// ── Polling hemat: berhenti saat tab tersembunyi, adaptif ──
async function poll(){clearTimeout(A.pt);if(!document.hidden&&!A.pb&&A.v&&(A.mode==='ifp'||A.mode==='pantau'||A.mode==='staff')){A.pb=1;const r=await call('poll',{ver:A.ver});A.pb=0;
  if(r.success){A.err=0;A.off=r.now-Date.now();if(!r.same)setV(r)}else if(r.code!=='AUTH')A.err++}
 const s=A.v&&A.v.s;A.pt=setTimeout(poll,A.err?4000:(s&&(s.buz||s.t.st==='run'))?1000:2000)}
async function start(){if(A.mode==='ifp'||A.mode==='pantau'){try{const c=JSON.parse(LS.g('view')||'null');if(c){A.v=c;paint()}}catch(e){}}
 paint();const r=await call('boot');if(!r.success){A.err=1;if(!A.v)A.v=null;paint();return}
 if(A.mode==='staff'&&!r.kunci)return logout();A.err=0;setV(r);poll()}
function logout(){Bgm.stop();try{speechSynthesis.cancel()}catch(e){}['tk','role','mode','view'].forEach(LS.d);A.tk='';A.role='';A.mode=null;A.v=null;A.adm=null;clearTimeout(A.pt);paint()}

// ── Aksi ──
async function doAct(d,b){if(b)b.disabled=true;const r=await call('act',d);if(!r.success){toast(r.message,1);paint();return}setV(r)}
async function buzz(id){const s=A.v&&A.v.s;if(A.bz||!s||!s.buz)return;A.bz=1;Snd.buzz();A.sb=id;s.buz=false;s.lock=id;paint(); // optimistik: IFP langsung merespons
 const r=await call('buzz',{pid:id,tc:Date.now()+A.off});A.bz=0;if(r.success){if(!r.used)toast('Buzzer sudah dikunci regu lain',1);setV(r)}else{toast(r.message,1);poll()}}
async function save(){const o={};new FormData($('#af')).forEach((v,k)=>o[k]=v);const r=await call('save',{sheet:A.at,obj:o});if(!r.success)return toast(r.message,1);toast('Tersimpan');A.adm=null;A.ef=null;paint()}
document.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-act="buzz"]');if(b){e.preventDefault();buzz(b.dataset.id)}});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b||b.dataset.act==='buzz')return;const p=b.dataset.act.split(':'),k=p[0],x=p.slice(1).join(':');
 if(k==='snd'||k==='sndfs'){if(k==='sndfs'&&!fsOn())fsToggle();else wake();Snd.on();if(A.v){AU.load(A.v.s.au||{});Bgm.set(bgmMode(A.v.s))}paint()}else if(k==='fs')fsToggle();
 else if(k==='pm'){if(x==='ifp'||x==='pantau'){A.mode=x;LS.s('mode',x);start()}else if(x){A.want=x;A.mode='login';paint()}else{A.mode=null;paint()}}
 else if(k==='lg'){const pin=$('#pin').value;b.disabled=true;const r=await call('login',{pin:pin,role:A.want});b.disabled=false;if(!r.success)return toast(r.message,1);A.tk=r.token;A.role=r.role;A.mode='staff';A.tab='arena';LS.s('tk',r.token);LS.s('role',r.role);LS.s('mode','staff');setV(r);poll()}
 else if(k==='out'||k==='xp')logout();else if(k==='xo'){A.xo=1;paint();setTimeout(()=>{const p=$('#xpin');p&&p.focus()},60)}else if(k==='xc'){A.xo=0;paint()}else if(k==='xk'){b.disabled=true;const r=await call('chk',{pin:$('#xpin').value});b.disabled=false;if(!r.success)return toast(r.message,1);A.xo=0;logout()}else if(k==='rt'){A.err=0;start()}
 else if(k==='tab'){A.tab=x;paint()}
 else if(k==='show'||k==='read'||k==='open'||k==='close'||k==='spin'||k==='ans'||k==='rc'||k==='bgm'||k==='mute'||k==='cov')doAct({k:k},b);else if(k==='win'||k==='winx')doAct({k:'win',m:k==='win'?'start':'skip'},b);else if(k==='intro'||k==='introx')doAct({k:'intro',m:k==='intro'?'start':'skip'},b);else if(k==='el')doAct({k:'elim',pid:$('#mp').value},b);
 else if(k==='tm')doAct({k:'timer',m:x},b);else if(k==='j')doAct({k:'judge',r:x},b);else if(k==='nx')doAct({k:'next'},b);
 else if(k==='m')doAct({k:'manual',pid:$('#mp').value,delta:+x,why:$('#why').value},b);
 else if(k==='at'){A.at=x;A.ef=null;paint()}
 else if(k==='ed'){const d=A.adm[A.at];A.ef={};d.cols.forEach((c,i)=>A.ef[c]=d.rows[+x][i]);paint()}
 else if(k==='dl'){if(!confirm('Hapus data ini?'))return;const r=await call('del',{sheet:A.at,id:x});if(!r.success)return toast(r.message,1);A.adm=null;paint()}
 else if(k==='sv')save();else if(k==='vosv')saveVo();else if(k==='vot')testVo();else if(k==='aimg'){const c=(A.au||{})[x];if(c)auBlob(c).then(u=>window.open(u,'_blank'))}else if(k==='setsc'){doAct({k:'setscore',pid:$('#rp').value,val:$('#rv').value,why:$('#rw').value},b).then(()=>{A.lg=null;loadLog()})}else if(k==='lgr'){A.lg=null;loadLog()}else if(k==='und'){const i=x.lastIndexOf(':'),pid=x.slice(0,i),dl=+x.slice(i+1);if(!confirm('Batalkan perubahan skor ini?'))return;doAct({k:'manual',pid:pid,delta:-dl,why:'Batal entri'},b).then(()=>{A.lg=null;loadLog()})}else if(k==='aplay')AU.prev(x);else if(k==='adel'){if(!confirm('Hapus berkas audio ini?'))return;const r=await call('delAudio',{slot:x});if(!r.success)return toast(r.message,1);A.adm=null;paint()}
 else if(k==='nm'){b.disabled=true;const r=await call('newMatch',{nama:$('#mn').value,perTurn:+$('#mt').value,lolos:+$('#ml').value,paket:$('#mk').value,ids:[...document.querySelectorAll('.pk:checked')].map(c=>c.value)});b.disabled=false;if(!r.success)return toast(r.message,1);const bt=await call('boot');if(bt.success)setV(bt);A.tab='arena';A.adm=null;toast('Pertandingan aktif');paint()}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='pin')document.querySelector('[data-act="lg"]').click();if(e.key==='Enter'&&e.target.id==='xpin')document.querySelector('[data-act="xk"]').click()});
document.addEventListener('input',e=>{if(e.target.id==='fq')flt()});document.addEventListener('change',e=>{if(e.target.id==='ff')flt()});
document.addEventListener('focusout',()=>setTimeout(()=>{if(A.dirty&&!/INPUT|SELECT|TEXTAREA/.test((document.activeElement||{}).tagName||'')){A.dirty=0;paint()}},120));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll()});

// ── Admin: pustaka audio ──
const SLOTS=[['bgm_intro','BGM Pembukaan'],['bgm_idle','BGM Tema Utama (sebelum soal)'],['bgm_tense','BGM Soal Berjalan (tegang)'],['bgm_crit','BGM Waktu Kritis (≤5 detik)'],['bgm_win','BGM Kemenangan / Klasemen akhir'],['sfx_buzz','SFX Buzzer ditekan'],['sfx_benar','SFX Jawaban Benar'],['sfx_salah','SFX Jawaban Salah'],['sfx_roda','SFX Roda giliran berputar'],['sfx_skor','SFX Slide skor muncul'],['img_bg','Gambar latar IFP (sampul, pembukaan, layar soal)']];
const voices=()=>{try{return speechSynthesis.getVoices().filter(x=>/^id/i.test(x.lang)).map(x=>x.name)}catch(e){return[]}};
try{speechSynthesis.onvoiceschanged=()=>{if(A.mode==='staff'&&A.tab==='admin'&&A.at==='Audio')paint()}}catch(e){}
function voV(){const v=Object.assign({},VO,A.vo||{});return `<div class="card" style="margin-bottom:12px"><h3>Naskah narator & keseimbangan suara</h3><p class="mut" style="margin:4px 0 8px;text-transform:none">Pakai {nama}, {kelas}, {no}, {total} pada kalimat peserta. Narator membaca kalimat demi kalimat dan layar baru pindah setelah selesai. Musik otomatis turun halus saat narator bicara.</p>
<label for="vo_open">Kalimat pembukaan</label><textarea id="vo_open" rows="3">${esc(v.open)}</textarea><label for="vo_peserta">Kalimat tiap peserta</label><input id="vo_peserta" value="${esc(v.peserta)}"><label for="vo_tutup">Kalimat penutup</label><textarea id="vo_tutup" rows="2">${esc(v.tutup)}</textarea>
<h3 style="margin-top:14px">Penobatan juara (pakai {nama}, {kelas}, {skor})</h3><label for="vo_jopen">Pembuka penobatan</label><textarea id="vo_jopen" rows="2">${esc(v.jopen)}</textarea><label for="vo_j3">Juara 3</label><textarea id="vo_j3" rows="2">${esc(v.j3)}</textarea><label for="vo_j2">Juara 2</label><textarea id="vo_j2" rows="2">${esc(v.j2)}</textarea><label for="vo_j1">Juara 1</label><textarea id="vo_j1" rows="2">${esc(v.j1)}</textarea><label for="vo_jend">Penutup penobatan</label><textarea id="vo_jend" rows="2">${esc(v.jend)}</textarea>
<label for="vo_vn">Suara narator (daftar dari perangkat ini)</label><select id="vo_vn"><option value="">Otomatis (Indonesia)</option>${voices().map(n=>`<option ${n===v.vn?'selected':''}>${esc(n)}</option>`).join('')}</select>
<div class="row"><div><label for="vo_rate">Kecepatan bicara (%)</label><input id="vo_rate" type="number" min="50" max="130" value="${v.rate}"></div><div><label for="vo_vol">Volume narator (%)</label><input id="vo_vol" type="number" min="10" max="100" value="${v.vol}"></div><div><label for="vo_duck">Musik saat narator bicara (% dari volume normal)</label><input id="vo_duck" type="number" min="10" max="100" value="${v.duck}"></div></div>
<div class="row" style="margin-top:10px"><button data-act="vot">▶ Uji narator</button><button class="ok" data-act="vosv">Simpan naskah</button></div></div>`}
function readVo(){const g=i=>$('#vo_'+i).value;return{open:g('open'),peserta:g('peserta'),tutup:g('tutup'),jopen:g('jopen'),j3:g('j3'),j2:g('j2'),j1:g('j1'),jend:g('jend'),vn:g('vn'),rate:+g('rate'),vol:+g('vol'),duck:+g('duck')}}
async function saveVo(){const r=await call('setVoice',readVo());if(!r.success)return toast(r.message,1);toast('Naskah tersimpan');A.adm=null;paint()}
function testVo(){const v=Object.assign({},VO,readVo()),s={tm:[{n:'Ahmad Zaki',i:'8A'}]};try{speechSynthesis.cancel()}catch(e){}setTimeout(()=>speakP(fill(v.open,null,s)+' '+fill(v.peserta,0,s),null,v,true),80)}
function audV(){const U=A.au||{};return voV()+`<p class="mut" style="margin-bottom:10px">Unggah MP3/M4A/WAV (maks 10 MB, disarankan ≤5 MB). Slot kosong memakai suara bawaan. Atur <b>Loop</b> dan <b>Volume</b> per slot. Unggah sebelum pertandingan dimulai, lalu muat ulang layar IFP dan ketuk "Mulai Arena".</p>`+SLOTS.map(x=>{const k=x[0],c=U[k];if(k.indexOf('img_')===0)return imgRow(x,c);return `<div class="lb" style="flex-wrap:wrap"><div style="flex:1 1 220px"><h3>${x[1]}</h3><span class="mut">${c?esc(c.name):'(bawaan)'}</span></div><label class="tag" style="cursor:pointer;margin:0">${c?'Ganti':'Unggah'}<input type="file" accept="audio/*" hidden data-au="${k}"></label>${c?`<label style="margin:0;display:flex;gap:6px;align-items:center;letter-spacing:0"><input type="checkbox" data-aloop="${k}" ${c.loop?'checked':''} style="width:20px;min-height:20px"> Loop</label><input type="range" min="5" max="100" value="${c.vol}" data-avol="${k}" style="width:130px;min-height:30px" aria-label="Volume ${x[1]}"><button data-act="aplay:${k}">▶ Uji</button><button class="er" data-act="adel:${k}">Hapus</button>`:''}</div>`}).join('')}
async function upAudio(slot,f){if(f.size>10*1048576)return toast('Berkas terlalu besar (maks 10 MB)',1);toast('Mengunggah '+f.name+'… jangan tutup halaman');
 const data=slot.indexOf('img_')===0?await shrink(f,1920):await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(f)});
 const r=await call('upAudio',{slot:slot,name:f.name,data:data},180000);if(!r.success)return toast(r.message,1);toast('Audio tersimpan');A.adm=null;paint()}
async function setAu(slot,o){const r=await call('setAudio',Object.assign({slot:slot},o));if(!r.success)toast(r.message,1);else if(A.au&&A.au[slot])Object.assign(A.au[slot],o)}

// ── Foto & import Excel ──
const slug=s=>String(s).toUpperCase().replace(/[^A-Z0-9]+/g,'').slice(0,18);
function shrink(f,mx){return new Promise(r=>{const im=new Image(),u=URL.createObjectURL(f);im.onload=()=>{const k=Math.min(1,(mx||640)/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);r(c.toDataURL('image/jpeg',.82))};im.src=u})}
async function upFotos(files){const P=A.adm.Peserta.rows,miss=[];let ok=0;for(const f of files){const r=P.find(x=>slug(x[1])===slug(f.name.replace(/\.[^.]+$/,'')));if(!r){miss.push(f.name);continue}toast('Mengunggah '+r[1]+'…');const x=await call('upFoto',{pid:r[0],data:await shrink(f)});if(x.success)ok++;else miss.push(f.name)}A.adm=null;paint();toast(ok+' foto terpasang'+(miss.length?' · tidak cocok: '+miss.slice(0,3).join(', '):''),!!miss.length)}
async function impX(f,sh){try{const wb=XLSX.read(await f.arrayBuffer()),rows=XLSX.utils.sheet_to_json(wb.Sheets[sh]||wb.Sheets[wb.SheetNames[0]],{defval:''}),r=await call(sh==='Soal'?'impSoal':'impPeserta',{rows});if(!r.success)return toast(r.message,1);const er=r.errors&&r.errors.length;toast(r.added+' data diimpor'+(r.skipped?', '+r.skipped+' dilewati (nama sudah ada)':'')+(er?' · '+r.errors[0]:''),!!er);A.adm=null;paint()}catch(e){toast('File Excel tidak terbaca',1)}}
document.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.imp&&t.files[0]){impX(t.files[0],t.dataset.imp);t.value=''}else if(t.id==='fp'&&t.files.length){upFotos([...t.files]);t.value=''}else if(t.dataset&&t.dataset.au&&t.files[0]){upAudio(t.dataset.au,t.files[0]);t.value=''}else if(t.dataset&&t.dataset.aloop)setAu(t.dataset.aloop,{loop:t.checked});else if(t.dataset&&t.dataset.avol)setAu(t.dataset.avol,{vol:+t.value})});

// ── Gambar latar, sampul, panggung juara, revisi skor ──
const bgUrl=s=>{const c=(s.au||{}).img_bg;return c?(AU.im['img_bg:'+c.id]||''):''};
const ifpWrap=s=>{const u=bgUrl(s);return '<div class="ifp" style="--bgi:'+(u?"url('"+u+"')":'none')+'">'+ifpV(s)+'</div>'};
const cornerBtns='<button data-act="xo" style="position:absolute;top:10px;right:10px;z-index:3;opacity:.35;min-height:36px">Keluar</button><button data-act="fs" style="position:absolute;top:10px;right:90px;z-index:3;opacity:.35;min-height:36px">⛶</button>';
const coverV=s=>{const u=bgUrl(s);return `<div class="cover" style="${u?`background-image:url('${u}')`:''}">${u?'':`<div class="cv-t"><span class="tag gd">Hari Santri Nasional</span><h1>HSN ARENA</h1><h2 style="color:var(--cy);font-size:clamp(24px,4vw,56px)">Sunan Ampel</h2><p class="mut" style="margin-top:14px;font-size:20px">${esc(s.nama)}</p></div>`}${cornerBtns}</div>`};
const WS={3:1,2:2,1:3};
const wnOn=s=>!!(s.wn&&A.wk===s.wn.k&&A.ws!=null&&A.ws>-9);
function podiumV(s){const R=rank(s).slice(0,3),ws=A.ws,cf=ws>=3?Array.from({length:46},(_,i)=>`<i style="left:${Math.round(Math.random()*100)}%;animation-delay:${(Math.random()*3).toFixed(2)}s;background:${['#FFD700','#00F2FE','#F59E0B','#22C55E','#F0FDFF'][i%5]}"></i>`).join(''):'';
 const col=rk=>{const p=R[rk-1];if(!p)return '';const t=s.tm.find(x=>x.id===p.id);return `<div class="pl r${rk} ${ws>=WS[rk]?'up':'hid'}"><div class="ph">${t&&t.f?`<img src="${esc(t.f)}" alt="">`:`<div class="ph0">${ini(p.n)}</div>`}${rk===1?'<span class="crown">👑</span>':''}</div><h2>${esc(p.n)}</h2><div class="mut">${esc(p.i)}</div><div class="big pts">${p.p}<small> PTS</small></div><div class="pb"><b>${rk}</b></div></div>`};
 return `<div class="stage"><div class="cfl">${cf}</div><div class="spot"></div>${cornerBtns}<h1 class="gdt stt">${ws>=3?'Selamat kepada para juara!':'Penobatan juara'}</h1><div class="pod3">${col(2)}${col(1)}${col(3)}</div></div>`}
async function runWin(s){const tok=A.rw,vo=Object.assign({},VO,s.vo||{}),R=rank(s).slice(0,3),ok=()=>tok===A.rw;
 const fw=(t,p)=>String(t).replace(/\{nama\}/g,p.n).replace(/\{kelas\}/g,p.i).replace(/\{skor\}/g,p.p);
 const step=async(n,text,min)=>{if(!ok())return false;A.ws=n;paint();if(A.audio){if(n===0)Snd.sting();else{Snd.whoosh();Snd.ok();Snd.clap()}}Bgm.hold=Date.now()+900;const t0=Date.now();await sleep(450);if(!ok())return false;await speakP(text,ok,vo);if(!ok())return false;const r=min-(Date.now()-t0);if(r>0)await sleep(r);Bgm.hold=Date.now()+1200;await sleep(900);return ok()};
 if(!await step(0,vo.jopen,5000))return;
 for(let rk=Math.min(3,R.length);rk>=1;rk--)if(!await step(WS[rk],fw(vo['j'+rk],R[rk-1]),5500))return;
 await step(4,vo.jend,6000)}
function skorV(s){if(!A.lg&&!A.lgl){A.lgl=1;loadLog()}const nm=id=>(s.tm.find(t=>t.id===id)||{}).n||id;
 return `<div class="wrap grid g2"><div>${lbV(s)}</div><div class="grid"><div class="card act"><h3 style="margin-bottom:6px">Revisi nilai peserta</h3><label for="rp">Peserta</label><select id="rp">${s.tm.map(t=>`<option value="${t.id}">${esc(t.n)} (${s.sc[t.id].n})</option>`).join('')}</select><label for="rv">Nilai yang benar</label><input id="rv" type="number" inputmode="numeric" placeholder="mis. 40"><label for="rw">Alasan</label><input id="rw" placeholder="mis. salah input di soal 3"><button class="gd" style="margin-top:12px;width:100%" data-act="setsc">Simpan nilai baru</button></div>
 <div class="card"><div class="row sp"><h3>Riwayat perubahan skor</h3><button class="f0" data-act="lgr">Muat ulang</button></div>${(A.lg||[]).length?A.lg.map(r=>`<div class="lb" style="padding:8px;flex-wrap:wrap"><div style="flex:1 1 160px"><b>${esc(nm(r.p))}</b><div class="mut" style="font-size:12px">Soal ${esc(r.q)} · ${esc(r.w)}</div></div><span class="tag ${r.d>=0?'ok':'er'}">${r.d>0?'+':''}${r.d}</span><button class="f0" data-act="und:${esc(r.p)}:${r.d}" style="min-height:36px">Batalkan</button></div>`).join(''):'<p class="mut">Belum ada perubahan skor.</p>'}</div></div></div>`}
async function loadLog(){const r=await call('logs');A.lgl=0;if(r.success){A.lg=r.rows;if(A.mode==='staff'&&A.tab==='skor')paint()}}
const imgRow=(x,c)=>`<div class="lb" style="flex-wrap:wrap"><div style="flex:1 1 220px"><h3>${x[1]}</h3><span class="mut">${c?esc(c.name):'(belum ada — latar polos)'}</span></div><label class="tag" style="cursor:pointer;margin:0">${c?'Ganti':'Unggah'}<input type="file" accept="image/*" hidden data-au="${x[0]}"></label>${c?`<button data-act="aimg:${x[0]}">Lihat</button><button class="er" data-act="adel:${x[0]}">Hapus</button>`:''}</div>`;

// ── Jam & timer lokal (tanpa render ulang) ──
function tick(){const s=A.v&&A.v.s;if(!s)return;const t=s.t,l=t.st==='run'?Math.max(0,(t.end-(Date.now()+A.off))/1000):t.left,n=Math.ceil(l);
 document.querySelectorAll('.tm').forEach(e=>e.textContent=String(n).padStart(2,'0'));const g=$('#rg');if(g)g.style.strokeDashoffset=415*(1-(t.dur?Math.min(1,l/t.dur):0));
 const r=$('#rn');if(r)r.classList.toggle('crit',t.st==='run'&&l<=5&&l>0);
 if(A.mode==='ifp'&&A.audio&&t.st==='run'){if(n<=5&&n>0&&n!==A.ln)Snd.tick();if(l<=0&&!A.ed){A.ed=1;Snd.end()}if(l>0)A.ed=0}A.ln=n;ifpTick(s);
 const c=$('#clk');if(c)c.textContent=new Date().toLocaleTimeString('id-ID',{hour12:false,timeZone:'Asia/Jakarta'}).replace(/\./g,':')}
setInterval(tick,250);
if(A.mode==='staff'&&!A.tk)A.mode=null;
if(A.mode&&A.mode!=='login')start();else{A.mode=null;paint()}
