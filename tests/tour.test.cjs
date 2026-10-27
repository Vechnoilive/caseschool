const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../tour.js');
const card={width:344,height:330};
const overlaps=(a,b)=>a.left<b.left+b.width&&a.left+a.width>b.left&&a.top<b.top+b.height&&a.top+a.height>b.top;
function contained(box,viewport){assert.ok(box.left>=0&&box.top>=0);assert.ok(box.left+box.width<=viewport.width+.01);assert.ok(box.top+box.height<=viewport.height+.01);}
test('Подсказка располагается рядом с небольшим блоком на широком экране',()=>{
 const v={width:1363,height:936},r=T.place({left:100,right:350,top:200,bottom:260},card,v);
 assert.equal(r.side,'right');contained(r.card,v);assert.equal(overlaps(r.card,r.spotlight),false);
});
test('На мобильном экране есть место над или под выделенным элементом',()=>{
 const v={width:375,height:844};
 for(const [target,side] of [[{left:20,right:355,top:100,bottom:150},'bottom'],[{left:20,right:355,top:650,bottom:730},'top']]){
  const r=T.place(target,card,v);assert.equal(r.side,side);contained(r.card,v);contained(r.spotlight,v);assert.equal(overlaps(r.card,r.spotlight),false);
 }
});
test('Высокая форма не закрывает подсказку и видимую часть выделения',()=>{
 const v={width:320,height:568},r=T.place({left:12,right:308,top:18,bottom:480},card,v);
 assert.equal(r.side,'dock');contained(r.card,v);assert.ok(r.spotlight.height>0);assert.equal(overlaps(r.card,r.spotlight),false);
});
test('Если снизу окно скрывает цель, подсветка остаётся видимой под окном',()=>{
 const v={width:320,height:568},r=T.place({left:20,right:300,top:250,bottom:550},{width:288,height:400},v);
 assert.equal(r.side,'dock-top');assert.ok(r.spotlight.height>0);contained(r.card,v);contained(r.spotlight,v);assert.equal(overlaps(r.card,r.spotlight),false);
});
test('Окно и подсветка не выходят за границы при разных размерах и прокрутке',()=>{
 let cases=0;
 for(const width of [320,375,390,768,1363])for(const height of [360,568,844,936])for(const x of [-50,20,width/2])for(const y of [-100,20,height/2,height-60]){
  const v={width,height},r=T.place({left:x,right:x+180,top:y,bottom:y+80},card,v);
  contained(r.card,v);if(r.spotlight){contained(r.spotlight,v);assert.equal(overlaps(r.card,r.spotlight),false);}cases++;
 }
 assert.equal(cases,240);
});
test('При отсутствии видимого элемента остаётся доступное окно по центру',()=>{
 const v={width:375,height:568};
 for(const target of [null,{left:-500,right:-400,top:0,bottom:20}]){const r=T.place(target,card,v);assert.equal(r.spotlight,null);assert.equal(r.side,'center');contained(r.card,v);}
});
test('Недоступное хранилище не ломает приглашение; отметка завершения учитывается',()=>{
 assert.equal(T.hasSeen({getItem(){throw Error('disabled');}}),false);
 assert.equal(T.hasSeen({getItem:key=>key===T.storageKey?'1':null}),true);
 assert.equal(T.hasSeen({getItem:()=>null}),false);
});
