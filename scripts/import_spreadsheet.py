import pandas as pd
from datetime import datetime
import requests

SU="https://pplpwdufxfioqyzmirwc.supabase.co"
SK="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHB3ZHVmeGZpb3F5em1pcndjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTU1NTk0NiwiZXhwIjoyMTAxMTMxOTQ2fQ.vndC3UJeXNVEKzwUtX6mZj73X7DXNmfoBH7Ht7wTuGo"

df=pd.read_excel("/Users/mishaeltamunotonyewilcox/Downloads/Resourcing Leads.xlsx",header=None)
df=df.iloc[3:].reset_index(drop=True)
df.columns=["sn","company","location","industry","years_est","deal_value","potential_talent","contact_name","job_title","decision_maker","linkedin","phone","email","touch_point","stage","last_date","objections","comments","next_action"]

IM={"financial services":"professional_services","retail":"retail","restaurant":"hospitality","real estate":"real_estate","technology":"other","healthcare":"healthcare","logistics":"logistics","construction":"blue_collar","marketing":"marketing","sales":"sales","consulting":"consulting","law":"law_firm","accounting":"accounting"}

def pc(v):
 if pd.isna(v) or v=="":return None
 s=str(v).replace("\u20a6","").replace("N","").replace(",","").strip()
 try:return float(s)
 except:return None

def pdte(v):
 if pd.isna(v) or v=="":return None
 s=str(v).strip()
 formats=["%Y-%m-%d %H:%M:%S","%a %B %d %Y","%a. %B %d, %Y","%a %B %d, %Y","%a. %B %d %Y","%A %B %d, %Y"]
 for f in formats:
  try:return datetime.strptime(s,f).strftime("%Y-%m-%d")
  except:pass
 s2=s.replace(".","").replace(",","").strip()
 for f in ("%a %B %d %Y","%A %B %d %Y"):
  try:return datetime.strptime(s2,f).strftime("%Y-%m-%d")
  except:pass
 print(f"  Could not parse date: {s}")
 return None

def mi(v):
 if pd.isna(v) or v=="":return "other"
 return IM.get(str(v).strip().lower(),"other")

H={"apikey":SK,"Authorization":f"Bearer {SK}","Content-Type":"application/json","Prefer":"return=representation"}
im=0;er=[]

for i,r in df.iterrows():
 try:
  cn=str(r["company"]).strip()
  if not cn or cn=="nan":continue
  dv=pc(r["deal_value"]);ms=round(dv/1.8,2) if dv else None
  in_=mi(r["industry"])
  ye=r["years_est"]
  try:ye=int(ye) if not pd.isna(ye) else None
  except:ye=None
  cp={"name":cn,"normalized_name":cn.lower().replace(" ",""),"industry":in_,"city":str(r["location"]).strip() if not pd.isna(r["location"]) else None,"years_established":ye,"monthly_salary":ms,"potential_talent":str(r["potential_talent"]).strip() if not pd.isna(r["potential_talent"]) else None,"touch_point":str(r["touch_point"]).strip() if not pd.isna(r["touch_point"]) else None}
  cp={k:v for k,v in cp.items() if v is not None}
  # Check if company already exists
  chk=requests.get(f"{SU}/rest/v1/larkspur_companies?name=eq.{cn}",headers=H)
  if chk.status_code==200 and len(chk.json())>0:
    cid=chk.json()[0]["id"]
  else:
    resp=requests.post(f"{SU}/rest/v1/larkspur_companies",headers=H,json=cp)
    if resp.status_code not in (200,201):er.append(f"Company {cn}: {resp.status_code} {resp.text}");continue
    cd=resp.json();cid=cd[0]["id"] if isinstance(cd,list) and len(cd)>0 else None
    if not cid:er.append(f"Company {cn}: no id");continue
  cname=str(r["contact_name"]).strip() if not pd.isna(r["contact_name"]) else None
  ctid=None
  if cname and cname!="nan":
   cotp={"company_id":cid,"name":cname,"role":str(r["job_title"]).strip() if not pd.isna(r["job_title"]) else None,"is_decision_maker":str(r["decision_maker"]).strip().upper()=="Y" if not pd.isna(r["decision_maker"]) else False,"linkedin_url":str(r["linkedin"]).strip() if not pd.isna(r["linkedin"]) else None,"phone":str(r["phone"]).strip() if not pd.isna(r["phone"]) else None,"email":str(r["email"]).strip() if not pd.isna(r["email"]) else None}
   cotp={k:v for k,v in cotp.items() if v is not None}
   cr=requests.post(f"{SU}/rest/v1/larkspur_contacts",headers=H,json=cotp)
   if cr.status_code not in (200,201):er.append(f"Contact for {cn}: {cr.status_code} {cr.text}")
   else:
    cd2=cr.json();ctid=cd2[0]["id"] if isinstance(cd2,list) and len(cd2)>0 else None
  stg=str(r["stage"]).strip().lower()
  vs=["prospect","contacted","replied","meeting","client","disqualified","unreachable"]
  if stg not in vs:stg="prospect"
  ld=pdte(r["last_date"])
  lp={"company_id":cid,"contact_id":ctid,"stage":stg,"source":"spreadsheet_import","next_follow_up_at":ld,"objections":str(r["objections"]).strip() if not pd.isna(r["objections"]) else None,"next_action":str(r["next_action"]).strip() if not pd.isna(r["next_action"]) else None,"notes":str(r["comments"]).strip() if not pd.isna(r["comments"]) else None}
  lp={k:v for k,v in lp.items() if v is not None}
  # Check if lead already exists for this company
  chk2=requests.get(f"{SU}/rest/v1/larkspur_leads?company_id=eq.{cid}",headers=H)
  if chk2.status_code==200 and len(chk2.json())>0:
    print(f"  Skipped (existing lead): {cn}")
    continue
  lr=requests.post(f"{SU}/rest/v1/larkspur_leads",headers=H,json=lp)
  if lr.status_code not in (200,201):er.append(f"Lead for {cn}: {lr.status_code} {lr.text}");continue
  im+=1;print(f"  Imported: {cn}")
 except Exception as e:er.append(f"Row {i}: {str(e)}")

print(f"\n=== Import complete: {im} leads imported ===")
if er:
 print(f"\n=== Errors ({len(er)}) ===")
 for e in er:print(f"  {e}")