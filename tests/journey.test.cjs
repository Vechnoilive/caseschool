const test=require('node:test');
const assert=require('node:assert/strict');
const J=require('../journey.js');

test('Повторное открытие сохраняет ID, поля и первое время начала',()=>{
  let now=1000;const store=J.createStore(()=>now);
  const first=store.open('c3');
  assert.equal(first.started,true);
  first.draft.purpose='working';first.draft.startDate='2026-11-03';
  now=9000;
  const resumed=store.open('c3');
  assert.equal(resumed.started,false);
  assert.equal(resumed.draft.id,first.draft.id);
  assert.equal(resumed.draft.startedAt,1000);
  assert.equal(resumed.draft.purpose,'working');
  assert.equal(resumed.draft.startDate,'2026-11-03');
});
test('Маршрут и начало формы имеют отдельные отметки времени',()=>{
  let now=100;const store=J.createStore(()=>now);
  store.ensure('c2');now=500;
  const {draft}=store.open('c2');
  assert.equal(draft.routeStartedAt,100);
  assert.equal(draft.startedAt,500);
});
test('Показ помощи и звонок относятся к своему черновику',()=>{
  const store=J.createStore();
  const a=store.open('c2').draft;a.helpSeen=true;a.callbackRequested=true;
  const b=store.open('c3').draft;
  assert.notEqual(a.id,b.id);
  assert.equal(b.helpSeen,false);
  assert.equal(b.callbackRequested,false);
});
test('Возвраты и запрос звонка сохраняются при продолжении',()=>{
  const store=J.createStore();const {draft}=store.open('c3');
  draft.backtracks=3;draft.callbackRequested=true;
  const resumed=store.open('c3').draft;
  assert.equal(resumed.backtracks,3);
  assert.equal(resumed.callbackRequested,true);
});
test('Завершение учитывается один раз, длительность от первого начала',()=>{
  let now=0;const store=J.createStore(()=>now);
  store.open('c3');now=12000;
  assert.equal(store.submit('c3'),true);
  now=15000;assert.equal(store.submit('c3'),false);
  assert.equal(store.get('c3').submittedAt-store.get('c3').startedAt,12000);
});
test('Обучение использует отдельное хранилище черновиков',()=>{
  const live=J.createStore(),training=J.createStore();
  live.open('c3').draft.purpose='working';
  training.open('c3').draft.helpSeen=true;
  assert.equal(live.get('c3').helpSeen,false);
  assert.equal(live.get('c3').purpose,'working');
});
