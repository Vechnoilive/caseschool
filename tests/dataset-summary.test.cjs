const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('Агрегаты сайта совпадают с очищенной выборкой отчёта',()=>{
 const root=path.join(__dirname,'..'),context={window:{}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'dataset-summary.js'),'utf8'),context);
 const s=context.window.DatasetSummary;
 const report=JSON.parse(fs.readFileSync(path.join(root,'docs/dataset-report.json'),'utf8')).sources;
 const u=report['df_Uid_data_hack.csv'];
 for(const [display,source] of Object.entries({companyRows:'rows',uniqueCompanies:'unique_companies',duplicateIdRows:'duplicate_companies',analysisCompanies:'analysis_companies',excludedCompanies:'conflicting_companies',multiCompanyGroups:'multi_company_groups',companiesInGroups:'companies_in_multi_company_groups'}))assert.equal(s[display],u[source],display);
 assert.equal(s.paymentRows,report['df_Uid_payment_hack.csv'].rows);
 assert.equal(s.peopleRows,report['df_Fid_Uid_link_hack.csv'].rows);
 assert.equal(s.analysisCompanies,s.uniqueCompanies-s.excludedCompanies);
 assert.equal(Object.values(u.product_value_counts.CL_PRODUCT_LOA_MARK).reduce((a,b)=>a+b,0),s.analysisCompanies);
 assert.equal(u.multi_group_share_pct,Math.round(10000*s.companiesInGroups/s.analysisCompanies)/100);
});
