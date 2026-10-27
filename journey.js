(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.CaseJourney=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  // Synthetic drafts stay in this tab. Reopening a draft is not a new application.
  function createStore(clock=Date.now){
    const drafts=new Map();
    let sequence=0;
    return {
      ensure(key,initial={}){
        let draft=drafts.get(key);
        if(draft)return {draft,created:false};
        draft={id:'demo-application-'+(++sequence),routeStartedAt:clock(),startedAt:null,
          submittedAt:null,purpose:'',startDate:'',amount:'30000000',term:'9',
          backtracks:0,helpSeen:false,callbackRequested:false,...initial};
        drafts.set(key,draft);
        return {draft,created:true};
      },
      get(key){return drafts.get(key);},
      open(key,initial={}){
        const result=this.ensure(key,initial);
        const started=result.draft.startedAt===null;
        if(started)result.draft.startedAt=clock();
        return {...result,started};
      },
      submit(key){
        const draft=drafts.get(key);
        if(!draft||draft.startedAt===null||draft.submittedAt!==null)return false;
        draft.submittedAt=clock();
        return true;
      },
      reset(){drafts.clear();sequence=0;}
    };
  }
  return Object.freeze({createStore});
});
