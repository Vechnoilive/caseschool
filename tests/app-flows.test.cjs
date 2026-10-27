const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

// Run the real application handlers with a small DOM substitute; browser QA
// separately checks layout and native form controls.
function app(){
 const elements=new Map(),handlers=new Map();
 const element=id=>{
  if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',open:false,
   classList:{toggle(){}},setAttribute(){},removeAttribute(){},
   addEventListener(type,fn){handlers.set(id+':'+type,fn);},
   showModal(){this.open=true;},close(){this.open=false;},querySelectorAll(){return [];}});
  return elements.get(id);
 };
 const document={getElementById:element,querySelectorAll:()=>[],hidden:false,
  addEventListener(type,fn){handlers.set('document:'+type,fn);}};
 const window={CaseData:require('../data.js'),CaseRules:require('../rules.js'),
  CaseJourney:require('../journey.js'),CaseTour:{create:()=>({offer(){}})}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../dataset-summary.js'),'utf8'),{window});
 vm.runInNewContext(fs.readFileSync(require.resolve('../app.js'),'utf8'),{
  window,document,Intl,Date,Map,Set,sessionStorage:{getItem:()=>null},
  setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){}
 });
 return {
  html:id=>element(id).innerHTML,
  click(dataset){const button={dataset,closest:s=>s==='button'?button:null};handlers.get('document:click')({target:button});},
  role(value){handlers.get('profile-form:change')({target:{name:'role',value}});},
  submit(id,fields){handlers.get('flow-dialog:submit')({preventDefault(){},target:{id,elements:Object.fromEntries(Object.entries(fields).map(([k,value])=>[k,{value}]))}});},
  field(name,value){handlers.get('flow-dialog:input')({target:{name,value,closest:()=>true}});}
 };
}
const amount=html=>html.match(/id="loan-amount"[^>]*value="([^"]*)"/)[1];
const term=html=>html.match(/id="loan-term"[^>]*value="([^"]*)"/)[1];

test('Клиент 1: в «Было» заголовок по юрлицу и пустой калькулятор',()=>{
 const a=app();a.click({mode:'before'});a.click({action:'baseline-offer'});
 const html=a.html('dialog-content');
 assert.match(html,/<h2 id="dialog-title">Кредит по каждому юрлицу<\/h2>/);
 assert.doesNotMatch(html,/Расчёт кредитного лимита для группы/);
 assert.equal(amount(html),'');assert.equal(term(html),'');
});

test('Черновики «Было» и «Стало» независимы и сохраняют собственные поля',()=>{
 const a=app();a.click({preset:'c2'});a.click({action:'open-offer'});
 assert.equal(amount(a.html('dialog-content')),'30000000');
 a.submit('calculator-form',{amount:'42000000',term:'12'});
 a.field('purpose','season');a.field('startDate','2026-11-03');
 a.click({action:'close-dialog'});a.click({mode:'before'});a.click({action:'baseline-offer'});
 let html=a.html('dialog-content');
 assert.match(html,/<h2 id="dialog-title">Оборотный кредит для бизнеса<\/h2>/);
 assert.doesNotMatch(html,/Черновик заявки сохранён|под сезон: посевная/);
 assert.equal(amount(html),'');assert.equal(term(html),'');
 a.submit('calculator-form',{amount:'1000000',term:'3'});a.field('purpose','working');
 a.click({action:'close-dialog'});a.click({mode:'after'});a.click({action:'open-offer'});
 html=a.html('dialog-content');assert.equal(amount(html),'42000000');assert.equal(term(html),'12');
 a.submit('calculator-form',{amount:'42000000',term:'12'});
 html=a.html('dialog-content');assert.match(html,/value="season" selected/);assert.match(html,/value="2026-11-03"/);
 a.click({action:'close-dialog'});a.click({mode:'before'});a.click({action:'baseline-offer'});
 html=a.html('dialog-content');assert.equal(amount(html),'1000000');assert.equal(term(html),'3');
});

test('Клиент 3: операционист видит передачу и не открывает форму',()=>{
 const a=app();a.click({preset:'c3'});a.role('operator');
 const html=a.html('customer-preview');
 assert.match(a.html('decision-summary'),/Передача: Собственник/);
 assert.match(html,/Передайте начатую заявку руководителю/);
 assert.match(html,/Отправить руководителю/);
 assert.doesNotMatch(html,/Напоминание в тот же день|Открыть начатую заявку|Осталось 2 поля/);
 a.click({action:'open-offer'});
 assert.match(a.html('dialog-content'),/Отправлено собственнику/);
 assert.doesNotMatch(a.html('dialog-content'),/id="application-form"/);
});

test('Вкладка «Данные» показывает согласованную финальную версию',()=>{
 const a=app();a.click({page:'data'});
 const text=a.html('data-page').replace(/[\s\u00a0\u202f]/g,'');
 for(const number of ['428696','2368387','208154'])assert.ok(text.includes(number));
 for(const number of ['85514','1380585','12514'])assert.ok(!text.includes(number));
});
