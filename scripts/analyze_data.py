from pathlib import Path
import pandas as pd,json
import sys
MISSING={'','nan','none','null','n/a','n/d'}
GROUP_MISSING=MISSING|{'0','-1','group_nan'}

def summarize(data):
 data=data.copy()
 data.columns=[x.strip().upper() for x in data.columns]
 for c in data:
  data[c]=data[c].fillna('').astype(str).str.strip()
 d={'rows':len(data),'columns':list(data.columns),'missing_pct':{c:round(float(data[c].isin(['','nan','None','NULL']).mean()*100),2) for c in data}}
 if 'GROUP_ID' in data:
  idcol='SYNTHETIC_U' if 'SYNTHETIC_U' in data else 'SYNTETIC_U'
  valid_id=~data[idcol].str.casefold().isin(MISSING)
  # Exclude the entire ID if any company attribute conflicts; never pick a group arbitrarily.
  conflicts=data.loc[valid_id].groupby(idcol).nunique(dropna=False).gt(1).any(axis=1)
  bad_ids=set(conflicts[conflicts].index)
  ambiguous=data.loc[valid_id].groupby(idcol)['GROUP_ID'].nunique()
  clean=data.loc[valid_id & ~data[idcol].isin(bad_ids)].drop_duplicates(idcol).copy()
  g=data['GROUP_ID'];valid_group=~clean['GROUP_ID'].str.casefold().isin(GROUP_MISSING)
  counts=clean.loc[valid_group].groupby('GROUP_ID')[idcol].nunique();multi=counts[counts>=2]
  grouped=clean['GROUP_ID'].isin(multi.index)
  d.update(unique_companies=int(data.loc[valid_id,idcol].nunique()),duplicate_companies=int(data.loc[valid_id,idcol].duplicated().sum()),missing_id_rows=int((~valid_id).sum()),ambiguous_group_companies=int(ambiguous.gt(1).sum()),conflicting_companies=len(bad_ids),analysis_companies=len(clean),group_ids=int(len(counts)),multi_company_groups=int(len(multi)),singleton_group_ids=int(counts.eq(1).sum()),companies_in_multi_company_groups=int(multi.sum()),group_size_median=float(multi.median()) if len(multi) else None,group_size_max=int(multi.max()) if len(multi) else None,group_sentinel_counts={v:int((g==v).sum()) for v in ['','nan','0','-1','group_NAN']})
  d['company_aggregate_scope']='Уникальные ID без конфликтующих атрибутов; пропуски продуктов не заменяются нулём. rows и missing_pct описывают исходные строки.'
  d['multi_group_share_pct']=round(d['companies_in_multi_company_groups']/len(clean)*100,2) if len(clean) else None
  d['product_value_counts']={c:clean[c].value_counts().to_dict() for c in clean if c.startswith('CL_PRODUCT') or c=='FACTORING_MARK'}
  ok=clean['MAINOKVED_CODE'].str.replace(',','.',regex=False);d['agriculture_companies']=int(ok.str.match(r'^0[1-3](\.|$)').sum());d['wholesale_companies']=int(ok.str.match(r'^46(\.|$)').sum());d['construction_wholesale_companies']=int(ok.str.match(r'^46\.73(\.|$)').sum())
  d['top_okved_sections']=ok.str.split('.').str[0].value_counts().head(10).to_dict()
  clients=clean['CL_TYPE'].eq('CLIENT')
  d['current_clients']=int(clients.sum());d['current_clients_in_multi_company_groups']=int((clients&grouped).sum())
  d['current_client_multi_group_share_pct']=round(d['current_clients_in_multi_company_groups']/d['current_clients']*100,2) if d['current_clients'] else None
  d['candidate_c1_groups']=int(clean.loc[grouped&clients,'GROUP_ID'].nunique())
 if 'PAY_AMT' in data:
  amt=pd.to_numeric(data['PAY_AMT'].str.replace(',','.',regex=False),errors='coerce');cnt=pd.to_numeric(data['PAY_CNT'],errors='coerce')
  d.update(unique_payers=int(data['PAYER'].nunique()),unique_beneficiaries=int(data['BENEFICIARY'].nunique()),amount_sum=float(amt.sum()),payment_count_sum=float(cnt.sum()),negative_amount_rows=int((amt<0).sum()),missing_amount_rows=int(amt.isna().sum()),self_payment_rows=int((data['PAYER']==data['BENEFICIARY']).sum()))
 if 'SYNTHETIC_F' in data or 'SYNTETIC_F' in data:
  fcol='SYNTHETIC_F' if 'SYNTHETIC_F' in data else 'SYNTETIC_F';ucol='SYNTHETIC_U' if 'SYNTHETIC_U' in data else 'SYNTETIC_U';deg=data.groupby(fcol)[ucol].nunique()
  d.update(unique_people=int(data[fcol].nunique()),unique_companies=int(data[ucol].nunique()),people_linked_to_multiple_companies=int((deg>=2).sum()),max_companies_per_person=int(deg.max()),duplicate_links=int(data[[fcol,ucol]].duplicated().sum()))
 return d

def main(root):
 report={'sources':{},'limitations':['Роль ЛПР и полномочия не представлены в таблицах связей. Общее физлицо не доказывает общий ЛПР.','NEGATIVEMARK по словарю означает наличие ключевого собственника; это не стоп-фактор контакта.','GROUP_ID с одним наблюдаемым юрлицом не доказывает самостоятельность компании. Группа в расчёте — не менее двух уникальных юрлиц.','Нет дат платежей, истории входов и показов: нельзя оценить сезонность, реакцию или частоту.','Нет целевой метки будущей продажи: нельзя подтвердить склонность к будущему отклику или измерить uplift.','Параметры трёх демонстрационных клиентов синтетические и заданы в шпаргалке.','Доли описывают только выгрузку, не всю базу банка и не рынок. Кандидаты С1 ещё не проверены на роли, согласия и общую потребность.']}
 for p in sorted(root.rglob('*.csv')):
  enc='utf-8' if 'hack' in p.name else 'cp1251'
  data=pd.read_csv(p,sep=';',encoding=enc,dtype=str,keep_default_na=False)
  if p.name in report['sources']:raise ValueError('Повтор имени источника: '+p.name)
  report['sources'][p.name]=summarize(data)
 Path('docs/dataset-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 sources=report['sources']
 required=['df_Uid_data_hack.csv','df_Uid_payment_hack.csv','df_Fid_Uid_link_hack.csv']
 if all(name in sources for name in required):
  u,p,f=(sources[name] for name in required)
  summary=dict(companyRows=u['rows'],uniqueCompanies=u['unique_companies'],duplicateIdRows=u['duplicate_companies'],analysisCompanies=u['analysis_companies'],excludedCompanies=u['conflicting_companies'],paymentRows=p['rows'],peopleRows=f['rows'],uniquePeople=f['unique_people'],multiCompanyGroups=u['multi_company_groups'],companiesInGroups=u['companies_in_multi_company_groups'],missingRoles=True,missingActivity=True,missingDates=True)
  Path('dataset-summary.js').write_text('window.DatasetSummary = Object.freeze('+json.dumps(summary,ensure_ascii=False,indent=2)+');\n')
 for name,v in sources.items():print(name,{k:x for k,x in v.items() if k not in ['columns','missing_pct','product_value_counts','top_okved_sections']})

if __name__=='__main__':main(Path(sys.argv[1] if len(sys.argv)>1 else 'raw-data'))
