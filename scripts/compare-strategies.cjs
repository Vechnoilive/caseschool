const fs=require('node:fs');
const D=require('../data.js'),R=require('../rules.js');
const profile=i=>({...D.presets[i].profile});
const presetTable=new Map(D.presets.map(p=>[JSON.stringify(p.profile),R.evaluate(p.profile,{journey:p.id==='c3'?'application':undefined})]));
function lookup(p){return presetTable.get(JSON.stringify(p))||{group:false,channelIds:['banner'],action:'application',blocked:false,fullText:D.copy.generic};}
function sectorOnly(p){return{group:false,channelIds:p.industry==='agro'?['email','banner','manager']:['banner','email','manager'],action:'application',blocked:false,fullText:p.industry==='agro'?D.copy.seasonBody:D.copy.generic};}
const cases=[
 ['Клиент 1: группа',profile(0),{},s=>s.group===true],
 ['Клиент 2: письмо',profile(1),{},s=>s.channelIds[0]==='email'&&s.fullText===D.copy.seasonBody],
 ['Операционист', {...profile(0),role:'operator'},{},s=>s.action==='forward'],
 ['Нет связи группы',{...profile(0),structure:'unconfirmed'},{},s=>!s.group],
 ['Неизвестная роль',{...profile(0),role:'unknown'},{},s=>s.action==='forward'&&!s.group],
 ['Низкая активность',{...profile(1),activity:'low'},{},s=>s.channelIds[0]==='manager'],
 ['Нет согласия',profile(0),{consent:false},s=>s.blocked],
 ['Лимит',profile(0),{weeklyContacts:2},s=>s.blocked],
 ['Два без реакции',profile(1),{deliveredWithoutReaction:2},s=>s.blocked],
 ['Нет ёмкости КМ',{...profile(1),activity:'low'},{kmCapacity:false},s=>s.blocked],
 ['Нулевая ценность',profile(0),{propensity:0},s=>s.blocked],
 ['Нет истории',profile(1),{history:false},s=>s.fullText===D.copy.generic],
 ['Вне окна',profile(1),{seasonWeeks:12},s=>s.blocked],
 ['Нет подтверждённого адресата',{...profile(0),role:'operator'},{recipientVerified:false},s=>s.action==='clarify']
];
const strategies=[['Готовые экраны по 3 пресетам',lookup],['Только отраслевая сегментация',sectorOnly],['Контекст и таблица правил',R.evaluate]];
const report={scope:'Покрытие 14 приёмочных сценариев ТЗ, а не качество ML и не A/B-эффект',strategies:strategies.map(([name,fn])=>{const results=cases.map(([label,p,c,accept])=>({case:label,passed:!!accept(fn(p,c))}));return{name,passed:results.filter(r=>r.passed).length,total:results.length,results};})};
fs.writeFileSync('docs/strategy-comparison.json',JSON.stringify(report,null,2));for(const x of report.strategies)console.log(x.name+': '+x.passed+'/'+x.total);
if(report.strategies.at(-1).passed!==cases.length)process.exitCode=1;
