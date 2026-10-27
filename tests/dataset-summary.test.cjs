const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('Агрегаты сайта совпадают с согласованной финальной версией',()=>{
 const root=path.join(__dirname,'..'),context={window:{}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'dataset-summary.js'),'utf8'),context);
 const s=context.window.DatasetSummary;
 const approved=require('../docs/dataset-release.json').summary;
 for(const [key,value] of Object.entries(approved))assert.equal(s[key],value,key);
 assert.equal(s.analysisCompanies,s.uniqueCompanies-s.excludedCompanies);
 assert.equal(s.companyRows,s.uniqueCompanies+s.duplicateIdRows);
 assert.ok(s.companiesInGroups<=s.analysisCompanies);
 for(const key of ['missingRoles','missingActivity','missingDates'])assert.equal(s[key],true);
});
