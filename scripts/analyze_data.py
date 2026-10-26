from pathlib import Path
import pandas as pd,json
import sys
root=Path(sys.argv[1] if len(sys.argv)>1 else 'raw-data');report={'sources':{},'limitations':['Роль ЛПР и полномочия не представлены в таблицах связей. Общий физлицо не доказывает общий ЛПР.','Нет дат платежей, истории входов и показов: нельзя оценить сезонность, реакцию или частоту.','Нет целевой метки продаж: нельзя обучить склонность или измерить uplift.','Параметры трёх демонстрационных клиентов синтетические и заданы в шпаргалке.']}
for p in root.rglob('*.csv'):
 enc='utf-8' if 'hack' in p.name else 'cp1251'
 data=pd.read_csv(p,sep=';',encoding=enc,dtype=str,keep_default_na=False)
 data.columns=[x.strip().upper() for x in data.columns]
 d={'rows':len(data),'columns':list(data.columns),'missing_pct':{c:round(float(data[c].isin(['','nan','None','NULL']).mean()*100),2) for c in data}}
 if 'GROUP_ID' in data:
  idcol='SYNTHETIC_U' if 'SYNTHETIC_U' in data else 'SYNTETIC_U'
  ambiguous=data.groupby(idcol)['GROUP_ID'].nunique();ambiguous_ids=set(ambiguous[ambiguous>1].index);d['ambiguous_group_companies']=len(ambiguous_ids);g=data['GROUP_ID'].str.strip();valid=~g.isin(['','nan','None','NULL','0','-1','group_NAN']);counts=data.loc[valid & ~data[idcol].isin(ambiguous_ids)].groupby('GROUP_ID')[idcol].nunique();multi=counts[counts>=2]
  d.update(unique_companies=int(data[idcol].nunique()),duplicate_companies=int(data[idcol].duplicated().sum()),group_ids=int(len(counts)),multi_company_groups=int(len(multi)),companies_in_multi_company_groups=int(multi.sum()),group_size_median=float(multi.median()),group_size_max=int(multi.max()),group_sentinel_counts={v:int((g==v).sum()) for v in ['','nan','0','-1','group_NAN']})
  d['multi_group_share_pct']=round(d['companies_in_multi_company_groups']/d['unique_companies']*100,2)
  d['product_value_counts']={c:data[c].value_counts().to_dict() for c in data if c.startswith('CL_PRODUCT') or c=='FACTORING_MARK'}
  ok=data['MAINOKVED_CODE'].str.replace(',','.',regex=False);d['agriculture_companies']=int(ok.str.match(r'^0[1-3](\.|$)').sum());d['wholesale_companies']=int(ok.str.match(r'^46(\.|$)').sum())
  d['top_okved_sections']=ok.str.split('.').str[0].value_counts().head(10).to_dict()
 if 'PAY_AMT' in data:
  amt=pd.to_numeric(data['PAY_AMT'].str.replace(',','.',regex=False),errors='coerce');cnt=pd.to_numeric(data['PAY_CNT'],errors='coerce')
  d.update(unique_payers=int(data['PAYER'].nunique()),unique_beneficiaries=int(data['BENEFICIARY'].nunique()),amount_sum=float(amt.sum()),payment_count_sum=float(cnt.sum()),negative_amount_rows=int((amt<0).sum()),missing_amount_rows=int(amt.isna().sum()),self_payment_rows=int((data['PAYER']==data['BENEFICIARY']).sum()))
 if 'SYNTHETIC_F' in data or 'SYNTETIC_F' in data:
  fcol='SYNTHETIC_F' if 'SYNTHETIC_F' in data else 'SYNTETIC_F';ucol='SYNTHETIC_U' if 'SYNTHETIC_U' in data else 'SYNTETIC_U';deg=data.groupby(fcol)[ucol].nunique()
  d.update(unique_people=int(data[fcol].nunique()),unique_companies=int(data[ucol].nunique()),people_linked_to_multiple_companies=int((deg>=2).sum()),max_companies_per_person=int(deg.max()),duplicate_links=int(data[[fcol,ucol]].duplicated().sum()))
 report['sources'][p.name]=d
Path('docs/dataset-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
for name,v in report['sources'].items():print(name,{k:x for k,x in v.items() if k not in ['columns','missing_pct','product_value_counts','top_okved_sections']})
