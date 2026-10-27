(function(){
'use strict';
const D=window.CaseData,R=window.CaseRules,$=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=value=>new Intl.NumberFormat('ru-RU').format(value);
let training=false,tourSnapshot=null;
const state={preset:'c1',profile:{...D.presets[0].profile},context:{...D.defaults},mode:'after',channel:null,page:'prototype',modal:null,amount:'30000000',term:'9',purpose:'',startDate:'',submitted:false,helpShown:false,helpVisible:false,startedAt:0,backtracks:0,callbackRequested:false,viewedOffers:new Set()};
const ledger=R.createLedger();const profileContexts=new Map();let helpTimer=null,toastTimer=null;
const readSession=()=>{if(training)return state.helpShown;try{return sessionStorage.getItem('redflag-k5-shown')==='1';}catch{return state.helpShown;}};
const markHelp=()=>{state.helpShown=true;if(training)return;try{sessionStorage.setItem('redflag-k5-shown','1');}catch{}};
const hasSigningRight=()=>['owner','cfo'].includes(state.profile.role)||(state.profile.role==='unknown'&&state.context.signingRight);
const context=()=>({...state.context,journey:state.preset==='c3'?'application':undefined,signingRight:hasSigningRight()});
const decision=()=>R.evaluate(state.profile,context());
const currentPreset=()=>D.presets.find(p=>p.id===state.preset)||D.presets[0];
const topicKey=()=>[state.preset,state.profile.structure==='confirmed'?'group':'company',state.profile.industry].join(':');
function emit(name,payload={}){if(!training)ledger.emit(name,{at:new Date().toISOString(),preset:state.preset,mode:state.mode,...payload});}
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
function labelFor(key,value){return D.options[key].find(x=>x[0]===value)?.[1]||value;}
function field(key,label,index){return `<label class="field"><span class="field-label">${label}</span><select name="${key}" aria-label="${label}">${D.options[key].map(([value,text])=>`<option value="${value}" ${state.profile[key]===value?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;}
function renderProfile(){
 $('presets').innerHTML=D.presets.map(p=>`<button type="button" class="preset-btn ${state.preset===p.id?'active':''}" data-preset="${p.id}" aria-pressed="${state.preset===p.id}">${p.name}</button>`).join('');
 const preset=currentPreset();const modified=Object.keys(D.options).some(k=>state.profile[k]!==preset.profile[k]);$('profile-note').textContent=modified?'Свой профиль':preset.title;
 $('profile-form').innerHTML=field('industry','Отрасль','01')+field('role','Роль получателя','02')+field('structure','Структура бизнеса','03')+field('activity','Цифровая активность','04');
 const checks=[['consent','Есть согласие на коммуникацию'],['refused','Отказ от предложений по теме'],['recipientVerified','Адресат передачи подтверждён'],['kmCapacity','У КМ есть свободная ёмкость'],['history','Есть история оборотов'],['needSignal','Есть сигнал потребности'],['commonNeed','У группы общий ЛПР и одна потребность']];
 $('context-form').innerHTML=checks.map(([key,label])=>`<label class="check-row"><input type="checkbox" data-context="${key}" ${state.context[key]?'checked':''}>${label}</label>`).join('')+[
 ['weeklyContacts','Контактов за неделю',0,2],['groupTopicDaysAgo','Дней с контакта по группе',0,30],['deliveredWithoutReaction','Доставлено без реакции',0,2],['lastUnansweredDaysAgo','Дней после них',0,30],['seasonWeeks','Недель до пика',0,20]
 ].map(([key,label,min,max])=>`<label class="check-row" data-tour-context="${key}">${label}<input class="context-number" aria-label="${label}" data-context="${key}" type="number" min="${min}" max="${max}" value="${state.context[key]}"></label>`).join('')+`<label class="check-row"><input type="checkbox" data-context="zeroValue" ${state.context.propensity===0?'checked':''}>Ожидаемая ценность контакта ≤ 0</label>${state.profile.role==='unknown'?`<label class="check-row"><input type="checkbox" data-context="signingRight" ${state.context.signingRight?'checked':''}>Право оформить продукт подтверждено</label>`:''}`;
}
function buildingIcon(){return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 21V5h10v16M15 10h4v11M3 21h18M8 8h4M8 12h4M8 16h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';}
function groupVisual(){return `<div class="group-visual" aria-label="Схема группы из пяти условных юридических лиц"><div class="group-top">Один расчёт для группы</div><div class="group-nodes">${[1,2,3,4,5].map(n=>`<div class="group-node">${buildingIcon()}<span>Юрлицо ${n}</span></div>`).join('')}</div></div>`;}
function visual(s){
 if(s.visual==='group')return groupVisual();
 if(s.visual==='season')return `<div class="season-visual"><div class="season-icon"><span>НЕДЕЛЬ</span><b>${state.context.seasonWeeks}</b></div><div class="season-info"><b>${esc(s.seasonName)}</b><span>До пика закупок</span></div><div class="season-amount"><b>30 млн ₽</b><span>на 9 месяцев · условно</span></div></div>`;
 if(s.visual==='progress')return `<div class="application-hero"><div class="mini-progress" aria-label="4 из 6 полей заполнены">${Array.from({length:6},()=>'<span></span>').join('')}</div><div class="mini-progress-text">4 из 6 полей заполнены · условно</div></div>`;
 return `<div class="neutral-visual">${buildingIcon()}<span>${s.fallback?'Расчёт по отдельному юрлицу':'Сумма и срок — в калькуляторе'}</span></div>`;
}
function communicationCopy(s){return s.copyUnavailable?`<div class="fallback-copy"><strong>${esc(s.presentation)}</strong><span>Текст для этого профиля не задан в шпаргалке.</span></div>`:`${s.subject?`<h3 class="email-subject">${esc(s.subject)}</h3>`:''}<p class="offer-copy" data-canonical-copy>${esc(s.fullText)}</p>`;}
function customerOffer(s){return `<div class="offer"><div class="offer-kicker"><span>${s.group?'ФИНАНСИРОВАНИЕ ГРУППЫ':'ОБОРОТНОЕ ФИНАНСИРОВАНИЕ'}</span>${s.draft?'<span class="draft-note" title="Новый текст: требуется утверждение координатором Михаилом">Черновик · новый текст</span>':''}</div>${!s.subject?`<h3>${esc(s.title)}</h3>`:''}${communicationCopy(s)}${visual(s)}<div class="offer-actions"><button class="primary-btn" data-action="open-offer">${s.action==='forward'||s.action==='clarify'?esc(s.cta):s.visual==='progress'?'Продолжить заявку':s.group?'Запросить расчёт для группы':'Проверить условия'}<span class="btn-arrow">↗</span></button><button class="unsub-btn" data-action="unsubscribe">Не предлагать</button></div></div>`;}
function clientWindow(channel,s){
 const body=customerOffer(s);const viewer=s.p.role==='operator'?'Операционист':s.target;let content;
 if(channel==='email')content=`<div class="client-topline"><div class="client-brand"><span class="mail-icon">✉</span><span>Письмо от Альфа-Банка</span></div><span class="client-location">${esc(s.target)}</span></div><div class="preview-body email-body">${body}</div>`;
 else if(channel==='manager')content=`<div class="client-topline"><div class="client-brand"><span class="alpha-icon">А</span><span>Задача менеджеру</span></div><span class="client-location">Предпросмотр</span></div><div class="manager-ticket"><div class="offer-kicker">ОДНА ПОТРЕБНОСТЬ · ОДНА ЗАДАЧА</div><h3>${esc(s.product)}</h3><div class="manager-context"><div>Для <b>${esc(s.target)}</b> · ${s.group?'5 юрлиц':'одно юрлицо'}</div><div>${s.group?'Уточнить ЛПР и заёмщиков; обсудить расчёт для группы':'Проверить сумму и срок, связаться по потребности'}</div></div>${communicationCopy(s)}<div class="offer-actions"><button class="primary-btn" data-action="manager-task">Создать задачу КМ <span>↗</span></button><button class="unsub-btn" data-action="unsubscribe">Не предлагать</button></div></div>`;
 else content=`<div class="client-topline"><div class="client-brand"><span class="alpha-icon">А</span><span>${channel==='boss'?'Альфа-Босс':'Альфа-Бизнес Онлайн'}</span></div><span class="client-location">${esc(viewer)}</span></div><div class="preview-body">${body}</div>`;
 return `<div class="client-window" data-preview-channel="${channel}">${content}</div>`;
}
function renderBaseline(){
 const b=R.baseline(state.profile,context());$('decision-summary').innerHTML=`<div class="decision-strip"><span class="segment-tag">AS IS</span><div class="decision-main"><b>${esc(b.product)}</b><span>Условное «было» · без ролевой и групповой адаптации</span></div></div>`;
 $('channel-tabs').innerHTML='';
 $('customer-preview').innerHTML=`<div class="client-window"><div class="client-topline"><div class="client-brand"><span class="alpha-icon">А</span>Альфа-Бизнес Онлайн</div><span class="client-location">${b.label}</span></div><div class="preview-body"><div class="baseline-title">${b.count===5?'5 юрлиц → 5 одинаковых баннеров':'Одна и та же общая коммуникация'}</div><div class="baseline-list">${Array.from({length:b.count},(_,i)=>`<div class="baseline-item"><div><span>Юрлицо ${i+1}</span><p>${esc(b.fullText)}</p></div><button data-action="baseline-offer" ${b.blocked?'disabled':''}>Подробнее</button></div>`).join('')}</div><div class="baseline-count">${b.blocked?'Контакт запрещён: действующие согласия и лимиты сохраняются.':'Текущие частотные лимиты есть. Иллюстрация показывает отсутствие общей логики по группе.'}</div></div></div>`;
 $('delivery-policy').innerHTML=`<div class="delivery-row"><div class="delivery-item"><span>КАНАЛ</span><strong>Баннер в интернет-банке · условно</strong></div><div class="delivery-item"><span>ЧАСТОТА</span><strong>${b.frequency}</strong></div></div>`;
 $('why-decision').innerHTML='<div class="why-row"><span>Почему так</span><span>Склонность по юрлицу + историческая конверсия канала</span></div>';
}
function renderDecision(){
 document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.mode===state.mode);b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode));});
 if(state.mode==='before'){renderBaseline();return;}
 const s=decision();const employee=s.p.role==='operator';if(employee)state.channel='banner';else if(!s.channelIds.includes(state.channel))state.channel=s.channelIds[0];
 $('decision-summary').innerHTML=`<div class="decision-strip"><span class="segment-tag">${esc(s.segment)}</span><span class="decision-product">${esc(s.product)}</span><span class="decision-recipient">${employee?'Передача: ':''}${esc(s.target)}</span></div>`;
 $('channel-tabs').innerHTML=s.blocked?'':employee?'<button class="channel-tab active" role="tab" aria-selected="true" data-channel="banner">Интернет-банк · сотрудник</button>':s.channelIds.map((id,i)=>`<button class="channel-tab ${state.channel===id?'active':''}" role="tab" aria-selected="${state.channel===id}" data-channel="${id}"><span class="priority-index">${i+1}</span>${esc(R.channels[id])}</button>`).join('');
 if(s.blocked)$('customer-preview').innerHTML=`<div class="blocked-state"><div class="blocked-icon">Ⅱ</div><span class="tiny-label">${esc(s.blockCode)} · КОНТАКТ ПРИОСТАНОВЛЕН</span><h3>Сейчас не отправляем</h3><p>${esc(s.reason)}</p><div class="button-group"><button class="secondary-btn" data-action="show-conditions">Проверить условия</button>${state.preset==='c3'&&hasSigningRight()?'<button class="secondary-btn" data-action="continue-existing">Продолжить начатую заявку</button>':''}</div>${state.preset==='c3'&&hasSigningRight()?'<p class="micro">Ограничение касается рассылок. Начатую заявку и помощь в сессии можно продолжить.</p>':''}</div>`;
 else if(s.visual==='progress'&&state.channel!=='session')$('customer-preview').innerHTML=`<div class="client-window"><div class="client-topline"><div class="client-brand"><span class="alpha-icon">А</span>${state.channel==='callback'?'Связь с менеджером':'Напоминание в тот же день'}</div><span class="client-location">Превью механики · условно</span></div><div class="preview-body"><h3>${state.channel==='callback'?'Продолжим с того же места':'Вернуться к начатой заявке'}</h3><p class="offer-copy">${state.channel==='callback'?'При затруднении клиент может запросить звонок из открытой формы. Контекст заявки сохраняется.':'Напоминание входит в общий лимит Л1. Его готовый текст в шпаргалке не задан; здесь показываем возврат к тому же черновику.'}</p>${visual(s)}<p class="product-note">${state.channel==='callback'?'Кнопка звонка доступна в помощи по сигналу К5.':'Напоминание после ухода не заменяет помощь в сессии.'}</p><button class="primary-btn" data-action="open-offer">Открыть начатую заявку <span>↗</span></button></div></div>`;
 else if(s.visual==='progress')$('customer-preview').innerHTML=`<div class="client-window"><div class="client-topline"><div class="client-brand"><span class="alpha-icon">А</span>Альфа-Бизнес Онлайн</div><span class="client-location">Начатая заявка</span></div><div class="preview-body"><div class="offer-kicker">Г4 · ПОМОЩЬ В ЗАЯВКЕ</div><h3>Заявка уже начата.<br>Осталось два поля.</h3><p class="offer-copy">Продолжите с сохранёнными данными компании.</p>${visual(s)}<button class="primary-btn" data-action="open-offer">Открыть начатую заявку <span>↗</span></button></div></div>`;
 else $('customer-preview').innerHTML=clientWindow(state.channel,s);
 $('delivery-policy').innerHTML=`<div class="delivery-row"><span class="delivery-label">Частота</span><span>${esc(s.frequency)}</span></div>${employee?`<div class="delivery-route">После передачи: ${esc(s.channelLabels.join(' → '))}</div>`:''}`;
 $('why-decision').innerHTML=`<div class="why-row"><button class="why-more" data-action="explain">Почему так <span>↗</span></button><div class="rule-chips">${s.applied.map(r=>`<span class="rule-chip" title="${esc(r.label)}">${r.id}</span>`).join('')}</div></div>`;
 const viewKey=[topicKey(),state.profile.role,state.profile.activity].join(':');if(!s.blocked&&!state.viewedOffers.has(viewKey)){state.viewedOffers.add(viewKey);emit('offer_view',{rules:s.codes,channel:s.channelIds[0]});}
}
function render(){renderProfile();renderDecision();}
function dialog(title,body,kind){
 clearInterval(helpTimer);state.modal=kind;$('dialog-content').innerHTML=`<div class="dialog-header"><div class="dialog-brand"><span class="alpha-icon">А</span><span>${esc(title)}</span></div><button data-action="close-dialog" aria-label="Закрыть">×</button></div><div class="dialog-body">${body}</div><div class="dialog-footer">${esc(D.prototypeLabel)}</div>`;
 if(!$('flow-dialog').open)$('flow-dialog').showModal();$('flow-dialog').scrollTop=0;
}
function closeDialog(){clearInterval(helpTimer);state.modal=null;$('flow-dialog').close();}
function success(title,message,next=''){
 dialog('Действие в прототипе',`<div class="success-panel"><div class="success-symbol">✓</div><h2 id="dialog-title">${esc(title)}</h2><p>${esc(message)}</p>${next}<button class="secondary-btn" data-action="close-dialog">Вернуться к предложению</button></div>`,'success');
}
function openOffer(){
 const s=decision();if(s.blocked){toast(s.reason);return;}emit('offer_click',{rules:s.codes,channel:state.channel});
 if(s.action==='forward'){forwardOffer(s);return;}if(s.action==='clarify'){createManagerTask(s,true);return;}
 if(state.preset==='c3'){openApplication();return;}
 if(s.group){dialog('Расчёт финансирования группы',`<div class="breadcrumbs"><button data-action="close-dialog">Предложение</button><span>›</span><span>Расчёт для группы</span></div><h2 id="dialog-title">${esc(s.title)}</h2>${s.fullText?`<p data-canonical-copy>${esc(s.fullText)}</p>`:`<p>${esc(s.presentation)}</p>`}${groupVisual()}<p>Менеджер уточнит ЛПР и заёмщиков. Сумма — после расчёта.</p>${!state.context.kmCapacity?'<p class="field-error">У КМ нет свободной ёмкости. Новая задача пока не создаётся.</p>':''}<button class="primary-btn" data-action="group-request" ${!state.context.kmCapacity?'disabled':''}>Запросить расчёт для группы <span>↗</span></button>`,'group');}
 else openCalculator(s);
}
function forwardOffer(s){
 if(!state.context.recipientVerified){createManagerTask(s,true);return;}
 const fresh=ledger.contact('forward:'+topicKey());if(fresh)emit('forward_to_lpr',{recipient:'owner',rules:s.codes});
 success('Отправлено собственнику в «Альфа-Босс»',fresh?'Передали предложение и контекст интереса. Это имитация передачи внутри прототипа.':'Предложение уже передано. Повторная отправка не создаётся.',`<div class="next-step">Теперь решение принимает руководитель<span>Г3 · Сотрудник не подписывает кредитную заявку</span></div><div class="button-group"><button class="primary-btn" data-action="view-as-owner">Открыть как руководитель <span>↗</span></button></div><br>`);
}
function createManagerTask(s=decision(),clarify=false){
 if(s.blocked&&!clarify){toast(s.reason);return;}
 if(!state.context.kmCapacity){toast('У КМ нет свободной ёмкости. Задача не создана.');return;}
 const t=ledger.task((clarify?'rights:':'need:')+topicKey(),{product:s.product,target:s.target,industry:state.profile.industry,group:s.group});if(t.created)emit('manager_task_created',{group:s.group,clarify});
 success(t.created?'Создана одна задача КМ':'Такая задача КМ уже есть',clarify?'Уточнить роль и полномочия по этому юрлицу. Неподтверждённому человеку предложение не пересылаем.':s.group?'Контекст сохранён: пять юрлиц, опт стройматериалов, расчёт для группы. Менеджер уточнит ЛПР и заёмщиков.':'Контекст потребности передан менеджеру. Уточнить условия и продолжить с клиентом.',`<div class="next-step">${t.created?'Новая задача':'Повтор не создаёт дубликат'} · Л3<span>Имитация в прототипе, без обращения в CRM банка</span></div>`);
}
function openCalculator(s=decision(),isBaseline=false){
 const seasonal=s.season&&!isBaseline;const amount=seasonal?state.amount:'';const term=seasonal?state.term:'';
 dialog('Условия финансирования',`<div class="breadcrumbs"><button data-action="close-dialog">Предложение</button><span>›</span><span>Калькулятор</span></div><div class="offer-kicker">${isBaseline?'БЫЛО · УСЛОВНО':`${esc(s.segment)} · ${esc(labelFor('industry',state.profile.industry))}`}</div><h2 id="dialog-title">${seasonal&&s.subject?esc(s.subject):esc(s.product)}</h2>${!isBaseline&&s.fullText?`<p data-canonical-copy>${esc(s.fullText)}</p>`:'<p>Общий калькулятор: сумма и срок не заполнены. Это условное сравнение с текущим маршрутом.</p>'}<form id="calculator-form" class="calculator"><h3>${seasonal?'Сумма и срок уже в калькуляторе':'Рассчитайте условия'}</h3><div class="calculator-grid"><label>Сумма, ₽<input name="amount" id="loan-amount" aria-label="Сумма кредита" type="number" min="1" max="1000000000" step="1" value="${esc(amount)}" placeholder="Введите сумму" required></label><label>Срок, месяцев<input name="term" id="loan-term" aria-label="Срок кредита в месяцах" type="number" min="1" max="60" value="${esc(term)}" placeholder="Введите срок" required></label></div><p class="micro">${seasonal?'30 млн ₽ на 9 месяцев — условный пример из шпаргалки. ':'Все условия демонстрационные. '}Ставку не показываем. Это не кредитное предложение банка.</p><p id="calculator-error" class="field-error" hidden></p><br><button class="primary-btn" type="submit">Продолжить к заявке <span>↗</span></button></form>`,isBaseline?'baseline-calculator':'calculator');
}
function progress(){return Number(Boolean(state.purpose))+Number(Boolean(state.startDate));}
function updateProgress(){
 const n=progress();if(!$('application-progress-text'))return;if(state.modal==='application')$('dialog-title').textContent=n===0?'До отправки — два поля':n===1?'До отправки — одно поле':'Заявка готова к отправке';if(n>0&&state.helpVisible){state.helpVisible=false;$('help-slot').innerHTML='';emit('help_resolved');}$('application-progress-text').textContent=`Заполнено ${4+n} из 6 полей · осталось ${2-n}`;
 $('application-progress').innerHTML=Array.from({length:6},(_,i)=>`<span class="${i<4+n?'done':''}"></span>`).join('');
}
function openApplication(){
 if(!hasSigningRight()){const s=decision();s.action=state.context.recipientVerified?'forward':'clarify';if(s.action==='forward')forwardOffer(s);else createManagerTask(s,true);return;}
 state.helpVisible=false;state.startedAt=Date.now();state.backtracks=0;state.submitted=false;state.helpShown=readSession();emit('application_started');
 const purposeOptions=[['','Выберите цель'],['working','Оборотные средства'],['season','Сезонные закупки'],['suppliers','Расчёты с поставщиками']];
 dialog('Заявка на финансирование',`<div class="breadcrumbs"><button data-action="application-back">К условиям</button><span>›</span><span>Заявка</span></div><div class="offer-kicker">${state.mode==='before'?'БЫЛО · УСЛОВНО':`${esc(decision().segment)} · ЗАЯВКА НА ФИНАНСИРОВАНИЕ`}</div><h2 id="dialog-title">До отправки — два поля</h2><div id="application-progress" class="application-progress" aria-label="Прогресс заявки"></div><div class="application-meta"><span id="application-progress-text"></span><span>Данные условные</span></div><div class="prefilled-fields"><div>Компания<b>Юрлицо 1 · условно</b></div><div>Продукт<b>Оборотный кредит</b></div><div>Сумма<b>${fmt(Number(state.amount))} ₽ · условно</b></div><div>Срок<b>${esc(state.term)} месяцев · условно</b></div></div><form id="application-form" class="application-form"><label>Цель кредита<select name="purpose" id="purpose" aria-label="Цель кредита" required>${purposeOptions.map(([value,label])=>`<option value="${value}" ${state.purpose===value?'selected':''}>${label}</option>`).join('')}</select></label><label>Планируемая дата получения средств<input type="date" name="startDate" id="start-date" aria-label="Планируемая дата получения средств" value="${esc(state.startDate)}" required></label><div id="help-slot" class="help-slot" aria-live="polite"></div><p id="application-error" class="field-error" hidden></p><div class="button-group"><button class="primary-btn" type="submit">Отправить заявку <span>↗</span></button><button class="quiet-btn" type="button" data-action="close-dialog">Продолжить позже</button></div></form><div class="demo-signals"><span>Сигналы демо</span><button data-action="simulate-pause">Пауза 45 с</button><button data-action="simulate-backtrack">Возврат между вариантами <span id="backtrack-count">0/3</span></button><span class="new-label">Новое · пороги пилота</span></div><p class="micro">${state.mode==='before'?'В условном «было» подсказка в сессии отсутствует.':'К5: помощь после паузы 45 с или 3 возвратов — не чаще раза за сессию. Закрывается одним действием.'}</p>`,'application');
 updateProgress();startHelpTimer();
}
function startHelpTimer(){clearInterval(helpTimer);if(!training&&state.modal==='application'&&!state.submitted&&!state.helpShown&&state.mode==='after')helpTimer=setInterval(()=>tryHelp((Date.now()-state.startedAt)/1000),1000);}
function tryHelp(elapsedSeconds,manual=false){
 const shown=state.helpShown||readSession();
 if(R.shouldHelp({view:state.modal,mode:state.mode,role:state.profile.role,signingRight:hasSigningRight(),elapsedSeconds,backtracks:state.backtracks,shown,submitted:state.submitted})&&progress()===0){
   state.helpVisible=true;markHelp();clearInterval(helpTimer);emit('help_shown',{trigger:state.backtracks>=3?'backtracks':'pause',threshold:state.backtracks>=3?3:45});
   $('help-slot').innerHTML=`<aside class="help-card"><button type="button" class="help-close" aria-label="Закрыть подсказку" data-action="dismiss-help">×</button><p data-canonical-copy>${esc(D.copy.help)}</p><button class="secondary-btn" type="button" data-action="callback">Перезвоните мне ↗</button></aside>`;
 }else if(shown&&manual)toast('Подсказка уже была показана в этой сессии. Повторно не показываем.');
}
function explain(){
 const s=decision();dialog('Почему принято такое решение',`<h2 id="dialog-title">От профиля к действию</h2><p>${esc(s.product)} · ${esc(s.target)}</p><div class="decision-context"><div><span>ПЕРВЫЙ КАНАЛ</span><b>${esc(s.channelLabels[0])}</b></div><div><span>СТАТУС</span><b>${s.blocked?'Не отправляем':'Можно предложить'}</b></div></div><table class="rule-table"><thead><tr><th>Код</th><th>Сработавшее правило</th></tr></thead><tbody>${s.applied.map(r=>`<tr><td>${r.id}</td><td>${esc(r.label)}</td></tr>`).join('')}</tbody></table>${s.notes.map(n=>`<p class="rules-note">${esc(n)}</p>`).join('')}<p class="rules-note">${s.blocked?esc(s.reason):(s.group?'Лимиты пройдены. Для С1 — не чаще одного предложения за 14 дней; до 2 контактов в неделю на человека.':'Лимиты пройдены. До 2 контактов в неделю на человека.')}</p><details class="disclosure"><summary>Расчёт ценности контакта</summary><div class="disclosure-body"><div class="decision-context"><div><span>ЦЕННОСТЬ КОНТАКТА · УСЛОВНО</span><b>${fmt(s.value)} ₽</b></div><div><span>ДЕМО РАСЧЁТА</span><b>${state.context.propensity} × ${fmt(state.context.riskAdjustedProfit)} − ${fmt(state.context.contactCost)}</b></div></div><p class="rules-note">p × прибыль с учётом риска − стоимость контакта. p и денежные параметры заданы для демонстрации, не рассчитаны моделью и не являются оценкой качества.</p></div></details>`,'explain');
}
function renderData(){
 const x=window.DatasetSummary;if(!x){$('data-page').innerHTML='<h1>Данные готовятся</h1>';return;}
 $('data-page').innerHTML=`<div class="information-heading"><span class="eyebrow">ОСНОВА ПРОТОТИПА</span><h1>Данные без домыслов</h1><p class="lead">Агрегаты из выгрузки организаторов. Клиенты в демо — условные.</p></div><div class="stats-grid"><div class="stat-card"><span>Компании · уникальные</span><b>${fmt(x.uniqueCompanies)}</b><small>v2 · ${fmt(x.companyRows)} строк</small></div><div class="stat-card"><span>Связи платежей</span><b>${fmt(x.paymentRows)}</b><small>Без дат операций</small></div><div class="stat-card"><span>Физлицо ↔ компания</span><b>${fmt(x.peopleRows)}</b><small>Без должностей и полномочий</small></div></div><div class="data-box"><h2>Что можно использовать</h2><table><thead><tr><th>Признак</th><th>Источник</th><th>В прототипе</th></tr></thead><tbody><tr><td>Отрасль и группа</td><td><span class="provenance-pill">Есть в CSV</span></td><td>ОКВЭД и GROUP_ID; связь требует проверки</td></tr><tr><td>Роль и активность</td><td><span class="provenance-pill missing">Нет в CSV</span></td><td>Сценарии команды; для пилота нужны CRM и события</td></tr><tr><td>Сезон, сумма и срок</td><td><span class="provenance-pill missing">Условно</span></td><td>6 недель · 30 млн ₽ · 9 месяцев, без ставки</td></tr></tbody></table></div><details class="disclosure"><summary>Качество и ограничения данных</summary><div class="disclosure-body"><p>В v2 — ${x.duplicateIdRows} дополнительных строк одного ID с неоднозначными групповыми связями. В агрегатах компаний — ${fmt(x.analysisCompanies)} уникальных ID после исключения ${x.excludedCompanies} конфликтующего ID. Версии выгрузки не смешиваем.</p><p><code>group_NAN</code> в старой версии — пропуск, а не холдинг из 39 336 компаний. Доля групп в выгрузке не равна доле рынка.</p><p>Нет целевой метки продажи, дат платежей, истории коммуникаций, роли и прав подписи. По этим данным нельзя доказать сезонность или эффект персонализации.</p></div></details>`;
}
function renderLogic(){
 $('logic-page').innerHTML=`<div class="information-heading"><span class="eyebrow">ТЕХ 2 · РЭД ФЛАГ №54</span><h1>Контекст → уместное действие</h1><p class="lead">Сохраняем текущий ML-скор. Добавляем 10 правил поверх него.</p></div><div class="pipeline"><div><span>01</span><b>Профиль</b><p>Отрасль · роль · группа · активность</p></div><div><span>02</span><b>Текущий скор</b><p>Оценка по юрлицу</p></div><div><span>03</span><b>Правила</b><p>Права · ценность · лимиты</p></div><div><span>04</span><b>Следующий шаг</b><p>Предложение · помощь · КМ</p></div></div><details class="disclosure"><summary>10 правил и как их проверить</summary><div class="disclosure-body"><table><thead><tr><th>Код</th><th>Правило</th><th>Проверка в демо</th></tr></thead><tbody>${R.rules.map(r=>`<tr><td>${r.id}</td><td>${r.label}</td><td>${r.id==='К5'?'Клиент 3 → форма → пауза 45 с':r.id==='Ф1'?'Условия → снять согласие':r.id==='Л1'?'Условия → 2 контакта':r.id==='Л2'?'Условия → 2 без реакции':r.id==='Ф2'?'Неподтверждённая группа':r.id==='К3'?'Роль → операционист':r.id==='К4'?'Активность → низкая':r.id==='К1'?'Клиент 1':r.id==='К2'?'Клиент 2':'Канал → задача КМ'}</td></tr>`).join('')}</tbody></table><p class="micro">Пороги — параметры пилота, не политика банка.</p></div></details><details class="disclosure"><summary>Гипотезы и проверка эффекта</summary><div class="disclosure-body"><table><thead><tr><th>Гипотеза</th><th>Метрика</th><th>Цель · условно</th></tr></thead><tbody><tr><td>Г1 · одно предложение группе</td><td>Доля холдингов с заявкой или запросом расчёта</td><td>+20% к контролю</td></tr><tr><td>Г2 · сезонное письмо</td><td>Доля компаний с заявкой до пика</td><td>+3 п.п.</td></tr><tr><td>Г3 · передача ЛПР</td><td>Доля компаний с заявкой ЛПР после клика сотрудника</td><td>+5 п.п.</td></tr><tr><td>Г4 · помощь в форме</td><td>Отправленные заявки / начатые</td><td>+10% к контролю</td></tr></tbody></table><p>Контроль — действующий оптимизатор. Рандомизация: Г1/Г3 — холдинг; Г2/Г4 — компания. Сначала расчёт мощности: α = 5%, мощность 80%.</p><p>Для Г3 нужны кластерный расчёт и анализ по холдингам. Основная аудитория задаётся до воздействия; клики — этап воронки.</p><p>Защитные метрики: отписки, жалобы, нагрузка КМ, время до заявки. Цели не являются измеренным эффектом; A/B-результатов в демо нет.</p></div></details><details class="disclosure"><summary>События демонстрации <span class="event-count">${ledger.events.length}</span></summary><div class="disclosure-body"><p>Просмотр, клик, передача ЛПР, задача КМ, форма, помощь, завершение. Хранятся только в памяти вкладки.</p><button class="secondary-btn" data-action="export-events">Скачать события JSON</button></div></details>`;
}
function setPage(page){state.page=page;['prototype','data','logic'].forEach(p=>$(p+'-page').hidden=p!==page);document.querySelectorAll('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===page);if(b.dataset.page===page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});if(page==='data')renderData();if(page==='logic')renderLogic();}
function reset(){closeDialog();state.preset='c1';state.profile={...D.presets[0].profile};state.context={...D.defaults};state.mode='after';state.channel=null;state.amount='30000000';state.term='9';state.purpose='';state.startDate='';state.helpShown=false;state.callbackRequested=false;state.viewedOffers.clear();profileContexts.clear();ledger.reset();try{sessionStorage.removeItem('redflag-k5-shown');}catch{}setPage('prototype');render();toast('Демонстрация сброшена. Начинаем с Клиента 1.');}
function exportEvents(){const text=JSON.stringify({prototype:true,synthetic:true,events:ledger.events},null,2);const blob=new Blob([text],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='redflag-demo-events.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const tour=window.CaseTour.create({
 begin(){
   tourSnapshot={state:{...state,profile:{...state.profile},context:{...state.context},viewedOffers:new Set(state.viewedOffers)},at:Date.now(),scrollX:window.scrollX,scrollY:window.scrollY,conditionsOpen:$('conditions').open,details:Array.from($(state.page+'-page').querySelectorAll('details')).map(el=>el.open),dialogOpen:$('flow-dialog').open,dialogHTML:$('dialog-content').innerHTML,dialogScroll:$('dialog-content').querySelector('.dialog-body')?.scrollTop||0,fields:Array.from($('dialog-content').querySelectorAll('input,select')).map(el=>({id:el.id,value:el.value,checked:el.checked})),focusId:document.activeElement.id,toast:{hidden:$('toast').hidden,text:$('toast').textContent}};
   training=true;closeDialog();clearTimeout(toastTimer);$('toast').hidden=true;
 },
 prepare(id){
   if(id==='welcome')return;
   closeDialog();
   const preset=id==='channels'||id==='calculator'?D.presets[1]:id==='help'?D.presets[2]:D.presets[0];
   Object.assign(state,{preset:preset.id,profile:{...preset.profile},context:{...D.defaults},mode:id==='comparison'?'before':'after',channel:null,purpose:'',startDate:'',amount:'30000000',term:'9',helpShown:false,helpVisible:false,submitted:false,backtracks:0,callbackRequested:false});
   if(id==='role')state.profile.role='operator';
   if(id==='limits')state.context.weeklyContacts=2;
   $('conditions').open=id==='limits';render();setPage('prototype');
   if(id==='calculator')openCalculator(decision());
   if(id==='help'){openApplication();tryHelp(45);}
 },
 end(){
   const saved=tourSnapshot;if(!saved)return null;
   closeDialog();Object.assign(state,saved.state);
   if(state.modal==='application')state.startedAt+=Date.now()-saved.at;
   render();setPage(state.page);$('conditions').open=saved.conditionsOpen;
   $(state.page+'-page').querySelectorAll('details').forEach((el,i)=>{el.open=!!saved.details[i];});
   if(saved.dialogOpen){
     $('dialog-content').innerHTML=saved.dialogHTML;
     saved.fields.forEach(field=>{const el=document.getElementById(field.id);if(el){el.value=field.value;el.checked=field.checked;}});
     $('flow-dialog').showModal();const body=$('dialog-content').querySelector('.dialog-body');if(body)body.scrollTop=saved.dialogScroll;
   }
   $('toast').textContent=saved.toast.text;$('toast').hidden=saved.toast.hidden;
   if(!saved.toast.hidden)toastTimer=setTimeout(()=>$('toast').hidden=true,4000);
   training=false;startHelpTimer();window.scrollTo({left:saved.scrollX,top:saved.scrollY,behavior:'instant'});tourSnapshot=null;
   return saved.dialogOpen?document.getElementById(saved.focusId)||$('flow-dialog').querySelector('button'):null;
 }
});
document.addEventListener('click',event=>{
 if(event.target.closest('a.brand')){event.preventDefault();setPage('prototype');window.scrollTo({top:0,behavior:'smooth'});return;}
 const b=event.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.preset){closeDialog();profileContexts.set(state.preset,{...state.context});state.preset=b.dataset.preset;state.profile={...currentPreset().profile};state.context={...(profileContexts.get(state.preset)||D.defaults)};state.channel=null;state.purpose='';state.startDate='';render();return;}
 if(b.dataset.mode){state.mode=b.dataset.mode;state.channel=null;renderDecision();return;}
 if(b.dataset.channel){state.channel=b.dataset.channel;renderDecision();return;}
 if(b.dataset.page){setPage(b.dataset.page);return;}
 const action=b.dataset.action;
 if(action==='start-tour')tour.start();
 if(action==='reset')reset();
 if(action==='close-dialog')closeDialog();
 if(action==='open-offer')openOffer();
 if(action==='continue-existing')openApplication();
 if(action==='show-result'){$('result').scrollIntoView({block:'start',behavior:'smooth'});$('result').focus({preventScroll:true});}
 if(action==='show-conditions'){$('conditions').open=true;$('conditions').scrollIntoView({block:'center',behavior:'smooth'});}
 if(action==='unsubscribe'){state.context.refused=true;emit('topic_opt_out');render();toast('Предложения по этой теме выключены в демо.');}
 if(action==='explain')explain();
 if(action==='view-as-owner'){closeDialog();state.profile.role='owner';state.channel=null;render();}
 if(action==='group-request'||action==='manager-task')createManagerTask();
 if(action==='baseline-offer')openCalculator(decision(),true);
 if(action==='simulate-pause'){emit('demo_pause_simulated');tryHelp(45,true);}
 if(action==='simulate-backtrack'){state.backtracks++;$('backtrack-count').textContent=`${state.backtracks}/3`;emit('form_backtrack');tryHelp(0,true);}
 if(action==='dismiss-help'){state.helpVisible=false;$('help-slot').innerHTML='';emit('help_dismissed');}
 if(action==='callback'){
   if(!state.context.kmCapacity){toast('У КМ нет свободной ёмкости. Обратный звонок не запрошен.');return;}
   const t=ledger.task('need:'+topicKey(),{purpose:'continue_application'});if(t.created)emit('callback_requested');state.callbackRequested=true;
   $('help-slot').innerHTML='<div class="help-card"><p>Запрос на звонок сохранён в демо. Контекст заявки сохранён, продолжите с того же места.</p><button type="button" class="help-close" aria-label="Закрыть подсказку" data-action="dismiss-help">×</button></div>';
 }
 if(action==='application-back'){emit('application_back');openCalculator(decision(),state.mode==='before');}
 if(action==='export-events')exportEvents();
});
$('profile-form').addEventListener('change',e=>{const key=e.target.name;if(!D.options[key])return;state.profile[key]=e.target.value;state.channel=null;emit('profile_changed',{field:key});renderProfile();renderDecision();});
function handleContextInput(e){const key=e.target.dataset.context;if(!key)return;if(key==='zeroValue')state.context.propensity=e.target.checked?0:D.defaults.propensity;else if(e.target.type==='number'){const n=Number(e.target.value);state.context[key]=Number.isFinite(n)?Math.max(0,n):0;}else state.context[key]=e.target.checked;state.channel=null;renderDecision();}
$('context-form').addEventListener('input',handleContextInput);
$('context-form').addEventListener('change',handleContextInput);
$('flow-dialog').addEventListener('cancel',()=>{clearInterval(helpTimer);state.modal=null;});
$('flow-dialog').addEventListener('click',e=>{if(e.target===$('flow-dialog'))closeDialog();});
$('flow-dialog').addEventListener('input',e=>{if(e.target.name==='purpose')state.purpose=e.target.value;if(e.target.name==='startDate')state.startDate=e.target.value;if(state.modal==='application'){state.startedAt=Date.now();updateProgress();}});
$('flow-dialog').addEventListener('change',e=>{if(e.target.name==='purpose'){state.purpose=e.target.value;state.startedAt=Date.now();updateProgress();}});
$('flow-dialog').addEventListener('submit',e=>{
 e.preventDefault();const form=e.target;
 if(form.id==='calculator-form'){
  const amount=Number(form.elements.amount.value),term=Number(form.elements.term.value);if(!Number.isFinite(amount)||amount<=0||amount>1e9||!Number.isInteger(term)||term<1||term>60){$('calculator-error').textContent='Проверьте сумму и срок: от 1 до 60 месяцев.';$('calculator-error').hidden=false;return;}
  state.amount=String(amount);state.term=String(term);emit('calculator_completed');openApplication();
 }
 if(form.id==='application-form'){
  state.purpose=form.elements.purpose.value;state.startDate=form.elements.startDate.value;
  if(!hasSigningRight()){toast('Для отправки нужны подтверждённые полномочия.');return;}
  if(!state.purpose||!state.startDate){$('application-error').textContent='Укажите цель кредита и планируемую дату.';$('application-error').hidden=false;return;}
  state.submitted=true;clearInterval(helpTimer);const fresh=ledger.contact('application:'+topicKey());if(fresh)emit('application_submitted',{helpSeen:state.helpShown,callback:state.callbackRequested});
  success(fresh?'Заявка сохранена в демо':'Заявка уже сохранена','Клиент завершил путь от предложения до заявки. Данные не переданы в банк; кредит не оформлен.',`<div class="next-step">${fmt(Number(state.amount))} ₽ · ${state.term} месяцев · условно<span>Сделка и выдача будут измеряться отдельно от заявки</span></div>`);
 }
});
render();setPage('prototype');tour.offer();
})();
