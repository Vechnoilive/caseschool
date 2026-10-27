const fs=require('node:fs');
const assert=require('node:assert/strict');
const file=process.argv[2]||'docs/tech1/events-demo.json';
const result=JSON.parse(fs.readFileSync(file,'utf8'));
assert.equal(result.prototype,true);
assert.equal(result.synthetic,true);
const events=result.events;
const select=name=>events.filter(e=>e.name===name);
const started=select('application_started');
const submitted=select('application_submitted');
assert.ok(started.length>0,'No application starts');
assert.equal(new Set(started.map(e=>e.application_id)).size,started.length,'Duplicate starts');
assert.equal(new Set(submitted.map(e=>e.application_id)).size,submitted.length,'Duplicate submissions');
for(const event of events){
  assert.ok(Number.isFinite(Date.parse(event.at)),'Invalid timestamp');
  assert.ok(event.session_id&&event.company_id,'Missing event identity');
  if(/^(journey_|application_|help_|callback_|form_backtrack)/.test(event.name))assert.ok(event.application_id,'Missing application identity');
  assert.ok(!('purpose' in event)&&!('startDate' in event)&&!('value' in event),'Raw form value exported');
}
for(const end of submitted){
  const start=started.find(e=>e.application_id===end.application_id);
  assert.ok(start,'Submission without start');
  assert.equal(end.duration_ms,Date.parse(end.at)-Date.parse(start.at));
  assert.equal(end.helpSeen,select('help_shown').some(e=>e.application_id===end.application_id));
  assert.equal(end.callback,select('callback_requested').some(e=>e.application_id===end.application_id));
}
assert.equal(select('help_shown').length,new Set(select('help_shown').map(e=>e.session_id)).size,'Repeated help in a tab session');
assert.equal(select('callback_requested').length,new Set(select('callback_requested').map(e=>e.application_id)).size,'Duplicate callback requests');
console.log(`Synthetic UI trace: ${started.length} unique start(s), ${select('application_resumed').length} resume(s), ${submitted.length} submission(s), ${select('help_shown').length} help display(s). Identity and durations verified. This is not a business-effect measurement.`);
