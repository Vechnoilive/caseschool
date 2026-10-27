(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./data.js'));else root.CaseRules=factory(root.CaseData);})(typeof globalThis!=='undefined'?globalThis:this,function(Data){
  'use strict';
  const channels={boss:'Альфа-Босс',email:'e-mail',banner:'Интернет-банк',manager:'Клиентский менеджер',session:'Подсказка в сессии',callback:'Перезвоните мне',reminder:'Напоминание в тот же день'};
  function normalize(profile,context){
    const p={...Data.presets[0].profile,...profile};
    for(const key of Object.keys(Data.options))if(!Data.options[key].some(x=>x[0]===p[key]))throw new Error('Неизвестное значение '+key);
    const c={...Data.defaults,...context};
    for(const key of ['weeklyContacts','groupTopicDaysAgo','deliveredWithoutReaction','lastUnansweredDaysAgo','seasonWeeks','riskAdjustedProfit','contactCost'])if(!Number.isFinite(c[key])||c[key]<0)throw new Error('Некорректный параметр '+key);
    if(!Number.isFinite(c.propensity)||c.propensity<0||c.propensity>1)throw new Error('Некорректная вероятность');
    return {p,c};
  }
  const rules=Object.freeze([
    {id:'Ф1',label:'Согласие и допустимость',when:s=>!s.c.consent||s.c.refused||s.c.stopFactor,apply:s=>{s.blocked=true;s.reason=s.c.refused?'Клиент отказался от предложений по этой теме':!s.c.consent?'Нет согласия на коммуникацию':'Продукт исключён стоп-фактором';s.blockCode='Ф1';}},
    {id:'Ф2',label:'Подтверждение роли и группы',when:s=>s.p.role==='unknown'||s.p.structure==='unconfirmed',apply:s=>{s.group=false;s.fallback=true;s.notes.push('Сценарий по юрлицу. Роль и связь группы уточняем, групповые суммы не показываем. Подпись не доказывает должность.');}},
    {id:'К1',label:'Одна потребность группы',when:s=>s.group,apply:s=>{s.segment='С1';s.product='Расчёт кредитного лимита для группы';s.alternative='Размещение остатков группы';s.frequency=Data.policy.groupFrequency;s.channelIds=['boss','manager','email'];s.visual='group';s.action='group';s.title='Одно решение для всей группы';}},
    {id:'К2',label:'Отрасль и сезон',when:s=>s.p.industry!=='other',apply:s=>{s.season=s.c.history&&s.c.needSignal&&s.c.seasonWeeks>=6&&s.c.seasonWeeks<=8;if(s.season){s.seasonName=s.p.industry==='agro'?'Посевная':'Закупки к строительному сезону';if(!s.group){s.segment='С2';s.product=s.p.industry==='agro'?'Оборотный кредит под сезон: посевная':'Оборотный кредит под сезон: закупки';s.title=s.p.industry==='agro'?'Финансирование к посевной':'Подготовьтесь к пику закупок';s.frequency=Data.policy.seasonFrequency;s.channelIds=['email','banner','manager'];s.visual='season';}}else{s.notes.push('Сезонный триггер выключен: нужно окно 6–8 недель, история оборотов и сигнал потребности.');if(!s.group)s.offSeason=s.c.history&&s.c.needSignal&&(s.c.seasonWeeks<6||s.c.seasonWeeks>8);}}},
    {id:'К3',label:'Передача уполномоченному',when:s=>s.p.role==='operator'||s.p.role==='unknown',apply:s=>{s.action=s.p.role==='unknown'?'clarify':s.c.recipientVerified?'forward':'clarify';s.target=s.p.role==='unknown'?'Тот, у кого есть права на действие':s.c.recipientVerified?'Собственник':'КМ для уточнения уполномоченного';s.notes.push(s.c.recipientVerified?'Сотрудник передаёт интерес; заявку оформляет руководитель.':'Адресат не подтверждён: передача руководителю недоступна, КМ уточняет полномочия.');}},
    {id:'К4',label:'Роль и удобный канал',when:()=>true,apply:s=>{s.presentation=s.p.role==='owner'?(s.group?'Собственнику — выгода группы':'Собственнику — задача компании'):s.p.role==='cfo'?'Финдиректору — сумма и срок':s.p.role==='operator'?'Операционисту — передать руководителю':'Должность не определяем по подписи';if(!s.target)s.target=s.p.role==='owner'?'Собственник':s.p.role==='cfo'?'Финдиректор':'Тот, у кого есть права на действие';if(s.p.activity==='low'||s.p.role==='unknown'){s.channelIds=['manager',...s.channelIds.filter(x=>x!=='manager')];s.notes.push(s.p.role==='unknown'?'Роль неизвестна: первым идёт КМ, чтобы уточнить адресата и полномочия.':'Мало входов: первым идёт КМ, остальные каналы остаются доступны.');}}},
    {id:'К5',label:'Помощь в открытой форме',when:s=>s.c.journey==='application',apply:s=>{s.segment='С3';s.product='Кредит — продолжение начатой заявки';s.title='Завершите начатую заявку';s.frequency=Data.policy.helpFrequency;s.visual='progress';s.channelIds=s.p.role==='unknown'?['manager','session','callback','reminder']:['session','callback','reminder'];s.action=s.p.role==='operator'?(s.c.recipientVerified?'forward':'clarify'):s.p.role==='unknown'?'clarify':'application';}},
    {id:'Л1',label:'Единый лимит контактов',when:s=>s.c.weeklyContacts>=Data.policy.weeklyLimit||(s.group&&s.c.groupTopicDaysAgo<Data.policy.groupMinIntervalDays),apply:s=>{s.blocked=true;if(!s.blockCode){s.blockCode='Л1';s.reason=s.c.weeklyContacts>=Data.policy.weeklyLimit?'Исчерпан лимит: 2 контакта в неделю на человека':s.c.groupTopicDaysAgo<Data.policy.groupCooldownDays?'По теме группы уже был контакт за последние 7 дней':'Групповое предложение было менее 2 недель назад — действует более строгая частота С1';}}},
    {id:'Л2',label:'Пауза после двух предложений',when:s=>s.c.deliveredWithoutReaction>=Data.policy.unansweredLimit&&s.c.lastUnansweredDaysAgo<Data.policy.pauseDays,apply:s=>{s.blocked=true;if(!s.blockCode){s.blockCode='Л2';s.reason='2 доставленных предложения без реакции — пауза 30 дней по теме';}}},
    {id:'Л3',label:'Ёмкость клиентского менеджера',when:s=>s.channelIds[0]==='manager'||s.group,apply:s=>{s.kmNeeded=true;if(!s.c.kmCapacity){s.notes.push('У КМ нет свободной ёмкости: новая задача не создаётся.');if(s.channelIds[0]==='manager'){s.blocked=true;if(!s.blockCode){s.blockCode='Л3';s.reason='У клиентского менеджера нет свободной ёмкости';}}}}}
  ]);
  function evaluate(profile,context={}){
    const {p,c}=normalize(profile,context);const s={p,c,group:p.structure==='confirmed'&&p.role!=='unknown'&&c.commonNeed,segment:'Базовый сценарий',product:'Оборотный кредит для компании',alternative:'',title:'Финансирование под вашу задачу',target:'',channelIds:['banner','email','manager'],frequency:Data.policy.genericFrequency,visual:'company',action:'application',notes:[],applied:[],blocked:false,reason:'',blockCode:'',presentation:'',offSeason:false,fallback:false};
    for(const rule of rules){if(rule.when(s)){rule.apply(s);s.applied.push({id:rule.id,label:rule.label});}}
    s.value=Number((c.propensity*c.riskAdjustedProfit-c.contactCost).toFixed(2));
    if(s.value<=0&&!s.blocked){s.blocked=true;s.blockCode='Ценность';s.reason='Ожидаемая ценность контакта не положительна';}
    if(s.offSeason&&!s.blocked&&c.journey!=='application'){s.blocked=true;s.blockCode='К2';s.reason='Вне сезонного окна: сейчас не отправляем сезонное предложение';}
    s.draft=false;s.fullText=null;
    if(s.visual==='progress')s.fullText=Data.copy.help;
    else if(s.group&&p.industry==='wholesale'&&s.season){
      if(p.role==='owner')s.fullText=Data.copy.groupOwner;
      else if(p.role==='cfo'){s.fullText=Data.copy.groupCfo;s.draft=true;}
      else if(p.role==='operator'){s.fullText=Data.copy.groupOperator;s.draft=true;}
    }else if(!s.group&&s.season&&p.industry==='agro'&&p.role==='cfo'&&c.seasonWeeks===6){s.fullText=Data.copy.seasonBody;s.subject=Data.copy.seasonSubject;}
    else if(!s.group&&!s.season){s.fullText=Data.copy.generic;s.draft=true;}
    s.copyUnavailable=!s.fullText;
    s.cta=s.action==='forward'?'Отправить руководителю':s.action==='clarify'?'Уточнить полномочия':s.action==='group'?'Запросить расчёт для группы':s.action==='application'?'Продолжить оформление':'Рассчитать условия';
    s.channelLabels=s.channelIds.map(x=>channels[x]);s.codes=s.applied.map(x=>x.id);return s;
  }
  function baseline(profile,context={}){
    const {p,c}=normalize(profile,context);
    const application=c.journey==='application',season=p.industry==='agro';
    return {kind:application?'application':season?'season':'group',
      product:application?'Продолжение начатой заявки':season?'Оборотный кредит для бизнеса':p.structure==='confirmed'?'Кредит по каждому юрлицу':'Кредит для бизнеса',
      fullText:season?Data.copy.beforeSeason:Data.copy.beforeGroup,count:!application&&p.structure==='confirmed'?5:1,
      channel:'Интернет-банк',frequency:application?'Напоминание после ухода; подсказки в сессии нет':season?'Каждый месяц вне цикла компании · условно':'Историческая логика и действующие частотные лимиты',
      label:'Было — условная иллюстрация, не снимок действующей системы',blocked:!c.consent||c.refused||c.stopFactor||c.weeklyContacts>=2};
  }
  function shouldHelp({view,mode='after',role='cfo',signingRight=true,elapsedSeconds=0,backtracks=0,shown=false,submitted=false,remainingFields=2,visible=true}){
    return view==='application'&&mode==='after'&&role!=='operator'&&signingRight&&visible&&!shown&&!submitted&&remainingFields>0&&remainingFields<=2&&(elapsedSeconds>=Data.policy.helpPauseSeconds||backtracks>=Data.policy.helpBacktracks);
  }
  function helpCopy(remainingFields){
    if(remainingFields===2)return Data.copy.help;
    if(remainingFields===1)return 'Осталось 1 поле. Нужна помощь? Перезвоним и продолжим с того же места';
    return '';
  }
  function createLedger(){const contacts=new Map(),tasks=new Map(),events=[];return{contact(key){if(contacts.has(key))return false;contacts.set(key,true);return true;},task(key,value){if(tasks.has(key))return{created:false,value:tasks.get(key)};tasks.set(key,value);return{created:true,value};},emit(name,payload={}){const e={name,...payload};events.push(e);return e;},events,reset(){contacts.clear();tasks.clear();events.length=0;}};}
  return Object.freeze({evaluate,baseline,rules,channels,shouldHelp,helpCopy,createLedger});
});
