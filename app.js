
const TYPES=[
  ['short','━','Respuesta corta'],['paragraph','☰','Párrafo'],['sep'],
  ['multiple','◉','Opción múltiple'],['checkbox','☑','Casillas de verificación'],['dropdown','⌄','Lista desplegable'],['sep'],
  ['file','☁','Carga de archivos'],['sep'],
  ['scale','•••','Escala lineal'],['rating','☆','Calificación'],['grid','⠿','Cuadrícula de opción múltiple'],['checkgrid','▦','Cuadrícula de casillas de verificación'],['sep'],
  ['date','▣','Fecha'],['time','◷','Hora']
];

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const uid=()=>"q_"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

let state={
  len:'short',
  active:0,
  survey:{
    title:'Formulario sin título',
    desc:'',
    banner:'',
    questions:[mk('Pregunta sin título','multiple',false,['Opción 1'])],
    settings:{quiz:false,email:false,edit:false,limit:false,progress:true,shuffle:false,confirm:'Tu respuesta ha sido registrada. Gracias.',defreq:false,voice:'conversation'}
  },
  responses:[],
  run:null,
  builderVoice:null
};

function mk(title,type='multiple',required=false,options=[]){
  return{id:uid(),title,type,required,options,scaleMin:1,scaleMax:5,rows:['Fila 1'],columns:['Columna 1']}
}
function save(){
  localStorage.setItem('ecv4_survey',JSON.stringify(state.survey));
  localStorage.setItem('ecv4_responses',JSON.stringify(state.responses))
}
try{
  const s=JSON.parse(localStorage.getItem('ecv4_survey')||'null');
  if(s)state.survey={...state.survey,...s,settings:{...state.survey.settings,...(s.settings||{})}};
  state.responses=JSON.parse(localStorage.getItem('ecv4_responses')||'[]')
}catch(e){}

$('#title').value=state.survey.title;
$('#desc').value=state.survey.desc;
if(state.survey.banner)$('#banner').style.backgroundImage=`url('${state.survey.banner}')`;
$('#title').oninput=e=>{state.survey.title=e.target.value;save()};
$('#desc').oninput=e=>{state.survey.desc=e.target.value;save()};
$('#bannerFile').onchange=e=>{
  const f=e.target.files?.[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{state.survey.banner=r.result;$('#banner').style.backgroundImage=`url('${r.result}')`;save()};
  r.readAsDataURL(f)
};
$('#removeBanner').onclick=()=>{state.survey.banner='';$('#banner').style.backgroundImage='';save()};

$$('.tab').forEach(b=>b.onclick=()=>{
  $$('.tab').forEach(x=>x.classList.toggle('active',x===b));
  ['q','r','s'].forEach(t=>$(`#${t}tab`).classList.toggle('hidden',t!==b.dataset.tab));
  if(b.dataset.tab==='r')renderResponses()
});
$$('.pill').forEach(b=>b.onclick=()=>{
  state.len=b.dataset.len;
  $$('.pill').forEach(x=>x.classList.toggle('on',x===b))
});

function tl(t){return TYPES.find(x=>x[0]===t)?.[2]||t}
function ti(t){return TYPES.find(x=>x[0]===t)?.[1]||'?'}

function editor(q,i){
  if(q.type==='short')return'<div class="mini" style="border-bottom:1px dotted #aaa;padding:9px 0;width:70%">Texto de respuesta corta</div>';
  if(q.type==='paragraph')return'<div class="mini" style="border-bottom:1px dotted #aaa;padding:9px 0;width:90%">Texto de respuesta larga</div>';
  if(['multiple','checkbox','dropdown'].includes(q.type)){
    const shape=q.type==='multiple'?'dot':q.type==='checkbox'?'box':'';
    return(q.options||[]).map((o,j)=>`<div class="orow"><span class="${shape}">${q.type==='dropdown'?j+1:''}</span><input data-opt="${i}:${j}" value="${esc(o)}"><button class="remove" data-rmopt="${i}:${j}">×</button></div>`).join('')+
      `<button class="addopt" data-addopt="${i}">＋ Agregar opción</button>`
  }
  if(q.type==='file')return'<div class="mini">La carga de archivos se simula en este prototipo.</div>';
  if(q.type==='scale')return`<label>Mínimo <select data-smin="${i}">${[0,1].map(n=>`<option ${q.scaleMin===n?'selected':''}>${n}</option>`).join('')}</select></label> &nbsp; <label>Máximo <select data-smax="${i}">${[2,3,4,5,6,7,8,9,10].map(n=>`<option ${q.scaleMax===n?'selected':''}>${n}</option>`).join('')}</select></label>`;
  if(q.type==='rating')return'<div style="font-size:28px;letter-spacing:8px;color:#777">☆ ☆ ☆ ☆ ☆</div>';
  if(['grid','checkgrid'].includes(q.type))return`<strong>Filas</strong>${(q.rows||[]).map((x,j)=>`<div class="orow"><input data-row="${i}:${j}" value="${esc(x)}"></div>`).join('')}<button class="addopt" data-addrow="${i}">＋ Agregar fila</button><br><strong>Columnas</strong>${(q.columns||[]).map((x,j)=>`<div class="orow"><input data-col="${i}:${j}" value="${esc(x)}"></div>`).join('')}<button class="addopt" data-addcol="${i}">＋ Agregar columna</button>`;
  if(q.type==='date')return'<div class="mini">▣ Día, mes y año</div>';
  if(q.type==='time')return'<div class="mini">◷ Hora</div>';
  return''
}

function renderQ(){
  $('#qlist').innerHTML=state.survey.questions.map((q,i)=>`<div class="qcard ${i===state.active?'active':''}" data-card="${i}">
    <div class="drag">⠿</div><div class="qbody">
      <div class="qtop"><input class="qtitle" data-title="${i}" value="${esc(q.title)}"><button class="typebtn" data-type="${i}">${ti(q.type)} &nbsp; ${tl(q.type)} <span style="float:right">⌄</span></button></div>
      <div class="opts">${editor(q,i)}</div>
      <div class="qfoot">
        <button class="icon" data-dup="${i}">⧉</button><button class="icon" data-del="${i}">🗑</button>
        <span>Obligatoria</span><label class="switch"><input data-req="${i}" type="checkbox" ${q.required?'checked':''}><span class="slider"></span></label>
      </div>
    </div></div>`).join('');
  bindQ()
}
function bindQ(){
  $$('[data-card]').forEach(c=>c.onclick=e=>{if(e.target.closest('input,button,select,label'))return;state.active=+c.dataset.card;renderQ()});
  $$('[data-title]').forEach(e=>e.oninput=()=>{state.survey.questions[+e.dataset.title].title=e.value;save()});
  $$('[data-type]').forEach(e=>e.onclick=()=>typeMenu(e,+e.dataset.type));
  $$('[data-req]').forEach(e=>e.onchange=()=>{state.survey.questions[+e.dataset.req].required=e.checked;save()});
  $$('[data-dup]').forEach(e=>e.onclick=()=>{const i=+e.dataset.dup,c=JSON.parse(JSON.stringify(state.survey.questions[i]));c.id=uid();state.survey.questions.splice(i+1,0,c);state.active=i+1;renderQ();save()});
  $$('[data-del]').forEach(e=>e.onclick=()=>{const i=+e.dataset.del;if(state.survey.questions.length===1)return alert('Debe quedar al menos una pregunta.');state.survey.questions.splice(i,1);state.active=Math.max(0,i-1);renderQ();save()});
  $$('[data-opt]').forEach(e=>e.oninput=()=>{const[i,j]=e.dataset.opt.split(':').map(Number);state.survey.questions[i].options[j]=e.value;save()});
  $$('[data-rmopt]').forEach(e=>e.onclick=()=>{const[i,j]=e.dataset.rmopt.split(':').map(Number);state.survey.questions[i].options.splice(j,1);renderQ();save()});
  $$('[data-addopt]').forEach(e=>e.onclick=()=>{const i=+e.dataset.addopt;state.survey.questions[i].options.push('Opción '+(state.survey.questions[i].options.length+1));renderQ();save()});
  $$('[data-smin]').forEach(e=>e.onchange=()=>{state.survey.questions[+e.dataset.smin].scaleMin=+e.value;save()});
  $$('[data-smax]').forEach(e=>e.onchange=()=>{state.survey.questions[+e.dataset.smax].scaleMax=+e.value;save()});
  $$('[data-row]').forEach(e=>e.oninput=()=>{const[i,j]=e.dataset.row.split(':').map(Number);state.survey.questions[i].rows[j]=e.value;save()});
  $$('[data-col]').forEach(e=>e.oninput=()=>{const[i,j]=e.dataset.col.split(':').map(Number);state.survey.questions[i].columns[j]=e.value;save()});
  $$('[data-addrow]').forEach(e=>e.onclick=()=>{const i=+e.dataset.addrow;state.survey.questions[i].rows.push('Fila');renderQ();save()});
  $$('[data-addcol]').forEach(e=>e.onclick=()=>{const i=+e.dataset.addcol;state.survey.questions[i].columns.push('Columna');renderQ();save()})
}
function typeMenu(anchor,i){
  $('.type-menu')?.remove();const r=anchor.getBoundingClientRect(),m=document.createElement('div');m.className='type-menu';m.style.left=Math.min(r.left,innerWidth-320)+'px';m.style.top=Math.min(r.bottom+4,innerHeight-420)+'px';
  m.innerHTML=TYPES.map(t=>t[0]==='sep'?'<div class="sep"></div>':`<button data-pick="${t[0]}">${t[1]} &nbsp; ${t[2]}</button>`).join('');document.body.appendChild(m);
  $$('[data-pick]',m).forEach(b=>b.onclick=()=>{const q=state.survey.questions[i];q.type=b.dataset.pick;if(['multiple','checkbox','dropdown'].includes(q.type)&&!q.options?.length)q.options=['Opción 1'];m.remove();renderQ();save()})
}
$('#addq').onclick=()=>{state.survey.questions.push(mk('Pregunta sin título','multiple',state.survey.settings.defreq,['Opción 1']));state.active=state.survey.questions.length-1;renderQ();save();setTimeout(()=>$(`[data-card="${state.active}"]`)?.scrollIntoView({behavior:'smooth',block:'center'}),50)};

/* Crear encuesta por texto o voz */
function generateFromIdea(raw,voice=false){
  const n=norm(raw),req=state.survey.settings.defreq,q=[];
  if(/evento|igle|iglesia|congreso|asistente|nuevo/.test(n)){
    q.push(mk('¿Cuál es tu nombre completo?','short',true),mk('¿De qué ciudad o municipio vienes?','short',true),mk('¿Es tu primera vez en este evento?','multiple',true,['Sí','No']),mk('¿Cómo te enteraste del evento?','multiple',true,['Amigo o familiar','Iglesia','Redes sociales','WhatsApp','Otro']),mk('¿Te gustaría recibir información de próximos eventos?','multiple',true,['Sí','No']));
    if(state.len==='long')q.push(mk('¿Qué esperas encontrar o aprender en este evento?','paragraph',false),mk('¿Qué fecha te queda mejor para una próxima actividad?','date',false),mk('¿En qué horario prefieres asistir?','time',false))
  }else{
    q.push(mk('¿Cuál es tu nombre?','short',req),mk('¿Cuál es tu opinión principal sobre este tema?','paragraph',true),mk('¿Qué tan satisfecho estás?','rating',true),mk('¿Qué podríamos mejorar?','paragraph',false));
    if(state.len==='long')q.push(mk('¿Qué fecha relacionas con esta experiencia?','date',false),mk('¿Quieres agregar algún comentario final?','paragraph',false))
  }
  state.survey.questions=q;state.active=0;$('#idea').value=raw;renderQ();save();
  if(voice){const s=$('#builderVoiceStatus');s.className='voice-status';s.textContent=`Creé ${q.length} preguntas a partir de lo que dijiste.`}
}
$('#generate').onclick=()=>{const v=$('#idea').value.trim();if(!v)return alert('Describe primero la encuesta.');generateFromIdea(v)};
$('#voiceGenerate').onclick=startBuilderVoice;
function startBuilderVoice(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition,status=$('#builderVoiceStatus'),btn=$('#voiceGenerate');
  if(!SR){status.textContent='El reconocimiento de voz no está disponible en este navegador.';return}
  if(state.builderVoice?.rec){try{state.builderVoice.rec.stop()}catch(e){};return}
  const rec=new SR(),session={rec,parts:[],last:'',lastAt:0,timer:null};state.builderVoice=session;
  rec.lang='es-CO';rec.continuous=true;rec.interimResults=false;
  status.className='voice-status listening';status.textContent='Escuchando tu idea…';btn.textContent='■ Terminar';
  const finish=()=>{if(state.builderVoice!==session)return;clearTimeout(session.timer);try{rec.stop()}catch(e){}const spoken=session.parts.join(' ').trim();state.builderVoice=null;btn.textContent='🎙 Crear hablando';if(!spoken){status.textContent='No alcancé a escuchar una descripción.';return}status.className='voice-status thinking';status.textContent='Interpretando tu idea…';setTimeout(()=>generateFromIdea(spoken,true),250)};
  rec.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){if(!e.results[i].isFinal)continue;const raw=e.results[i][0].transcript.trim(),n=norm(raw),now=Date.now();if(!n)continue;if(n===session.last&&now-session.lastAt<4500)continue;session.last=n;session.lastAt=now;session.parts.push(raw);clearTimeout(session.timer);session.timer=setTimeout(finish,2200)}};
  rec.onerror=e=>{if(['not-allowed','service-not-allowed'].includes(e.error)){status.textContent='No se concedió permiso de micrófono.';state.builderVoice=null;btn.textContent='🎙 Crear hablando'}};
  rec.onend=()=>{if(state.builderVoice===session&&session.parts.length){clearTimeout(session.timer);session.timer=setTimeout(finish,400)}else if(state.builderVoice===session){state.builderVoice=null;btn.textContent='🎙 Crear hablando'}};
  try{rec.start()}catch(e){status.textContent='No pude iniciar el micrófono.';state.builderVoice=null;btn.textContent='🎙 Crear hablando'}
}

/* Configuración */
$$('.accbtn').forEach(b=>b.onclick=()=>b.parentElement.classList.toggle('open'));
const map={quiz:'quiz',email:'email',edit:'edit',limit:'limit',progress:'progress',shuffle:'shuffle',defreq:'defreq'};
for(const[id,key]of Object.entries(map)){const e=$('#'+id);e.checked=!!state.survey.settings[key];e.onchange=()=>{state.survey.settings[key]=e.checked;save()}}
$('#confirm').value=state.survey.settings.confirm;$('#confirm').oninput=e=>{state.survey.settings.confirm=e.target.value;save()};
$('#voicemode').value=state.survey.settings.voice||'conversation';$('#voicemode').onchange=e=>{state.survey.settings.voice=e.target.value;save()};

/* Respuestas guardadas */
function renderResponses(){
  const x=$('#responses');if(!state.responses.length){x.innerHTML='<div class="mini" style="padding:35px;text-align:center">Aún no hay respuestas.</div>';return}
  x.innerHTML=`<h2>${state.responses.length} respuestas</h2>`+state.responses.map((r,i)=>`<details class="sheet" style="padding:14px"><summary><strong>Respuesta ${state.responses.length-i}</strong> · ${new Date(r.createdAt).toLocaleString('es-CO')}</summary>${r.answers.map(a=>`<p><strong>${esc(a.question)}</strong><br>${esc(Array.isArray(a.answer)?a.answer.join(', '):a.answer||'—')}</p>`).join('')}</details>`).join('')
}

$('#preview').onclick=()=>startRun(true);
$('#respond').onclick=()=>startRun(false);
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

/* =========================================================
   MOTOR DE CONVERSACIÓN
   - Guarda bloques de voz de manera privada en la sesión.
   - Reanaliza TODA la conversación después de cada bloque.
   - Cada respuesta es un slot con valor/confianza/evidencia.
   - No muestra la transcripción.
   - Las correcciones posteriores sustituyen datos anteriores.
   ========================================================= */

function startRun(preview){
  const qs=state.survey.settings.shuffle?shuffle([...state.survey.questions]):[...state.survey.questions];
  state.run={
    preview,qs,
    answers:{},
    slots:{},
    reviewFlags:{},
    utterances:[],
    manualLocks:new Set(),
    focus:0,
    rec:null,listening:false,keep:true,
    lastFinal:'',lastFinalAt:0,
    processing:false,
    changedIds:new Set()
  };
  $('#builder').classList.add('hidden');$('#runner').classList.remove('hidden');
  renderRun();startMic()
}

function answerUI(q,a){
  a=a??'';
  if(q.type==='short')return`<input data-a="${q.id}" type="text" value="${esc(a)}">`;
  if(q.type==='paragraph')return`<textarea data-a="${q.id}">${esc(a)}</textarea>`;
  if(q.type==='multiple')return`<div class="choices">${q.options.map(o=>`<label class="choice"><input data-radio="${q.id}" type="radio" name="${q.id}" value="${esc(o)}" ${a===o?'checked':''}>${esc(o)}</label>`).join('')}</div>`;
  if(q.type==='checkbox')return`<div class="choices">${q.options.map(o=>`<label class="choice"><input data-check="${q.id}" type="checkbox" value="${esc(o)}" ${Array.isArray(a)&&a.includes(o)?'checked':''}>${esc(o)}</label>`).join('')}</div>`;
  if(q.type==='dropdown')return`<select data-a="${q.id}"><option value="">Selecciona</option>${q.options.map(o=>`<option ${a===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
  if(q.type==='file')return'<input type="file"><div class="mini">Selección manual.</div>';
  if(q.type==='scale'||q.type==='rating'){const min=q.type==='rating'?1:q.scaleMin,max=q.type==='rating'?5:q.scaleMax;return`<div class="scale">${Array.from({length:max-min+1},(_,k)=>k+min).map(n=>`<label>${q.type==='rating'?'☆':n}<input data-radio="${q.id}" name="${q.id}" type="radio" value="${n}" ${String(a)===String(n)?'checked':''}></label>`).join('')}</div>`}
  if(q.type==='date')return`<input data-a="${q.id}" type="date" value="${esc(a)}">`;
  if(q.type==='time')return`<input data-a="${q.id}" type="time" value="${esc(a)}">`;
  if(['grid','checkgrid'].includes(q.type))return`<table class="gridtable"><tr><th></th>${q.columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr>${q.rows.map((r,ri)=>`<tr><td>${esc(r)}</td>${q.columns.map(c=>`<td><input type="${q.type==='grid'?'radio':'checkbox'}" name="${q.id}_${ri}"></td>`).join('')}</tr>`).join('')}</table>`;
  return''
}

function answeredCount(){
  if(!state.run)return 0;
  return state.run.qs.filter(q=>answerFilled(state.run.answers[q.id])).length
}
function answerFilled(a){return Array.isArray(a)?a.length>0:String(a??'').trim()!==''}

function renderRun(){
  const s=state.survey,r=state.run,count=answeredCount(),total=r.qs.length;
  $('#runner').innerHTML=`<div class="run"><div class="runinner">
    <div class="micbar">
      <span class="micdot" id="micdot"></span>
      <div class="miccopy">
        <strong id="mictxt">Activando micrófono…</strong>
        <div class="mini">Habla con naturalidad y en cualquier orden. No mostramos la transcripción.</div>
      </div>
      <span class="counter" id="answerCounter">${count} de ${total} identificadas</span>
    </div>

    <div class="sheet header">
      ${s.banner?`<div class="banner" style="background-image:url('${s.banner}')"></div>`:''}
      <div class="headbody"><h1>${esc(s.title)}</h1><div class="mini">${esc(s.desc)}</div></div>
    </div>

    ${s.settings.progress?`<div class="progressbar"><div class="progressfill" id="progressFill" style="width:${total?count/total*100:0}%"></div></div>`:''}

    ${r.qs.map((q,i)=>{
      const filled=answerFilled(r.answers[q.id]),warn=!!r.reviewFlags[q.id];
      return`<section class="ans ${filled?'filled':'pending'} ${warn?'review-needed':''} ${i===r.focus?'focus':''}" data-cardrun="${i}" id="card_${q.id}">
        <h3>${esc(q.title)}${q.required?' <span style="color:#d93025">*</span>':''}</h3>
        ${answerUI(q,r.answers[q.id])}
        <div class="interpret ${warn||filled?'':'hidden'} ${warn?'warn':''}" id="int_${q.id}">
          ${warn?esc(r.reviewFlags[q.id]):filled?'Respuesta identificada.':''}
        </div>
      </section>`
    }).join('')}

    <div style="display:flex;justify-content:space-between;gap:10px">
      <button class="soft btn" id="cancelrun">Cancelar</button>
      <button class="primary btn" id="reviewrun">Revisar respuestas</button>
    </div>
  </div></div>`;
  bindRun()
}

function bindRun(){
  $$('[data-a]').forEach(e=>e.oninput=()=>{
    const id=e.dataset.a;state.run.answers[id]=e.value;state.run.manualLocks.add(id);delete state.run.reviewFlags[id];updateCardState(id)
  });
  $$('[data-radio]').forEach(e=>e.onchange=()=>{
    const id=e.dataset.radio;state.run.answers[id]=e.value;state.run.manualLocks.add(id);delete state.run.reviewFlags[id];updateCardState(id)
  });
  $$('[data-check]').forEach(e=>e.onchange=()=>{
    const id=e.dataset.check;state.run.answers[id]=$$(`[data-check="${id}"]:checked`).map(x=>x.value);state.run.manualLocks.add(id);delete state.run.reviewFlags[id];updateCardState(id)
  });
  $$('[data-cardrun]').forEach(c=>c.onclick=e=>{
    if(e.target.closest('input,textarea,select,label'))return;
    state.run.focus=+c.dataset.cardrun;updateFocus()
  });
  $('#cancelrun').onclick=exitRun;
  $('#reviewrun').onclick=reviewRun
}
function updateFocus(){
  $$('[data-cardrun]').forEach((c,i)=>c.classList.toggle('focus',i===state.run.focus))
}
function updateCounter(){
  const count=answeredCount(),total=state.run.qs.length;
  if($('#answerCounter'))$('#answerCounter').textContent=`${count} de ${total} identificadas`;
  if($('#progressFill'))$('#progressFill').style.width=`${total?count/total*100:0}%`
}
function updateCardState(id,flash=false){
  const card=$(`#card_${id}`);if(!card)return;
  const filled=answerFilled(state.run.answers[id]),warn=!!state.run.reviewFlags[id];
  card.classList.toggle('filled',filled);card.classList.toggle('pending',!filled);card.classList.toggle('review-needed',warn);
  const box=$(`#int_${id}`);
  if(box){
    box.classList.toggle('hidden',!filled&&!warn);box.classList.toggle('warn',warn);
    box.textContent=warn?state.run.reviewFlags[id]:filled?'Respuesta identificada.':''
  }
  if(flash){card.classList.remove('answer-flash');void card.offsetWidth;card.classList.add('answer-flash');setTimeout(()=>card.classList.remove('answer-flash'),850)}
  updateCounter()
}

/* Micrófono continuo */
function startMic(){
  if(!state.run)return;
  state.run.keep=true;recognize()
}
function recognize(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){if($('#mictxt'))$('#mictxt').textContent='Este navegador no admite reconocimiento de voz. Puedes responder manualmente.';return}
  if(!state.run||state.run.listening)return;
  const rec=new SR();state.run.rec=rec;rec.lang='es-CO';rec.continuous=true;rec.interimResults=false;rec.maxAlternatives=1;
  rec.onstart=()=>{if(!state.run)return;state.run.listening=true;$('#micdot')?.classList.add('on');if($('#mictxt'))$('#mictxt').textContent='Escuchando toda la conversación'};
  rec.onresult=e=>{
    if(!state.run)return;
    for(let i=e.resultIndex;i<e.results.length;i++){
      if(!e.results[i].isFinal)continue;
      const raw=e.results[i][0].transcript.trim();if(!raw)continue;
      acceptUtterance(raw)
    }
  };
  rec.onerror=e=>{
    if(!state.run)return;
    if(['not-allowed','service-not-allowed'].includes(e.error)){state.run.keep=false;if($('#mictxt'))$('#mictxt').textContent='Micrófono bloqueado. Puedes responder manualmente.'}
    else if(e.error!=='aborted'&&e.error!=='no-speech'){if($('#mictxt'))$('#mictxt').textContent='Reconectando micrófono…'}
  };
  rec.onend=()=>{if(!state.run)return;state.run.listening=false;$('#micdot')?.classList.remove('on');if(state.run.keep)setTimeout(()=>{if(state.run)recognize()},180)};
  try{rec.start()}catch(e){setTimeout(()=>{if(state.run)recognize()},300)}
}
function stopMic(){
  if(!state.run)return;state.run.keep=false;try{state.run.rec?.abort()}catch(e){}state.run.listening=false
}

function acceptUtterance(raw){
  const r=state.run,n=norm(raw),now=Date.now();if(!n)return;
  if(n===r.lastFinal && now-r.lastFinalAt<6000)return;
  r.lastFinal=n;r.lastFinalAt=now;
  r.utterances.push({raw,n,at:now,focusQid:r.qs[r.focus]?.id||null});
  if($('#mictxt'))$('#mictxt').textContent='Entendiendo y organizando respuestas…';
  reconcileConversation();
  setTimeout(()=>{if(state.run&&$('#mictxt'))$('#mictxt').textContent='Escuchando toda la conversación'},280)
}

/* Reanaliza TODO desde cero; así una corrección posterior puede reemplazar una anterior. */
function reconcileConversation(){
  const r=state.run;if(!r||r.processing)return;r.processing=true;
  const nextSlots={};
  const changed=new Set();

  for(let ui=0;ui<r.utterances.length;ui++){
    const u=r.utterances[ui];
    const candidates=extractCandidates(u,r.qs,ui);

    for(const c of candidates){
      if(r.manualLocks.has(c.qid))continue;
      const prev=nextSlots[c.qid];
      const correction=isCorrection(u.n);
      const shouldReplace=!prev || c.confidence>prev.confidence+.08 || correction || c.explicit;
      if(shouldReplace){
        nextSlots[c.qid]={...c,utteranceIndex:ui};
      }
    }
  }

  for(const q of r.qs){
    if(r.manualLocks.has(q.id))continue;
    const slot=nextSlots[q.id];
    const old=r.answers[q.id];
    if(slot){
      const same=JSON.stringify(old??'')===JSON.stringify(slot.value);
      r.slots[q.id]=slot;r.answers[q.id]=slot.value;
      if(slot.confidence<.60)r.reviewFlags[q.id]='La entendí con poca seguridad. Revísala antes de enviar.';
      else delete r.reviewFlags[q.id];
      if(!same){applyAnswer(q,slot.value);changed.add(q.id)}
    }
  }

  /* Enfocar la primera pregunta sin respuesta, pero nunca obliga a responder en orden. */
  const firstEmpty=r.qs.findIndex(q=>!answerFilled(r.answers[q.id]));
  if(firstEmpty>=0)r.focus=firstEmpty;
  updateFocus();
  changed.forEach(id=>updateCardState(id,true));
  r.qs.filter(q=>!changed.has(q.id)).forEach(q=>updateCardState(q.id,false));
  r.processing=false
}

/* Divide una intervención en unidades pequeñas y extrae posibles respuestas para TODAS las preguntas. */
function extractCandidates(u,qs,utteranceIndex){
  const out=[],seen=new Set();
  const clauses=splitClauses(u.raw);
  const add=c=>{
    if(!c||!c.qid||c.value===undefined||c.value===null||c.value==='')return;
    const key=c.qid+'|'+JSON.stringify(c.value);
    if(seen.has(key))return;seen.add(key);out.push(c)
  };

  /* Primero extractores explícitos sobre toda la frase: una sola frase puede llenar varios campos. */
  for(const q of qs){
    const c=extractForQuestion(u.raw,q,{whole:true,focusQid:u.focusQid});
    if(c)add(c)
  }

  /* Después cada cláusula se compara contra todas las preguntas. */
  for(const clause of clauses){
    let best=null;
    for(const q of qs){
      const c=extractForQuestion(clause,q,{whole:false,focusQid:u.focusQid});
      if(c && (!best || c.confidence>best.confidence))best=c
    }
    if(best && best.confidence>=.44)add(best)
  }
  return out
}

function splitClauses(raw){
  return String(raw||'')
    .replace(/\b(y también|también|además|por otro lado|ah y|ah, y)\b/gi,' | ')
    .replace(/[.;]/g,' | ')
    .split('|').map(s=>s.trim()).filter(s=>s.length>1)
}

function extractForQuestion(raw,q,ctx={}){
  const n=norm(raw),qn=norm(q.title);
  if(!n)return null;

  /* Tipos cerrados: se pueden resolver aunque se respondan fuera de orden. */
  if(['multiple','dropdown'].includes(q.type)){
    const best=semanticChoice(n,q);
    let rel=questionRelevance(n,qn,q);
    if(best.score>=.88)return cand(q,best.option,Math.min(.99,best.score+.03),raw,true);
    if(best.score>=.56 && (rel>.10 || isYesNo(q) || hasStrongOptionAlias(n,q)))return cand(q,best.option,Math.min(.90,best.score+.08),raw,false)
  }
  if(q.type==='checkbox'){
    const hits=(q.options||[]).map(o=>({o,score:optionScore(n,o,q)})).filter(x=>x.score>=.66).map(x=>x.o);
    if(hits.length)return cand(q,hits,.80,raw,false)
  }
  if(q.type==='scale'||q.type==='rating'){
    const v=parseNumber(n),min=q.type==='rating'?1:q.scaleMin,max=q.type==='rating'?5:q.scaleMax;
    if(v>=min&&v<=max && (questionRelevance(n,qn,q)>.10 || ctx.focusQid===q.id))return cand(q,String(v),.88,raw,false)
  }
  if(q.type==='date'){
    const v=parseDate(n);if(v && (questionRelevance(n,qn,q)>.06 || ctx.focusQid===q.id || /fecha|dia|lunes|martes|miercoles|jueves|viernes|sabado|domingo|hoy|manana/.test(n)))return cand(q,v,.90,raw,false)
  }
  if(q.type==='time'){
    const v=parseTime(n);if(v && (questionRelevance(n,qn,q)>.06 || ctx.focusQid===q.id || /hora|manana|tarde|noche/.test(n)))return cand(q,v,.90,raw,false)
  }
  if(['file','grid','checkgrid'].includes(q.type))return null;

  /* Campos semánticos comunes */
  if(isNameQuestion(qn)){
    const v=extractName(raw);if(v)return cand(q,v,.97,raw,true)
  }
  if(isCityQuestion(qn)){
    const v=extractCity(raw);if(v)return cand(q,v,.96,raw,true)
  }
  if(isPhoneQuestion(qn)){
    const v=extractPhone(raw);if(v)return cand(q,v,.97,raw,true)
  }
  if(isEmailQuestion(qn)){
    const v=extractEmail(raw);if(v)return cand(q,v,.98,raw,true)
  }
  if(isAgeQuestion(qn)){
    const v=extractAge(n);if(v)return cand(q,v,.95,raw,true)
  }
  if(isExpectationQuestion(qn)){
    const v=extractAfter(raw,/(?:espero|quiero|me gustaria|quisiera|mi expectativa es|busco)\s+(.+)/i);
    if(v)return cand(q,cleanText(v),.86,raw,true)
  }
  if(isChurchNameQuestion(qn)){
    const v=extractAfter(raw,/(?:asisto a|voy a|mi iglesia es|pertenezco a)\s+(.+)/i);
    if(v)return cand(q,cleanText(v),.88,raw,true)
  }

  /* Preguntas de texto genéricas: solo se usan si hay relación semántica o esa era la pregunta enfocada. */
  if(['short','paragraph'].includes(q.type)){
    const rel=questionRelevance(n,qn,q);
    if(rel>=.26)return cand(q,cleanContextual(raw,q),Math.min(.80,.52+rel),raw,false);
    if(ctx.focusQid===q.id && n.split(' ').length>=2 && !looksLikeAnswerForAnotherCommonField(n,qn)){
      return cand(q,cleanContextual(raw,q),.58,raw,false)
    }
  }
  return null
}
function cand(q,value,confidence,evidence,explicit=false){return{qid:q.id,value,confidence,evidence,explicit}}

/* ====== Intención / similitud ====== */
function norm(s=''){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^\w\s@.+:-]/g,' ').replace(/\s+/g,' ').trim()
}
const STOP=new Set('que cual cuales como donde de del la el los las un una unos unas es eres son sea si no y o en a por para con te tu su mi me se lo al actualmente este esta evento encuesta respuesta'.split(' '));
function tokens(s){return norm(s).split(' ').filter(x=>x.length>2&&!STOP.has(x))}
function questionRelevance(answer,question,q){
  const A=new Set(tokens(answer)),B=new Set(tokens(question));
  if(!B.size)return 0;
  let hit=0;for(const x of B)if(A.has(x))hit++;
  let score=hit/B.size;
  const hints=questionHints(question);
  for(const h of hints)if(answer.includes(h))score=Math.max(score,.55);
  if(q?.options?.some(o=>answer.includes(norm(o))))score=Math.max(score,.55);
  return score
}
function questionHints(qn){
  const h=[];
  if(isNameQuestion(qn))h.push('me llamo','mi nombre','soy');
  if(isCityQuestion(qn))h.push('vengo de','soy de','vivo en','ciudad','municipio');
  if(isPhoneQuestion(qn))h.push('telefono','celular','whatsapp','numero');
  if(isEmailQuestion(qn))h.push('correo','email','arroba');
  if(isAgeQuestion(qn))h.push('anos','edad','tengo');
  if(/primera vez|primera ocasion/.test(qn))h.push('primera vez','ya he venido','nunca habia');
  if(/enter|conociste|supiste/.test(qn))h.push('instagram','facebook','tiktok','whatsapp','iglesia','pastor','amigo','familiar','invito');
  if(/recibir informacion|proximos eventos|contact/.test(qn))h.push('quiero recibir','me pueden enviar','no quiero recibir','informacion');
  return h
}
function similarity(a,b){
  a=norm(a);b=norm(b);if(!a||!b)return 0;if(a.includes(b)||b.includes(a))return .94;
  const A=new Set(tokens(a)),B=new Set(tokens(b)),inter=[...A].filter(x=>B.has(x)).length,union=new Set([...A,...B]).size;
  const jac=union?inter/union:0;
  const lev=1-levenshtein(a,b)/Math.max(a.length,b.length);
  return Math.max(jac,lev*.72)
}
function levenshtein(a,b){
  const m=Array.from({length:b.length+1},(_,i)=>[i]);for(let j=0;j<=a.length;j++)m[0][j]=j;
  for(let i=1;i<=b.length;i++)for(let j=1;j<=a.length;j++)m[i][j]=b[i-1]===a[j-1]?m[i-1][j-1]:1+Math.min(m[i-1][j-1],m[i][j-1],m[i-1][j]);
  return m[b.length][a.length]
}
function semanticChoice(n,q){
  let best={option:'',score:0};
  for(const o of q.options||[]){
    const sc=optionScore(n,o,q);if(sc>best.score)best={option:o,score:sc}
  }
  return best
}
function optionScore(n,opt,q){
  const o=norm(opt);let s=similarity(n,o),qn=norm(q.title);
  const boost=v=>{s=Math.max(s,v)};
  if(/si|sí/.test(o)&&isYesNo(q)&&/\b(si|claro|por supuesto|afirmativo|correcto|de acuerdo)\b/.test(n))boost(.96);
  if(/\bno\b/.test(o)&&isYesNo(q)&&/\b(no|negativo|para nada|no quiero|nunca)\b/.test(n))boost(.96);

  if(/enter|conociste|supiste/.test(qn)){
    if(/redes sociales|red social/.test(o)&&/instagram|facebook|tiktok|redes|historia|reel|publicacion/.test(n))boost(.98);
    if(/whatsapp|wasap/.test(o)&&/whatsapp|wasap|wsp|mensaje/.test(n))boost(.96);
    if(/iglesia/.test(o)&&/iglesia|pastor|lider|ministerio|culto|congregacion|grupo de jovenes|celula/.test(n))boost(.96);
    if(/amigo|familiar/.test(o)&&/amigo|amiga|familiar|familia|hermano|hermana|primo|prima|me invito/.test(n))boost(.94)
  }
  if(/primera vez|primera ocasion/.test(qn)){
    if(/si/.test(o)&&/primera vez|nunca habia venido|nunca he venido|es la primera/.test(n))boost(.98);
    if(/\bno\b/.test(o)&&/ya habia venido|ya he venido|he venido antes|no es la primera/.test(n))boost(.98)
  }
  if(/recibir informacion|proximos eventos|contact/.test(qn)){
    if(/si/.test(o)&&/si quiero|quiero recibir|me pueden enviar|mantenerme informado|informacion/.test(n)&&!/no quiero/.test(n))boost(.96);
    if(/\bno\b/.test(o)&&/no quiero|prefiero que no|no me envien/.test(n))boost(.98)
  }
  return s
}
function isYesNo(q){
  const opts=(q.options||[]).map(norm);return opts.some(x=>x==='si')&&opts.some(x=>x==='no')
}
function hasStrongOptionAlias(n,q){return (q.options||[]).some(o=>optionScore(n,o,q)>=.82)}
function isCorrection(n){return /\b(perdon|perdón|corrijo|correccion|corrección|me equivoque|me equivoqué|no era|quise decir|realmente|mejor dicho|sino)\b/.test(n)}

/* ====== Extractores concretos ====== */
function isNameQuestion(q){return /nombre|como te llamas|como se llama/.test(q)}
function isCityQuestion(q){return /ciudad|municipio|de donde vienes|donde vives|procedencia/.test(q)}
function isPhoneQuestion(q){return /telefono|celular|whatsapp|numero de contacto/.test(q)}
function isEmailQuestion(q){return /correo|email|e mail/.test(q)}
function isAgeQuestion(q){return /edad|cuantos anos|cuántos años/.test(q)}
function isExpectationQuestion(q){return /esperas|expectativa|que te gustaria|que quisieras|que buscas/.test(q)}
function isChurchNameQuestion(q){return /que iglesia|cual iglesia|nombre de.*iglesia|iglesia asistes/.test(q)}

function extractName(raw){
  const patterns=[
    /(?:mi nombre (?:completo )?es|me llamo|yo soy)\s+([a-záéíóúñü]+(?:\s+[a-záéíóúñü]+){1,5})/i,
    /(?:nombre(?: completo)?)[\s:]+([a-záéíóúñü]+(?:\s+[a-záéíóúñü]+){1,5})/i
  ];
  for(const p of patterns){const m=raw.match(p);if(m)return trimAtCue(m[1])}
  return''
}
function extractCity(raw){
  const patterns=[
    /(?:vengo de|soy de|vivo en|resido en|mi ciudad es|mi municipio es|desde)\s+([a-záéíóúñü][a-záéíóúñü\s-]{1,45})/i,
    /(?:ciudad|municipio|procedencia)[\s:]+([a-záéíóúñü][a-záéíóúñü\s-]{1,45})/i
  ];
  for(const p of patterns){const m=raw.match(p);if(m)return titleCase(trimAtCue(m[1]))}
  return''
}
function trimAtCue(s){
  return String(s).split(/\b(?:y|pero|ademas|además|tambien|también|es mi|me entere|me enteré|quiero recibir|no quiero|asisto|actualmente)\b/i)[0].trim()
}
function titleCase(s){return s.toLowerCase().replace(/\b\p{L}/gu,c=>c.toUpperCase())}
function extractPhone(raw){
  const direct=raw.match(/(?:\+?57[\s-]*)?3\d{2}[\s-]*\d{3}[\s-]*\d{4}/);if(direct)return direct[0].replace(/[^\d+]/g,'');
  const digits=spokenDigits(raw);return digits.length>=10?digits.slice(-10):''
}
function spokenDigits(raw){
  const map={cero:'0',uno:'1',una:'1',dos:'2',tres:'3',cuatro:'4',cinco:'5',seis:'6',siete:'7',ocho:'8',nueve:'9'};
  const parts=norm(raw).split(' '),out=[];
  for(const p of parts){if(/^\d+$/.test(p))out.push(p);else if(map[p]!==undefined)out.push(map[p])}
  return out.join('')
}
function extractEmail(raw){
  let s=norm(raw).replace(/\barroba\b/g,'@').replace(/\bpunto\b/g,'.').replace(/\bguion bajo\b/g,'_').replace(/\s+/g,'');
  const m=s.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);return m?m[0]:''
}
function extractAge(n){
  let m=n.match(/\b(?:tengo|edad(?: es)?)[^\d]{0,8}(\d{1,2})\s*(?:anos|años)?\b/);if(m)return m[1];
  return''
}
function extractAfter(raw,re){const m=raw.match(re);return m?trimAtCue(m[1]):''}
function cleanText(raw){
  let words=String(raw||'').trim().replace(/\s+/g,' ').split(' '),out=[];
  for(const w of words){if(out.length&&norm(out[out.length-1])===norm(w))continue;out.push(w)}
  let t=out.join(' ').replace(/\b(eee+|mmm+|eh+)\b/gi,'').replace(/\s+/g,' ').trim();
  return t?t[0].toUpperCase()+t.slice(1):''
}
function cleanContextual(raw,q){
  let t=cleanText(raw),qn=norm(q.title);
  if(isNameQuestion(qn))t=t.replace(/^(mi nombre es|me llamo|yo soy|soy)\s+/i,'');
  if(isCityQuestion(qn))t=t.replace(/^(vengo de|soy de|vivo en|desde)\s+/i,'');
  return t
}
function looksLikeAnswerForAnotherCommonField(n,qn){
  if(!isNameQuestion(qn)&&/\b(me llamo|mi nombre es)\b/.test(n))return true;
  if(!isCityQuestion(qn)&&/\b(vengo de|soy de|vivo en)\b/.test(n))return true;
  if(!isEmailQuestion(qn)&&/@|arroba/.test(n))return true;
  if(!isPhoneQuestion(qn)&&/\b3\d{9}\b/.test(n.replace(/\s/g,'')))return true;
  return false
}
function parseNumber(n){
  const m=n.match(/\b(10|[0-9])\b/);if(m)return+m[1];
  const d={cero:0,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10};
  for(const[k,v]of Object.entries(d))if(new RegExp(`\\b${k}\\b`).test(n))return v;return NaN
}
function parseDate(n){
  const d=new Date();
  if(/\bhoy\b/.test(n))return iso(d);
  if(/\bpasado manana\b/.test(n)){d.setDate(d.getDate()+2);return iso(d)}
  if(/\bmanana\b/.test(n)){d.setDate(d.getDate()+1);return iso(d)}
  const days={domingo:0,lunes:1,martes:2,miercoles:3,jueves:4,viernes:5,sabado:6};
  for(const[k,v]of Object.entries(days))if(new RegExp(`\\b${k}\\b`).test(n)){let add=(v-d.getDay()+7)%7;if(add===0||/proximo|siguiente/.test(n))add+=7;d.setDate(d.getDate()+add);return iso(d)}
  const M={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12};
  let m=n.match(/\b(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?/);if(m&&M[m[2]])return`${m[3]||d.getFullYear()}-${String(M[m[2]]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  m=n.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/);if(m){let y=m[3]?+m[3]:d.getFullYear();if(y<100)y+=2000;return`${y}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`}
  return''
}
function iso(d){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function parseTime(n){
  let h=null,mi=0;const D={una:1,uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12};
  const dm=n.match(/\b([01]?\d|2[0-3])[:.](\d{2})\b/);if(dm)return`${String(dm[1]).padStart(2,'0')}:${dm[2]}`;
  for(const[k,v]of Object.entries(D))if(new RegExp(`\\b${k}\\b`).test(n)){h=v;break}
  if(h===null){const z=n.match(/\b(\d{1,2})\b/);if(z)h=+z[1]}
  if(h===null)return'';if(/y media/.test(n))mi=30;else if(/y cuarto/.test(n))mi=15;else{const z=n.match(/y\s+(\d{1,2})/);if(z)mi=+z[1]}
  if(/tarde|noche/.test(n)&&h<12)h+=12;if(/manana/.test(n)&&h===12)h=0;
  return h<=23&&mi<=59?`${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}`:''
}

/* Aplica al formulario, sin mostrar lo que se transcribió */
function applyAnswer(q,v){
  if(['short','paragraph','dropdown','date','time'].includes(q.type)){
    const e=$(`[data-a="${q.id}"]`);if(e)e.value=v
  }else if(['multiple','scale','rating'].includes(q.type)){
    const e=$$(`[data-radio="${q.id}"]`).find(x=>x.value==v);if(e)e.checked=true
  }else if(q.type==='checkbox'){
    $$(`[data-check="${q.id}"]`).forEach(x=>x.checked=Array.isArray(v)&&v.includes(x.value))
  }
}

/* Revisión final: únicamente formulario diligenciado */
function reviewRun(){
  stopMic();const r=state.run;
  $('#runner').innerHTML=`<div class="run"><div class="runinner">
    <div class="sheet headbody"><h1>Revisa tus respuestas</h1><p class="mini">La conversación no se muestra. Solo aparecen las respuestas que el sistema logró organizar.</p></div>
    ${r.qs.map(q=>`<div class="review ${r.reviewFlags[q.id]?'warn':''}">
      <label>${esc(q.title)}</label>
      ${q.type==='paragraph'?`<textarea data-rev="${q.id}">${esc(Array.isArray(r.answers[q.id])?r.answers[q.id].join(', '):r.answers[q.id]||'')}</textarea>`:`<input data-rev="${q.id}" value="${esc(Array.isArray(r.answers[q.id])?r.answers[q.id].join(', '):r.answers[q.id]||'')}">`}
      ${r.reviewFlags[q.id]?`<div class="review-note">⚠ ${esc(r.reviewFlags[q.id])}</div>`:''}
    </div>`).join('')}
    <div style="display:flex;justify-content:space-between"><button class="soft btn" id="backrun">Volver</button><button class="primary btn" id="submitrun">${r.preview?'Cerrar vista previa':'Enviar'}</button></div>
  </div></div>`;
  $$('[data-rev]').forEach(e=>e.oninput=()=>{r.answers[e.dataset.rev]=e.value;r.manualLocks.add(e.dataset.rev);delete r.reviewFlags[e.dataset.rev]});
  $('#backrun').onclick=()=>{renderRun();startMic()};
  $('#submitrun').onclick=()=>r.preview?exitRun():submitRun()
}
function submitRun(){
  const miss=state.run.qs.find(q=>q.required&&!answerFilled(state.run.answers[q.id]));
  if(miss)return alert('Falta responder: '+miss.title);
  state.responses.unshift({createdAt:new Date().toISOString(),answers:state.run.qs.map(q=>({question:q.title,answer:state.run.answers[q.id]??''}))});
  save();const msg=state.survey.settings.confirm||'Tu respuesta ha sido registrada. Gracias.';
  $('#runner').innerHTML=`<div class="run"><div class="runinner"><div class="sheet" style="padding:45px;text-align:center"><div style="font-size:48px;color:#34a853">✓</div><h1>${esc(msg)}</h1><button class="primary btn" id="done">Finalizar</button></div></div></div>`;
  $('#done').onclick=exitRun
}
function exitRun(){stopMic();state.run=null;$('#runner').classList.add('hidden');$('#builder').classList.remove('hidden')}

renderQ();
