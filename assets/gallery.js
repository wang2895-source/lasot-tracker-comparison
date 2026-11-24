/* LaSOT comparison site. Adapted from the earlier results site's gallery.js (itself from the archived snapshot):
   same player controls; LaSOT only; sorted by our advantage; per-sequence switch rate. */
'use strict';
const DATA=window.REPORT, en=document.documentElement.lang==='en';
const t=(zh,english)=>en?english:zh;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const models=DATA.models, colors=DATA.colors, rows=DATA.rows;
const label=m=>m==='Ours'?t('我们的方法','Ours'):m;
const auc=(r,m)=>r.metrics[m].success_AUC*100;
const sign=v=>(v>=0?'+':'−')+Math.abs(v).toFixed(2);
let visible=[],selected=null;
const query=new URLSearchParams(location.search);

const SORTS=[['adv',t('我们的优势（比最好的基线高多少）','Our advantage over the best baseline')],
 ['vs_sentry',t('比 SENTRY-D4S 高多少','Ours − SENTRY-D4S')],['vs_dam',t('比 DAM4SAM 高多少','Ours − DAM4SAM')],
 ['switched',t('换路帧占比','Frames switched away from D')],['frames',t('序列长度','Sequence length')],['name',t('序列名','Name')]];
$('sort').innerHTML=SORTS.map(([v,s])=>`<option value="${v}">${esc(s)}</option>`).join('');
$('legend').innerHTML='<span><i style="background:#36c5d0"></i>'+t('真值','Ground truth')+'</span>'+models.map((m,i)=>`<span><i style="background:${colors[i]}"></i>${esc(label(m))}${m==='Ours'?t('（框）',' (box)'):t('（mask）',' (mask)')}</span>`).join('');

function renderTable(){
 const term=$('search').value.toLowerCase().trim(), only=$('only-best').checked, mode=$('sort').value;
 visible=rows.filter(r=>(!term||r.sequence.toLowerCase().includes(term))&&(!only||r.best));
 const by={adv:r=>-r.adv,vs_sentry:r=>-r.vs_sentry,vs_dam:r=>-r.vs_dam,switched:r=>-r.switched,frames:r=>-r.frames,name:r=>r.sequence};
 visible.sort((a,b)=>{const x=by[mode](a),y=by[mode](b);return x<y?-1:x>y?1:0;});
 $('count').textContent=`${visible.length} / ${rows.length} `+t('条序列','sequences')+(DATA.n_video<rows.length?t(`（${DATA.n_video} 条有视频）`,` (${DATA.n_video} with video)`):'');
 $('table-head').innerHTML='<tr><th>'+t('序列（点击播放）','Sequence (click to play)')+'</th><th>'+t('帧数','Frames')+'</th><th>'+t('我们 − 最好的基线','Ours − best baseline')+'</th>'+
  models.map((m,i)=>`<th style="color:${colors[i]}">${esc(label(m))}</th>`).join('')+'<th>'+t('换路帧','Switched')+'</th></tr>';
 $('table-body').innerHTML=visible.map(r=>{
  const best=Math.max(...models.map(m=>auc(r,m)));
  return `<tr class="${selected?.key===r.key?'selected':''}"><td><button class="row-button" data-select="${esc(r.key)}" ${r.video?'':'disabled'}>${esc(r.sequence)}${r.video?'':t('<small>无视频</small>','<small>no video</small>')}</button></td><td>${r.frames.toLocaleString()}</td>`+
   `<td class="${r.best?'adv-pos':'adv-neg'}">${sign(r.adv)}</td>`+
   models.map((m,i)=>{const v=auc(r,m);return `<td style="color:${colors[i]};${Math.abs(v-best)<1e-9?'font-weight:700;text-decoration:underline':''}">${v.toFixed(2)}</td>`;}).join('')+
   `<td>${r.switched.toFixed(1)}%</td></tr>`;}).join('');
 $('empty').hidden=visible.length>0;
}

function showScores(r){
 const keys=['success_AUC','precision_20px','normalized_precision_AUC'];
 $('scores').innerHTML='<table><thead><tr><th>'+t('跟踪器','Tracker')+'</th>'+keys.map(k=>`<th>${DATA.metric_labels[k]}</th>`).join('')+'</tr></thead><tbody>'+
  models.map((m,i)=>`<tr><td style="color:${colors[i]}">${esc(label(m))}</td>`+keys.map(k=>`<td>${(r.metrics[m][k]*100).toFixed(2)}</td>`).join('')+'</tr>').join('')+'</tbody></table>';
 $('seq-note').innerHTML=t(`我们比最好的基线（${esc(r.best_baseline)}）${r.best?'高':'低'} <b>${Math.abs(r.adv).toFixed(2)}</b> 分；比 SENTRY-D4S ${sign(r.vs_sentry)}，比 DAM4SAM ${sign(r.vs_dam)}。仲裁器在 ${r.switched.toFixed(1)}% 的帧上报了 D 以外的分支。`,
  `Ours is <b>${Math.abs(r.adv).toFixed(2)}</b> points ${r.best?'above':'below'} the best baseline (${esc(r.best_baseline)}); ${sign(r.vs_sentry)} vs SENTRY-D4S, ${sign(r.vs_dam)} vs DAM4SAM. The arbiter reported a branch other than D on ${r.switched.toFixed(1)}% of frames.`);
}

function frameDisplay(){if(!selected)return;const f=Math.min(selected.frames,Math.floor($('player').currentTime*15+1e-5)+1);$('frame-label').textContent=t('帧 ','Frame ')+f+' / '+selected.frames;}

function choose(key){
 const r=rows.find(x=>x.key===key);if(!r||!r.video)return;
 selected=r;
 $('selected-title').textContent='LaSOT · '+r.sequence;
 $('selected-meta').textContent=`${r.frames.toLocaleString()} `+t('帧 · 左上角为我们的方法（框），其余为五个基线的原生 mask','frames · top-left is our tracker (box); the rest are the baselines\' native masks')+(r.size_mb?` · ${r.size_mb} MB`:'');
 $('player').pause();$('player').src=r.video;$('player').poster=r.poster;$('player').load();
 $('open-video').href=r.video;$('frame-input').max=r.frames;$('frame-input').value=1;
 $('video-status').textContent=t('点击播放。','Press play.');
 showScores(r);renderTable();frameDisplay();
 try{history.replaceState(null,'',location.pathname+'?key='+encodeURIComponent(r.key));}catch(e){}
 const ll=$('language-link');if(ll)ll.href=(en?'index.html':'index-en.html')+'?key='+encodeURIComponent(r.key);
}

document.addEventListener('click',e=>{const n=e.target.closest('[data-select]');if(n&&!n.disabled)choose(n.dataset.select);});
$('sort').addEventListener('change',renderTable);$('search').addEventListener('input',renderTable);$('only-best').addEventListener('change',renderTable);
const nav=d=>{const vv=visible.filter(r=>r.video);if(!vv.length)return;const i=vv.findIndex(r=>r.key===selected?.key);choose(vv[(i+d+vv.length)%vv.length].key);};
$('next').addEventListener('click',()=>nav(1));$('previous').addEventListener('click',()=>nav(-1));
function step(d){if(selected){$('player').pause();$('player').currentTime=Math.max(0,Math.min((selected.frames-1)/15,$('player').currentTime+d/15));}}
$('frame-back').addEventListener('click',()=>step(-1));$('frame-forward').addEventListener('click',()=>step(1));
$('frame-go').addEventListener('click',()=>{if(selected){$('player').pause();$('player').currentTime=(Math.max(1,Math.min(selected.frames,Number($('frame-input').value)||1))-1)/15;}});
$('speed').addEventListener('change',()=>{$('player').playbackRate=Number($('speed').value);});
$('fullscreen').addEventListener('click',()=>{$('player').requestFullscreen?.().catch(()=>{});});
$('player').addEventListener('timeupdate',frameDisplay);
$('player').addEventListener('loadedmetadata',()=>{$('player').playbackRate=Number($('speed').value);$('video-status').textContent=t('视频已载入。15 FPS 是观看帧率，不是跟踪器的推理速度。','Video loaded. 15 FPS is the viewing rate, not the tracker\'s inference speed.');frameDisplay();});
$('player').addEventListener('error',()=>{$('video-status').textContent=t('播放器无法载入此文件，请尝试“单独打开视频”。','The player could not load this file; try “Open video file”.');});
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(e.key==='ArrowRight'){e.preventDefault();step(1);}if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}});
renderTable();
const first=rows.find(r=>r.key===query.get('key')&&r.video)||visible.find(r=>r.video);if(first)choose(first.key);
