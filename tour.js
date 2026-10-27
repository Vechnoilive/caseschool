(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.CaseTour=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const storageKey='redflag-guided-tour-v1';
  const steps=Object.freeze([
    {id:'welcome',target:null,title:'Покажем, куда нажимать',text:'Вы на стенде персонализации банка. Здесь можно менять клиента и смотреть, какое предложение он получит. За пару минут пройдём 10 коротких подсказок на живых примерах.',next:'Начать обучение'},
    {id:'clients',target:'#presets',title:'Выберите клиента',text:'Клиент 1 — холдинг. Клиент 2 — компания АПК перед посевной. Клиент 3 — начатая заявка. Кнопки заполняют профиль: не нужно выбирать всё вручную.'},
    {id:'profile',target:'#profile-form',title:'Настройте профиль',text:'Четыре поля: отрасль, роль, группа компаний и активность. Измените любое — предложение справа пересчитается. Так можно проверить, как контекст влияет на результат.'},
    {id:'role',target:'#customer-preview [data-action="open-offer"]',title:'Роль меняет действие',text:'Выбрали операциониста: он передаёт интерес руководителю. Собственнику здесь доступен запрос расчёта для группы. Сотрудник без полномочий сам кредит не оформляет.'},
    {id:'comparison',target:'.mode-switch',title:'«Было» и «Стало»',text:'Сейчас показано условное «Было»: пять одинаковых баннеров по компаниям. «Стало» возвращает одно предложение для группы с учётом роли и потребности.'},
    {id:'channels',target:'#channel-tabs',title:'Канал для клиента',text:'Для Клиента 2 первым идёт e-mail перед посевной. Вкладки показывают письмо, интернет-банк и задачу менеджеру. При низкой активности менеджер становится первым.'},
    {id:'explain',target:'#why-decision [data-action="explain"]',title:'Почему так',text:'Кнопка открывает правила, по которым выбраны продукт, адресат и канал. Коды рядом обозначают эти правила. Над ними указана частота контактов.'},
    {id:'limits',target:'[data-tour-context="weeklyContacts"]',title:'Лимиты контактов',text:'В «Условиях» задаются согласие, частота и ёмкость менеджера. Сейчас поставили 2 контакта за неделю: отправка заблокирована. Причина показана в карточке предложения.'},
    {id:'calculator',target:'#calculator-form .calculator-grid',title:'Путь после клика',text:'Из письма Клиента 2 открывается калькулятор с той же суммой и сроком: 30 млн ₽ на 9 месяцев, условно. Далее — заявка.'},
    {id:'help',target:'#help-slot',title:'Помощь в заявке',text:'После паузы 45 секунд или 3 возвратов Клиенту 3 предлагается помощь. Подсказка закрывается, позволяет запросить звонок и появляется раз за сессию.'},
    {id:'sections',target:'.main-nav',title:'Теперь можно исследовать самому',text:'«Данные» показывает источники и ограничения выгрузки, «О решении» — правила и гипотезы. Обучение можно повторить кнопкой «Как пользоваться». Сейчас вернём ваш профиль и черновик.',next:'Готово, попробую сам'}
  ].map(Object.freeze));
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  function place(target,card,viewport){
    const margin=Math.min(16,viewport.width/12),gap=18;
    const width=Math.min(card.width,viewport.width-2*margin),height=Math.min(card.height,viewport.height-2*margin);
    const centered={left:(viewport.width-width)/2,top:(viewport.height-height)/2,width,height};
    if(!target)return {card:centered,spotlight:null,side:'center'};
    const left=clamp(target.left-7,6,viewport.width-6),right=clamp(target.right+7,6,viewport.width-6);
    const top=clamp(target.top-7,6,viewport.height-6),bottom=clamp(target.bottom+7,6,viewport.height-6);
    if(right<=left||bottom<=top)return {card:centered,spotlight:null,side:'center'};
    let spotlight={left,top,right,bottom,width:right-left,height:bottom-top};
    const x=clamp((left+right-width)/2,margin,viewport.width-width-margin);
    const y=clamp((top+bottom-height)/2,margin,viewport.height-height-margin);
    let box,side;
    if(right+gap+width<=viewport.width-margin){box={left:right+gap,top:y};side='right';}
    else if(left-gap-width>=margin){box={left:left-gap-width,top:y};side='left';}
    else if(bottom+gap+height<=viewport.height-margin){box={left:x,top:bottom+gap};side='bottom';}
    else if(top-gap-height>=margin){box={left:x,top:top-gap-height};side='top';}
    else{
      box={left:x,top:viewport.height-height-margin};side='dock';
      const visibleBottom=Math.min(bottom,box.top-gap);
      spotlight=visibleBottom>top?{...spotlight,bottom:visibleBottom,height:visibleBottom-top}:null;
      const visibleTop=Math.max(top,margin+height+gap);
      if(bottom-visibleTop>(spotlight?.height||0)){
        box={left:x,top:margin};side='dock-top';
        spotlight={left,top:visibleTop,right,bottom,width:right-left,height:bottom-visibleTop};
      }
    }
    return {card:{...box,width,height},spotlight,side};
  }
  function hasSeen(storage){try{return storage.getItem(storageKey)==='1';}catch{return false;}}
  function create(adapter){
    const root=document.getElementById('tour-dialog'),card=root.querySelector('.tour-card');
    const shade=root.querySelector('.tour-shade'),spot=root.querySelector('.tour-spotlight');
    const next=root.querySelector('[data-tour-action="next"]'),back=root.querySelector('[data-tour-action="back"]');
    const parts=Array.from({length:4},()=>{const el=document.createElement('div');shade.append(el);return el;});
    let active=false,index=0,target=null,frame=0,previousFocus=null,previousStyle=null,dismissed=false;
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;
    function rectangle(el,box){
      Object.assign(el.style,{left:box.left+'px',top:box.top+'px',width:Math.max(0,box.width)+'px',height:Math.max(0,box.height)+'px'});
    }
    function measure(){
      frame=0;if(!active)return;
      const viewport={width:window.innerWidth,height:window.innerHeight};
      card.style.width=Math.min(344,viewport.width-32)+'px';
      const rect=target?.isConnected?target.getBoundingClientRect():null;
      const layout=place(rect?.width&&rect?.height?rect:null,{width:344,height:card.offsetHeight},viewport);
      Object.assign(card.style,{left:layout.card.left+'px',top:layout.card.top+'px',width:layout.card.width+'px'});card.dataset.side=layout.side;
      const s=layout.spotlight;spot.hidden=!s;
      if(s){
        rectangle(spot,s);
        rectangle(parts[0],{left:0,top:0,width:viewport.width,height:s.top});
        rectangle(parts[1],{left:0,top:s.top,width:s.left,height:s.height});
        rectangle(parts[2],{left:s.right,top:s.top,width:viewport.width-s.right,height:s.height});
        rectangle(parts[3],{left:0,top:s.bottom,width:viewport.width,height:viewport.height-s.bottom});
        card.style.setProperty('--tour-pointer-x',clamp((s.left+s.right)/2-layout.card.left,24,layout.card.width-24)+'px');
        card.style.setProperty('--tour-pointer-y',clamp((s.top+s.bottom)/2-layout.card.top,26,layout.card.height-26)+'px');
      }else{
        rectangle(parts[0],{left:0,top:0,width:viewport.width,height:viewport.height});
        parts.slice(1).forEach(p=>rectangle(p,{left:0,top:0,width:0,height:0}));
      }
    }
    function schedule(){if(active&&!frame)frame=requestAnimationFrame(measure);}
    function showStep(n){
      if(!active)return;
      index=clamp(n,0,steps.length-1);const step=steps[index];
      observer?.disconnect();adapter.prepare(step.id);
      root.querySelector('#tour-step').textContent=index?`Шаг ${index} из ${steps.length-1}`:'Знакомство с прототипом';
      root.querySelector('#tour-title').textContent=step.title;
      root.querySelector('#tour-text').textContent=step.text;
      root.querySelector('#tour-progress-fill').style.width=(100*index/(steps.length-1))+'%';
      next.textContent=step.next||'Далее →';back.hidden=index===0;
      root.querySelector('.tour-skip').textContent=index===0?'Разобраться самому':'Пропустить обучение';
      // A demonstration form may have opened another modal. Keep the coachmark on top.
      if(root.open)root.close();root.showModal();
      card.scrollTop=0;target=step.target?document.querySelector(step.target):null;
      if(target){
        target.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
        // Reserve space below wide targets when a side placement is impossible.
        const rect=target.getBoundingClientRect(),h=card.offsetHeight;
        const noSide=rect.left<card.offsetWidth+40&&window.innerWidth-rect.right<card.offsetWidth+40;
        if(noSide&&rect.bottom+h+40>window.innerHeight&&rect.top<h+40){
          target.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'});
          let parent=target.parentElement;
          while(parent&&parent!==document.body){
            if(parent.scrollHeight>parent.clientHeight&&/auto|scroll/.test(getComputedStyle(parent).overflowY)){parent.scrollTop=Math.max(0,parent.scrollTop-18);break;}
            parent=parent.parentElement;
          }
          if(!parent||parent===document.body)window.scrollBy({top:-18,behavior:'instant'});
        }
        const current=target.getBoundingClientRect();
        if(noSide&&current.top<h+41&&window.innerHeight-current.bottom<h+41&&current.height+h+50<window.innerHeight){
          // At the end of a modal the target cannot scroll farther up. Leave room above it instead.
          const desiredTop=h+41;let parent=target.parentElement;
          while(parent&&parent!==document.body){
            if(parent.scrollHeight>parent.clientHeight&&/auto|scroll/.test(getComputedStyle(parent).overflowY)){parent.scrollTop+=current.top-desiredTop;break;}
            parent=parent.parentElement;
          }
          if(!parent||parent===document.body)window.scrollBy({top:current.top-desiredTop,behavior:'instant'});
        }
      }
      measure();observer?.observe(card);if(target)observer?.observe(target);
      next.focus({preventScroll:true});
    }
    function start(){
      if(active)return;
      previousFocus=document.activeElement;adapter.begin();active=true;
      previousStyle={overflow:document.body.style.overflow,paddingRight:document.body.style.paddingRight};
      const scrollbar=window.innerWidth-document.documentElement.clientWidth;
      if(scrollbar)document.body.style.paddingRight=(parseFloat(getComputedStyle(document.body).paddingRight)+scrollbar)+'px';
      document.body.style.overflow='hidden';
      window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);
      showStep(0);
    }
    function finish(){
      if(!active)return;
      active=false;dismissed=true;observer?.disconnect();cancelAnimationFrame(frame);frame=0;
      window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);
      if(root.open)root.close();
      Object.assign(document.body.style,previousStyle);
      try{localStorage.setItem(storageKey,'1');}catch{}
      const restored=adapter.end();
      const focus=restored||(previousFocus?.isConnected?previousFocus:document.querySelector('[data-action="start-tour"]'));
      focus?.focus({preventScroll:true});
    }
    root.addEventListener('click',event=>{
      const action=event.target.closest('[data-tour-action]')?.dataset.tourAction;
      if(action==='next'){if(index===steps.length-1)finish();else showStep(index+1);}
      if(action==='back')showStep(index-1);
      if(action==='close')finish();
    });
    root.addEventListener('cancel',event=>{event.preventDefault();event.stopPropagation();finish();});
    root.addEventListener('keydown',event=>{
      if(!active)return;
      if(event.key==='Tab'){
        const buttons=Array.from(card.querySelectorAll('button')).filter(b=>!b.hidden&&!b.disabled);
        const first=buttons[0],last=buttons[buttons.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
      if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
        event.preventDefault();event.stopPropagation();if(event.repeat)return;
        if(event.key==='ArrowLeft')showStep(index-1);else if(index===steps.length-1)finish();else showStep(index+1);
      }
    });
    return Object.freeze({start,offer(){let seen=false;try{seen=hasSeen(localStorage);}catch{}if(!dismissed&&!seen)start();}});
  }
  return Object.freeze({steps,place,hasSeen,storageKey,create});
});
