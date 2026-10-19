const $=s=>document.querySelector(s),esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LS={g(k){try{return localStorage.getItem('hsn:'+k)}catch(e){return null}},s(k,v){try{localStorage.setItem('hsn:'+k,v)}catch(e){}},d(k){try{localStorage.removeItem('hsn:'+k)}catch(e){}}};
const A={mode:LS.g('mode'),tk:LS.g('tk')||'',role:LS.g('role')||'',v:null,ver:0,off:0,tab:'arena',adm:null,at:'Soal',ef:null,err:0};
const Perf={r:[],add(a,t,s){this.r.push({a,t,s});if(this.r.length>100)this.r.shift()}}; // Perf.r di console
function toast(m,e){const d=document.createElement('div');d.textContent=m;if(e)d.className='e';$('#toast').appendChild(d);setTimeout(()=>d.remove(),3200)}

// ── Pemanggil server (fetch ke GAS): timeout, retry baca, reqId idempoten untuk tulis ──
function call(a,d){const w=!/^(boot|poll|admData)$/.test(a),id=w?(self.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random()):'';
 const once=async()=>{const c=new AbortController(),tm=setTimeout(()=>c.abort(),w?30000:15000),t0=performance.now();
  try{const rs=await fetch(GAS_URL,{method:'POST',redirect:'follow',cache:'no-store',signal:c.signal,headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({a:a,d:d||{},tk:A.tk,id:id})});
   const r=JSON.parse(await rs.text());Perf.add(a,Math.round(performance.now()-t0),r.ms);return r}
  catch(e){return{success:false,retry:1,message:e.name==='AbortError'?'Server terlalu lama merespons':'Koneksi terputus'}}finally{clearTimeout(tm)}};
 return(async()=>{let r;for(let i=0;i<(w?2:3);i++){if(i)await new Promise(x=>setTimeout(x,900*i));r=await once();if(r.success||!r.retry)break}
  if(!r.success&&r.code==='AUTH')logout();return r})()}

// ── Audio arena (sintesis WebAudio: tanpa berkas, tanpa delay) ──
const Snd={c:null,on(){if(!this.c)this.c=new(window.AudioContext||window.webkitAudioContext)();if(this.c.resume)this.c.resume();A.audio=1},
 t(f,d,ty,v,at){const s=A.v&&A.v.s;if(!this.c||(s&&s.mute))return;const c=this.c,o=c.createOscillator(),g=c.createGain(),t=c.currentTime+(at||0);o.type=ty||'sine';o.frequency.value=f;g.gain.setValueAtTime(v||.15,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+d)},
 buzz(){this.t(880,.25,'square',.2);this.t(660,.3,'square',.2,.12)},ok(){[523,659,784,1046].forEach((f,i)=>this.t(f,.28,'triangle',.18,i*.1))},bad(){this.t(220,.5,'sawtooth',.15);this.t(160,.5,'sawtooth',.15,.2)},tick(){this.t(1200,.05,'square',.08)},end(){this.t(300,.9,'sawtooth',.2)}};
function speak(t){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='id-ID';u.rate=.95;speechSynthesis.speak(u)}catch(e){}}

// ── Data & tampilan ──
const rank=s=>s.tm.map(t=>Object.assign({},t,{p:s.sc[t.id].n,x:s.sc[t.id].x,st:s.sc[t.id].st})).sort((a,b)=>b.p-a.p).map((t,i)=>Object.assign(t,{r:i+1}));
const ini=n=>esc(String(n).replace(/^Regu /,'').slice(0,2).toUpperCase());
const hdr=(sub,nav)=>`<header class="top"><div><h1>HSN Arena <span class="tag gd">Sunan Ampel</span></h1><small>${sub}</small></div>${nav||''}<div class="sg" style="text-align:right"><b id="clk" style="font-size:20px">--:--:--</b><small>WIB · SYNC AKTIF</small></div></header>`;
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

const pcard=(t,s,i,rd)=>{const c=s.sc[t.id];return `<div class="pc ${c.x?'out':''} ${s.lock===t.id?'on':''} ${rd?'rdy':''}" ${rd?`data-act="buzz" data-id="${t.id}"`:''} ${i!=null?`style="animation-delay:${i*.45}s"`:''}>${t.f?`<img src="${esc(t.f)}" alt="" loading="lazy">`:`<div class="ph0">${ini(t.n)}</div>`}<span class="tag gd pt">${c.n}</span><div class="nm">${esc(t.n)}<small>${esc(t.i)}</small></div></div>`};
const recapV=s=>`<div class="rc"><h1 style="text-align:center;margin-bottom:18px">Rekap skor · soal ${s.q.no}</h1><div class="pcs">${rank(s).map((t,i)=>pcard(t,s,i)).join('')}</div></div>`;
const startOv='<div class="ov"><div class="card act br"><h2>Mulai Arena</h2><p class="mut" style="margin:8px 0 16px">Ketuk sekali untuk mengaktifkan suara & narator.</p><button class="bz" style="width:100%" data-act="snd">Mulai Arena</button></div></div>';
function ifpV(s){const q=s.q,L=s.lock&&s.tm.find(t=>t.id===s.lock),rs=RES[s.res],sp=s.spin,age=sp?Date.now()+A.off-sp.k:1e9,W=sp&&s.tm.find(t=>t.id===sp.pid);
 const cards=s.tm.map(t=>pcard(t,s,null,s.buz&&!s.sc[t.id].x&&s.out.indexOf(t.id)<0)).join('');
 return hdr('Stage 1 · IFP · '+esc(s.nama),'<span class="tag ok"><i class="dot"></i> TERHUBUNG</span>')+(A.audio?'':startOv)+
 (age<12000&&W?`<div class="ov" style="z-index:60"><div style="text-align:center"><h2 style="margin-bottom:12px">Roda giliran menjawab</h2><div class="whl"><canvas id="wc" width="600" height="600"></canvas><i></i></div><h1 id="wn" style="margin-top:16px;visibility:hidden">${esc(W.n)} · ${esc(W.i)}</h1></div></div>`:'')+(s.rc?recapV(s):'')+
 `<div class="wrap"><div class="pcs">${cards}</div></div>
 <div class="wrap grid g2"><div class="card br act"><div class="row sp"><span class="tag gd">${s.done?'PERTANDINGAN SELESAI':'SOAL '+q.no+' / '+q.tot}</span><span class="tag">${esc(q.kat||'')}</span><span class="tag gd">+${q.bobot} POIN</span>${s.turn?`<span class="tag ok">GILIRAN: ${esc((s.tm.find(t=>t.id===s.turn.pid)||{}).n)}</span>`:''}</div>
 ${s.done?'<div class="q ph">KLASEMEN AKHIR</div>'+lbV(s):`${s.show&&q.img?`<img class="qi" src="${esc(q.img)}" alt="">`:''}<div class="q ${q.text?'':'ph'}">${q.text?esc(q.text):'MENUNGGU MODERATOR…'}</div>${s.ans?`<div class="aj">Jawaban: ${esc(s.aj)}</div>`:''}<div class="row sp" style="margin-top:10px"><span class="tag ${s.buz?'ok':''}">${s.buz?'REBUTAN TERBUKA — TEKAN KARTU PESERTA!':L?'MENJAWAB: '+esc(L.n):'MENUNGGU GILIRAN'}</span>${rs?`<span class="tag ${rs[0]==='ok'?'ok':rs[0]==='er'?'er':'gd'}">${rs[1]}</span>`:''}</div>`}</div>
 <div class="card">${ring}<p class="sg mut" style="text-align:center;margin-top:8px">SISA WAKTU (DETIK)</p></div></div>`}
function wheel(s){const sp=s.spin,c=$('#wc');if(!c||!sp)return;const N=s.tm.length,a=2*Math.PI/N,x=c.getContext('2d'),age=Date.now()+A.off-sp.k,fin='rotate('+(2160-(sp.i+.5)*360/N)+'deg)';
 x.clearRect(0,0,600,600);s.tm.forEach((t,i)=>{x.beginPath();x.moveTo(300,300);x.arc(300,300,296,i*a-Math.PI/2,(i+1)*a-Math.PI/2);x.closePath();x.fillStyle=i%2?'#112B3B':'#0b4a5a';x.fill();x.strokeStyle='#00F2FE';x.stroke();x.save();x.translate(300,300);x.rotate((i+.5)*a-Math.PI/2);x.fillStyle='#F0FDFF';x.font='700 '+(N>20?20:32)+'px Space Grotesk,sans-serif';x.textAlign='right';x.fillText(i+1,282,10);x.restore()});
 const wn=$('#wn');
 if(A.sk!==sp.k){A.sk=sp.k;setTimeout(paint,Math.max(500,12000-age));
  if(age<3000){c.style.transition='none';c.style.transform='rotate(0deg)';c.offsetWidth;c.style.transition='';c.style.transform=fin;if(A.audio)for(let i=0;i<24;i++)setTimeout(()=>Snd.tick(),i*i*9);setTimeout(()=>{const e=$('#wn');if(e)e.style.visibility='visible'},5300);return}}
 c.style.transition='none';c.style.transform=fin;if(wn&&age>5300)wn.style.visibility='visible'}
function pantauV(s){return hdr('Live scoreboard · read-only')+`<div class="wrap"><div class="card" style="margin-bottom:12px"><div class="row sp"><h2>${esc(s.nama)}</h2><span class="tag gd">${s.done?'SELESAI':'SOAL '+s.q.no+' / '+s.q.tot}</span><span class="tag ok"><i class="dot"></i> LIVE</span></div></div>
 <div class="row" style="margin-bottom:12px"><input id="fq" placeholder="Cari regu atau pesantren…" aria-label="Cari"><select id="ff" aria-label="Filter"><option value="">Semua regu</option><option value="top">Peringkat teratas</option><option value="safe">Status aman</option><option value="out">Gugur</option></select></div>${lbV(s)}</div>`}
function flt(){const q=($('#fq')||{}).value,f=($('#ff')||{}).value;document.querySelectorAll('.lb[data-n]').forEach(e=>{e.hidden=!!((q&&e.dataset.n.indexOf(q.toLowerCase())<0)||(f==='top'&&+e.dataset.r>2)||(f==='safe'&&e.dataset.x==='1')||(f==='out'&&e.dataset.x!=='1'))})}

function arena(s){const q=s.q,L=s.lock&&s.tm.find(t=>t.id===s.lock),can=L&&!s.res;
 return `<div class="wrap grid g2"><div class="grid"><div class="card br"><div class="row sp"><span class="tag gd">${esc(s.nama)}</span><span class="tag">SOAL ${q.no}/${q.tot}</span><span class="tag gd">+${q.bobot} / −${s.salah}</span></div>
 ${q.img?`<img class="qi" src="${esc(q.img)}" alt="">`:''}<div class="q" style="font-size:20px;padding:14px">${esc(q.text)}</div><div class="card gold" style="padding:10px"><label style="margin:0">Kunci jawaban · hanya moderator</label><b>${esc(A.v.kunci)}</b></div>
 <div class="row" style="margin-top:10px"><button class="ok" data-act="show">Tampilkan ke IFP</button><button data-act="read">Bacakan soal</button></div>
 <div class="row" style="margin-top:8px"><button class="gd" data-act="spin" ${s.turn&&s.turn.left>0?'disabled':''}>Putar roda</button><button data-act="ans">Tampilkan jawaban di IFP</button><button data-act="rc">Rekap skor</button></div>${s.turn?`<p class="mut" style="margin-top:8px">Giliran: <b>${esc((s.tm.find(t=>t.id===s.turn.pid)||{}).n)}</b> · sisa ${s.turn.left} soal</p>`:''}</div>
 <div class="card"><div class="row sp"><h3>Jam & buzzer</h3><span class="tm big" style="font-size:44px">00</span></div><div class="row"><button data-act="tm:start">Mulai</button><button data-act="tm:pause">Pause</button><button data-act="tm:reset">Reset</button></div>
 <div class="row" style="margin-top:8px"><button class="bz" data-act="open" ${s.buz?'disabled':''}>Buka buzzer & mulai rebutan</button><button data-act="close">Kunci semua</button></div>
 <p style="margin-top:10px">${L?'<span class="tag gd">TERKUNCI</span> <b>'+esc(L.n)+'</b>'+(s.bt?' · '+s.bt.ms.toFixed(2)+'s':''):s.buz?'<span class="tag ok">BUZZER TERBUKA</span>':'<span class="tag">BUZZER TERTUTUP</span>'}</p></div></div>
 <div class="grid"><div class="card act"><h3 style="margin-bottom:8px">Keputusan dewan juri</h3><div class="row"><button class="ok" data-act="j:benar" ${can?'':'disabled'}>Benar +${q.bobot}</button><button class="er" data-act="j:salah" ${can?'':'disabled'}>Salah −${s.salah}</button></div>
 <div class="row" style="margin-top:8px"><button data-act="j:lempar" ${can?'':'disabled'}>Lempar</button><button data-act="j:gugur">Soal gugur / waktu habis</button></div></div>
 <div class="card"><h3 style="margin-bottom:6px">Koreksi manual darurat</h3><select id="mp" aria-label="Regu">${s.tm.map(t=>`<option value="${t.id}">${esc(t.n)} (${s.sc[t.id].n})</option>`).join('')}</select><input id="why" placeholder="Alasan (mis. interupsi juri sah)" style="margin:8px 0" aria-label="Alasan">
 <div class="row">${[-10,-5,5,10].map(x=>`<button data-act="m:${x}">${x>0?'+':''}${x}</button>`).join('')}</div><button class="er" style="margin-top:8px;width:100%" data-act="el">Gugurkan / pulihkan peserta</button></div>
 <button class="gd bz" data-act="nx" ${s.done?'disabled':''}>${q.no>=q.tot?'Tutup pertandingan':'Soal berikutnya ›'}</button><div class="card">${lbV(s)}</div></div></div>`}

function admV(){const D=A.adm;if(!D){loadAdm();return '<div class="wrap"><div class="card">Memuat data admin…</div></div>'}
 const t=A.at,tabs=['Soal','Peserta','Pertandingan'].map(n=>`<button class="${n===t?'ok':''}" data-act="at:${n}">${n}</button>`).join('');let b;const fb=(l,i)=>`<label class="tag" style="cursor:pointer;margin:0">${l}${i}</label>`;
 if(t==='Pertandingan'){const pk=[...new Set(D.Soal.rows.map(r=>r[2]))];
  b=`<div class="scr"><table><tr><th>ID</th><th>Sesi</th><th>Status</th></tr>${D.Pertandingan.rows.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[5])}</td></tr>`).join('')}</table></div>
  <h3 style="margin-top:12px">Pertandingan baru</h3><label for="mn">Nama sesi</label><input id="mn" value="Penyisihan"><label for="mk">Paket soal</label><select id="mk">${pk.map(p=>`<option>${esc(p)}</option>`).join('')}</select>
  <div class="row"><div><label for="mt">Soal per giliran</label><input id="mt" type="number" min="1" value="2"></div><div><label for="ml">Jumlah lolos</label><input id="ml" type="number" min="1" value="8"></div></div><label>Peserta</label>
  ${D.Peserta.rows.map(r=>`<label style="display:flex;gap:8px;align-items:center;font-size:13px;letter-spacing:0"><input class="pk" type="checkbox" value="${esc(r[0])}" checked style="width:20px;min-height:20px"> ${esc(r[1])} — ${esc(r[2])}</label>`).join('')}<button class="gd" style="margin-top:12px" data-act="nm">Buat pertandingan & aktifkan</button>`}
 else{const d=D[t],P=t==='Peserta',ix=P?[0,1,2,4]:[0,1,2,3],lb=c=>({Instansi:'Kelas',ID_Foto_Drive:'Foto'}[c]||c),show=c=>!P||/^(ID_Peserta|Nama_Lengkap|Instansi)$/.test(c);
  const tb=`<div class="row" style="margin-bottom:12px"><a class="tag" href="Template_HSN.xlsx" download>Unduh template Excel</a>${fb('Import '+t+' (Excel)',`<input type="file" accept=".xlsx,.xls,.csv" hidden data-imp="${t}">`)}${P?fb('Upload foto (banyak; nama file = nama peserta)','<input type="file" id="fp" accept="image/*" multiple hidden>'):''}</div>`;
  b=tb+`<div class="scr"><table><tr>${ix.map(k=>`<th>${lb(d.cols[k])}</th>`).join('')}<th></th></tr>${d.rows.map((r,i)=>`<tr>${ix.map(k=>`<td>${esc(P&&k===4?(r[4]?'✓':'–'):String(r[k]).slice(0,60))}</td>`).join('')}<td style="white-space:nowrap"><button data-act="ed:${i}">Ubah</button> <button class="er" data-act="dl:${esc(r[0])}">Hapus</button></td></tr>`).join('')}</table></div>
  <h3 style="margin-top:12px">${A.ef?'Ubah':'Tambah'} ${t}</h3><form id="af" onsubmit="return false">${d.cols.filter(show).map(c=>`<label>${lb(c)}</label><input name="${c}" value="${esc(A.ef?A.ef[c]:'')}" ${c.indexOf('ID_')===0?'placeholder="otomatis jika kosong"':''}>`).join('')}</form><button class="ok" style="margin-top:12px" data-act="sv">Simpan</button>`}
 return `<div class="wrap"><div class="card"><div class="row" style="margin-bottom:12px">${tabs}</div>${b}</div></div>`}
function loadAdm(){if(A.ld)return;A.ld=1;call('admData').then(r=>{A.ld=0;if(r.success){A.adm=r.data;paint()}else toast(r.message,1)})}

function staffV(s){const adm=A.role==='adm',n=[['arena','Arena'],['skor','Skor']].concat(adm?[['admin','Admin']]:[]).map(x=>`<button class="${A.tab===x[0]?'on':''}" data-act="tab:${x[0]}">${x[1]}</button>`).join('')+'<button data-act="out">Keluar</button>';
 return hdr('Panel '+(adm?'admin':'moderator'),`<nav class="nav">${n}</nav>`)+(A.tab==='skor'?'<div class="wrap">'+lbV(s)+'</div>':A.tab==='admin'&&adm?admV():arena(s))}

function paint(){const a=$('#app');
 if(!A.mode){a.innerHTML=pick();return}if(A.mode==='login'){a.innerHTML=loginV();setTimeout(()=>{const p=$('#pin');p&&p.focus()},50);return}
 if(!A.v){a.innerHTML=`<div class="boot">${A.err?'GAGAL MEMUAT <button class="ok" data-act="rt">Coba lagi</button>':'<span class="dot"></span> MEMUAT ARENA…'}</div>`;return}
 const ae=document.activeElement;if(ae&&/INPUT|SELECT|TEXTAREA/.test(ae.tagName)&&a.contains(ae)){A.dirty=1;return}
 const s=A.v.s;a.innerHTML=A.mode==='ifp'?ifpV(s):A.mode==='pantau'?pantauV(s):staffV(s);flt();tick();if(A.mode==='ifp')wheel(s)}

function events(p,s){ // suara & narator di layar IFP saja
 if(A.mode==='ifp'&&A.audio&&p){if(s.lock&&s.lock!==p.lock&&s.lock!==A.sb&&(!s.spin||s.spin.k===(p.spin||{}).k))Snd.buzz();const k=s.q.no+s.res+(s.pj||'');if(s.res&&k!==A.pk){if(s.res==='benar')Snd.ok();else if(s.res==='salah'||s.res==='gugur')Snd.bad()}
  if(s.read!==p.read&&s.q.text)speak(s.q.text)}
 A.pk=s.q.no+s.res+(s.pj||'');A.sb=null}
function setV(r){const p=A.v&&A.v.s;A.v={v:r.v,now:r.now,s:r.s,kunci:r.kunci,cat:r.cat};A.ver=r.v;A.off=r.now-Date.now();if(A.mode!=='staff'&&A.mode!=='login')LS.s('view',JSON.stringify(A.v));events(p,r.s);paint()}

// ── Polling hemat: berhenti saat tab tersembunyi, adaptif ──
async function poll(){clearTimeout(A.pt);if(!document.hidden&&!A.pb&&A.v&&(A.mode==='ifp'||A.mode==='pantau'||A.mode==='staff')){A.pb=1;const r=await call('poll',{ver:A.ver});A.pb=0;
  if(r.success){A.err=0;A.off=r.now-Date.now();if(!r.same)setV(r)}else if(r.code!=='AUTH')A.err++}
 const s=A.v&&A.v.s;A.pt=setTimeout(poll,A.err?4000:(s&&(s.buz||s.t.st==='run'))?1000:2000)}
async function start(){if(A.mode==='ifp'||A.mode==='pantau'){try{const c=JSON.parse(LS.g('view')||'null');if(c){A.v=c;paint()}}catch(e){}}
 paint();const r=await call('boot');if(!r.success){A.err=1;if(!A.v)A.v=null;paint();return}
 if(A.mode==='staff'&&!r.kunci)return logout();A.err=0;setV(r);poll()}
function logout(){['tk','role','mode','view'].forEach(LS.d);A.tk='';A.role='';A.mode=null;A.v=null;A.adm=null;clearTimeout(A.pt);paint()}

// ── Aksi ──
async function doAct(d,b){if(b)b.disabled=true;const r=await call('act',d);if(!r.success){toast(r.message,1);paint();return}setV(r)}
async function buzz(id){const s=A.v&&A.v.s;if(A.bz||!s||!s.buz)return;A.bz=1;Snd.buzz();A.sb=id;s.buz=false;s.lock=id;paint(); // optimistik: IFP langsung merespons
 const r=await call('buzz',{pid:id,tc:Date.now()+A.off});A.bz=0;if(r.success){if(!r.used)toast('Buzzer sudah dikunci regu lain',1);setV(r)}else{toast(r.message,1);poll()}}
async function save(){const o={};new FormData($('#af')).forEach((v,k)=>o[k]=v);const r=await call('save',{sheet:A.at,obj:o});if(!r.success)return toast(r.message,1);toast('Tersimpan');A.adm=null;A.ef=null;paint()}
document.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-act="buzz"]');if(b){e.preventDefault();buzz(b.dataset.id)}});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b||b.dataset.act==='buzz')return;const p=b.dataset.act.split(':'),k=p[0],x=p.slice(1).join(':');
 if(k==='snd'){Snd.on();paint()}
 else if(k==='pm'){if(x==='ifp'||x==='pantau'){A.mode=x;LS.s('mode',x);start()}else if(x){A.want=x;A.mode='login';paint()}else{A.mode=null;paint()}}
 else if(k==='lg'){const pin=$('#pin').value;b.disabled=true;const r=await call('login',{pin:pin,role:A.want});b.disabled=false;if(!r.success)return toast(r.message,1);A.tk=r.token;A.role=r.role;A.mode='staff';A.tab='arena';LS.s('tk',r.token);LS.s('role',r.role);LS.s('mode','staff');setV(r);poll()}
 else if(k==='out')logout();else if(k==='rt'){A.err=0;start()}
 else if(k==='tab'){A.tab=x;paint()}
 else if(k==='show'||k==='read'||k==='open'||k==='close'||k==='spin'||k==='ans'||k==='rc')doAct({k:k},b);else if(k==='el')doAct({k:'elim',pid:$('#mp').value},b);
 else if(k==='tm')doAct({k:'timer',m:x},b);else if(k==='j')doAct({k:'judge',r:x},b);else if(k==='nx')doAct({k:'next'},b);
 else if(k==='m')doAct({k:'manual',pid:$('#mp').value,delta:+x,why:$('#why').value},b);
 else if(k==='at'){A.at=x;A.ef=null;paint()}
 else if(k==='ed'){const d=A.adm[A.at];A.ef={};d.cols.forEach((c,i)=>A.ef[c]=d.rows[+x][i]);paint()}
 else if(k==='dl'){if(!confirm('Hapus data ini?'))return;const r=await call('del',{sheet:A.at,id:x});if(!r.success)return toast(r.message,1);A.adm=null;paint()}
 else if(k==='sv')save();
 else if(k==='nm'){b.disabled=true;const r=await call('newMatch',{nama:$('#mn').value,perTurn:+$('#mt').value,lolos:+$('#ml').value,paket:$('#mk').value,ids:[...document.querySelectorAll('.pk:checked')].map(c=>c.value)});b.disabled=false;if(!r.success)return toast(r.message,1);const bt=await call('boot');if(bt.success)setV(bt);A.tab='arena';A.adm=null;toast('Pertandingan aktif');paint()}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='pin')document.querySelector('[data-act="lg"]').click()});
document.addEventListener('input',e=>{if(e.target.id==='fq')flt()});document.addEventListener('change',e=>{if(e.target.id==='ff')flt()});
document.addEventListener('focusout',()=>setTimeout(()=>{if(A.dirty&&!/INPUT|SELECT|TEXTAREA/.test((document.activeElement||{}).tagName||'')){A.dirty=0;paint()}},120));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll()});

// ── Foto & import Excel ──
const slug=s=>String(s).toUpperCase().replace(/[^A-Z0-9]+/g,'').slice(0,18);
function shrink(f){return new Promise(r=>{const im=new Image(),u=URL.createObjectURL(f);im.onload=()=>{const k=Math.min(1,640/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);r(c.toDataURL('image/jpeg',.82))};im.src=u})}
async function upFotos(files){const P=A.adm.Peserta.rows,miss=[];let ok=0;for(const f of files){const r=P.find(x=>slug(x[1])===slug(f.name.replace(/\.[^.]+$/,'')));if(!r){miss.push(f.name);continue}toast('Mengunggah '+r[1]+'…');const x=await call('upFoto',{pid:r[0],data:await shrink(f)});if(x.success)ok++;else miss.push(f.name)}A.adm=null;paint();toast(ok+' foto terpasang'+(miss.length?' · tidak cocok: '+miss.slice(0,3).join(', '):''),!!miss.length)}
async function impX(f,sh){try{const wb=XLSX.read(await f.arrayBuffer()),rows=XLSX.utils.sheet_to_json(wb.Sheets[sh]||wb.Sheets[wb.SheetNames[0]],{defval:''}),r=await call(sh==='Soal'?'impSoal':'impPeserta',{rows});if(!r.success)return toast(r.message,1);const er=r.errors&&r.errors.length;toast(r.added+' data diimpor'+(r.skipped?', '+r.skipped+' dilewati (nama sudah ada)':'')+(er?' · '+r.errors[0]:''),!!er);A.adm=null;paint()}catch(e){toast('File Excel tidak terbaca',1)}}
document.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.imp&&t.files[0]){impX(t.files[0],t.dataset.imp);t.value=''}else if(t.id==='fp'&&t.files.length){upFotos([...t.files]);t.value=''}});

// ── Jam & timer lokal (tanpa render ulang) ──
function tick(){const s=A.v&&A.v.s;if(!s)return;const t=s.t,l=t.st==='run'?Math.max(0,(t.end-(Date.now()+A.off))/1000):t.left,n=Math.ceil(l);
 document.querySelectorAll('.tm').forEach(e=>e.textContent=String(n).padStart(2,'0'));const g=$('#rg');if(g)g.style.strokeDashoffset=415*(1-(t.dur?Math.min(1,l/t.dur):0));
 const r=$('#rn');if(r)r.classList.toggle('crit',t.st==='run'&&l<=5&&l>0);
 if(A.mode==='ifp'&&A.audio&&t.st==='run'){if(n<=5&&n>0&&n!==A.ln)Snd.tick();if(l<=0&&!A.ed){A.ed=1;Snd.end()}if(l>0)A.ed=0}A.ln=n;
 const c=$('#clk');if(c)c.textContent=new Date().toLocaleTimeString('id-ID',{hour12:false,timeZone:'Asia/Jakarta'}).replace(/\./g,':')}
setInterval(tick,250);
if(A.mode==='staff'&&!A.tk)A.mode=null;
if(A.mode&&A.mode!=='login')start();else{A.mode=null;paint()}
