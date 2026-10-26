(function(root,factory){ const value=factory(); if(typeof module==='object'&&module.exports) module.exports=value; else root.CaseData=value; })(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const copy = Object.freeze({
    groupOwner: 'Планируете закупки к строительному сезону? Обсудим финансирование вашей группы: один расчёт вместо пяти заявок по компаниям. Запросить расчёт',
    groupCfo: 'До пика закупок 6 недель. Сумму и срок финансирования для всей группы посчитаем одним расчётом вместо пяти заявок по компаниям. Запросить расчёт',
    groupOperator: 'Финансирование группы к строительному сезону оформляет руководитель. Отправьте ему предложение — расчёт придёт в «Альфа-Босс». Отправить руководителю',
    seasonSubject: 'До посевной 6 недель: сумма на закупки уже рассчитана',
    seasonBody: 'Перед сезоном компаниям часто нужны оборотные средства. Рассчитали по оборотам вашего счёта: сумма и срок уже в калькуляторе. Проверьте и отправьте заявку',
    help: 'Осталось 2 поля — остальное мы заполнили по данным вашей компании. Нужна помощь? Перезвоним и продолжим с того же места',
    generic: 'Оборотный кредит для вашей компании. Рассчитайте сумму и срок в калькуляторе',
    beforeGroup: 'Кредит для бизнеса. Подробнее',
    beforeSeason: 'Оборотный кредит для бизнеса. Подробнее'
  });
  const options = Object.freeze({
    industry:[['wholesale','Опт стройматериалов'],['agro','АПК'],['other','Другая']],
    role:[['owner','Собственник'],['cfo','Финдиректор'],['operator','Операционист без права оформить кредит'],['unknown','Неизвестна']],
    structure:[['confirmed','Группа, связь подтверждена'],['unconfirmed','Группа, связь не подтверждена'],['single','Самостоятельная']],
    activity:[['high','Высокая'],['low','Низкая']]
  });
  const presets = Object.freeze([
    {id:'c1',name:'Клиент 1',title:'Холдинг · стройматериалы',segment:'С1',hypotheses:['Г1','Г3'],profile:{industry:'wholesale',role:'owner',structure:'confirmed',activity:'high'},note:'5 юрлиц · закупки в марте–апреле · до пика 6 недель'},
    {id:'c2',name:'Клиент 2',title:'АПК · перед посевной',segment:'С2',hypotheses:['Г2'],profile:{industry:'agro',role:'cfo',structure:'single',activity:'high'},note:'До посевной 6 недель · 30 млн ₽ на 9 месяцев, условно'},
    {id:'c3',name:'Клиент 3',title:'Начатая заявка',segment:'С3',hypotheses:['Г4'],profile:{industry:'other',role:'cfo',structure:'single',activity:'high'},note:'Финдиректор с правом подписи · осталось заполнить 2 поля'}
  ]);
  const defaults=Object.freeze({consent:true,refused:false,stopFactor:false,weeklyContacts:0,groupTopicDaysAgo:30,deliveredWithoutReaction:0,lastUnansweredDaysAgo:0,kmCapacity:true,recipientVerified:true,signingRight:false,commonNeed:true,history:true,needSignal:true,seasonWeeks:6,propensity:0.12,riskAdjustedProfit:12000,contactCost:100});
  const policy=Object.freeze({weeklyLimit:2,groupCooldownDays:7,groupMinIntervalDays:14,unansweredLimit:2,pauseDays:30,helpPauseSeconds:45,helpBacktracks:3,groupFrequency:'Одно групповое предложение на ЛПР за 2–4 недели',seasonFrequency:'Письмо и одно напоминание в окне до пика; вне окна не пишем',genericFrequency:'Не более 2 контактов в неделю на человека',helpFrequency:'Помощь не чаще 1 раза за сессию; подсказки не тратят лимит рассылок'});
  return Object.freeze({copy,options,presets,defaults,policy,prototypeLabel:'Прототип команды «Рэд флаг» · данные условные'});
});
