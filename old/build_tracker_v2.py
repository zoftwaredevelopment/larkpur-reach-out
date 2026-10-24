import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

wb = openpyxl.Workbook()
hdr_font = Font(name='Calibri', bold=True, color='FFFFFF', size=11)
hdr_fill = PatternFill(start_color='1F4E79', end_color='1F4E79', fill_type='solid')
hdr_align = Alignment(horizontal='center', vertical='center', wrap_text=True)
thin_border = Border(left=Side('thin', color='B0B0B0'), right=Side('thin', color='B0B0B0'),
                     top=Side('thin', color='B0B0B0'), bottom=Side('thin', color='B0B0B0'))

def style_header(ws, ncols, row=1):
    for c in range(1, ncols + 1):
        cell = ws.cell(row=row, column=c)
        cell.font = hdr_font
        cell.fill = hdr_fill
        cell.alignment = hdr_align
        cell.border = thin_border

ws1 = wb.active
ws1.title = "Master Tracker"

headers = ['#', 'Company', 'Contact Name', 'Role', 'Industry', 'City/State',
           'WhatsApp No', 'Source', 'Date Added', 'Stage', 'WhatsApp Sent',
           'Date WhatsApp Sent', 'Reply?', 'Reply Date', 'Reply Content',
           'Qualify?', 'Next Action', 'Next Follow-up Date', 'Status', 'Notes']

# Define all 100 prospects
prospects = []
# 15 Hospitality & Events (15)
for c in ['Sunshine Beach Resort','La Campagne Resort','The Bayou Restaurant','Caribbean Bar & Grill','Nile Restaurant Group','Lakeview Events Centre','Harmony Wedding Planners','Skyline Club','Blues Kitchen','Gloria Catering Co.','Rex Cinema Lounge','Tropicana Club','Royal Palms Event Venue','Mango Bar & Grill','Nairobi Restaurant']:
    prospects.append((c, 'TBD', 'Owner/MD', 'Hospitality & Events', 'Lagos'))
# 15 Retail & Fashion (15)
for c in ['ShopRite Fashion Outlet','Fashion Street Nigeria','The Clothing Depot','Big Bazaar Boutique','Style Hub Nigeria','Commode Store','Urban Outfitters','Next Level Fashion','Market Town Retail','Glamour Clothing','Supermarket Warehouse','Elegance Menswear','Brilliant Superstore','Corner Store Express','Prestige Boutique']:
    prospects.append((c, 'TBD', 'Proprietor', 'Retail & Fashion', 'Lagos'))
# 10 Logistics & Supply Chain (10)
for c in ['FastFreight Nigeria','Cargo Wing Solutions','TransLogistics Limited','Dash Express Trucking','Global Cargo Nigeria','Bridge Logistics Co.','Swift Move Transport','Apex Freight Services','Road Runner Transport','Mega Cargo Hub']:
    prospects.append((c, 'TBD', 'MD', 'Logistics & Supply Chain', 'Lagos'))
# 10 E-commerce & Online Stores (10)
for c in ['ShopNexus Africa','Vogue Online Store','Nikeshop Hub','Cheap Market Online','GreenGrocer Online','Sofia Store Online','StyleStore Africa','ERPEmpire','Flea Market Online','Laptop Central Africa']:
    prospects.append((c, 'TBD', 'CEO', 'E-commerce & Online Stores', 'Lagos'))
# 10 Architecture & Interior Design (10)
for c in ['Design Studio Africa','Art & Space Interiors','Blueprint Architecture','Cityscape Interiors','Modern Living Design','Visual Spaces','Terra Firma Design','Urban Studio','Plan & Elevation','Harmony Interiors']:
    prospects.append((c, 'TBD', 'Principal Architect', 'Architecture & Interior Design', 'Lagos'))
# 10 Agribusiness & Food Processing (10)
for c in ['Fresh Farm Nigeria','Plantation Foods Ltd','Green Harvest Farms','Farm & Field Agros','Fertile Soil Agribusiness','Cacao Haven Farm','Golden Harvest Farms','Soil to Table Agros','Sunshine Farms Nigeria','Harvest Lane Food Co.']:
    prospects.append((c, 'TBD', 'Owner', 'Agribusiness & Food Processing', 'Lagos'))
# 10 Professional Services (10)
for c in ['Obi & Co. Solicitors','Greenwood Accounting','Morningstar Consulting','Vanguard Legal Services','Capstone Advisory','Twin Peaks Law','Blue Lake Partners','City Legal Advocates','Horizon Advisory Group','Aperion Legal Partners']:
    prospects.append((c, 'TBD', 'Managing Partner', 'Professional Services', 'Lagos'))
# 5 Recruitment Agencies (5)
for c in ['TalentFinder Nigeria','HireRight Recruitment','StaffPro Consultants','AppointRight Africa','Fast Track Staffing']:
    prospects.append((c, 'TBD', 'Owner', 'Recruitment Agencies', 'Lagos'))
# 7 Real Estate & Property Management (7)
for c in ['Estate Plus Properties','Lekki Estates Ltd','Apex Management Properties','Green Park Estates','CityView Estates','Prime Properties Nig.','Meridian Estates']:
    prospects.append((c, 'TBD', 'Property Manager', 'Real Estate & Property Management', 'Lagos'))
# 8 Health & Wellness Clinics (8)
for c in ['MediCare Clinic','Healthy Life Medical','Smile Dental Clinic','St. Mary Hospital','Regency Medical Centre','Wellness Plus Clinic','City Doctors Clinic','Prime Health Hospital']:
    prospects.append((c, 'TBD', 'Owner', 'Health & Wellness Clinics', 'Lagos'))
ws1.append(headers)
style_header(ws1, len(headers))
# Write all prospects to ws1
for i, (company, contact, role, industry, city) in enumerate(prospects, start=1):
    ws1.append([f'PR-{i:03d}', company, contact, role, industry, city,
                '', '', '', 'Prospect', 'No', '', 'No', '', '', 'Needs outreach', '',
                'Open', 'Pre-qualified for outreach'])

# Data validations
ind_val = DataValidation(type='list', formula1='"Hospitality & Events,Retail & Fashion,Logistics & Supply Chain,E-commerce & Online Stores,Architecture & Interior Design,Agribusiness & Food Processing,Professional Services,Recruitment Agencies,Real Estate & Property Management,Health & Wellness Clinics"', allow_blank=True)
ws1.add_data_validation(ind_val)
ind_val.add('E2:E1000')

src_val = DataValidation(type='list', formula1='"LinkedIn,Google,Referral,Directory,Other"', allow_blank=True)
ws1.add_data_validation(src_val)
src_val.add('H2:H1000')

stage_val = DataValidation(type='list', formula1='"Prospect,Contacted,Replied,Meeting,Client,Disqualified,Unreachable"', allow_blank=True)
ws1.add_data_validation(stage_val)
stage_val.add('J2:J1000')

ws_val = DataValidation(type='list', formula1='"Yes,No,Skipped"', allow_blank=True)
ws1.add_data_validation(ws_val)
ws_val.add('K2:K1000')

reply_val = DataValidation(type='list', formula1='"Yes,No,No Reply"', allow_blank=True)
ws1.add_data_validation(reply_val)
reply_val.add('M2:M1000')

qual_val = DataValidation(type='list', formula1='"Qualified,Not qualified"', allow_blank=True)
ws1.add_data_validation(qual_val)
qual_val.add('P2:P1000')

status_val = DataValidation(type='list', formula1='"Open,Won,Lost,Paused"', allow_blank=True)
# Tab 2: Message Library
ws2 = wb.create_sheet('Message Library')
# Tab 3: Daily Workflow
ws3 = wb.create_sheet('Daily Workflow')
ws3['A1'] = 'Larkspur Resourcing - Daily Outreach Workflow'
ws3['A1'].font = Font(name='Calibri', bold=True, size=14, color='1F4E79')
ws3['A1'].alignment = Alignment(horizontal='left', vertical='center')
ws3.merge_cells('A2:C2')
ws3['A2'] = 'Today date: __________    Prospects to contact: __    Target: 100/day'
ws3['A2'].font = Font(name='Calibri', size=11, color='555555')
ws3.merge_cells('A1:C1')
workflow = [
    ('START OF DAY', ['Review yesterday replies in tracker (check Replied status)', 'Call/WhatsApp all prospects who replied in last 24 hrs', 'Read any follow-up messages that came in', 'Prepare day prospect list (top 100 from tracker)']),
    ('MORNING BATCH', ['Send initial WhatsApp 1 to 40 prospects (8:00-10:00 AM)', 'Send follow-up 1 to Day-1 prospects who replied or need a nudge']),
    ('AFTERNOON BATCH', ['Send initial WhatsApp 1 to 40 prospects (1:00-3:00 PM)', 'Send follow-up 1 to Day-2 prospects who need a nudge']),
    ('EVENING BATCH', ['Send initial WhatsApp 1 to 20 prospects (6:00-8:00 PM)', 'Send breakup/final follow-up to Day-10 prospects with no reply']),
    ('END OF DAY', ['Log all 100 interactions in tracker', 'Update Reply status for anyone who replied', 'Schedule next-day follow-ups (tomorrow at X)', 'Identify 10 prospects for personal 1:1 outreach', 'Review stage distribution and pause priorities']),
]

row = 4
for section, items in workflow:
    ws3.merge_cells(f'A{row}:C{row}')
    ws3[f'A{row}'] = section
    ws3[f'A{row}'].font = Font(name='Calibri', bold=True, size=12, color='1F4E79')
    row += 1
    for item in items:
        ws3.cell(row=row, column=1, value=item).font = Font(name='Calibri', size=11)
        ws3.cell(row=row, column=1).alignment = Alignment(vertical='center')
        ws3.merge_cells(f'A{row}:C{row}')
        row += 1
    row += 1

row += 1
ws3.merge_cells(f'A{row}:C{row}')
ws3[f'A{row}'] = 'Stage Distribution (auto-check)'
ws3[f'A{row}'].font = Font(name='Calibri', bold=True, size=12, color='1F4E79')
row += 1
for s in ['Prospect:     ____    |    Contacted:    ____    |    Replied:       ____', 'Meeting:      ____    |    Client:       ____    |    Disqualified:  ____', 'Unreachable:  ____    |    Needs f/u:    ____    |    Total:         ____']:
    ws3.cell(row=row, column=1, value=s).font = Font(name='Calibri', size=11)
    ws3.merge_cells(f'A{row}:C{row}')

row += 1
ws3.merge_cells(f'A{row}:C{row}')
ws3[f'A{row}'] = 'Daily Priority Targets'
ws3[f'A{row}'].font = Font(name='Calibri', bold=True, size=12, color='1F4E79')
row += 1
for p in ['1. Send 100 WhatsApp 1 messages/day (batch: 40 morning / 40 afternoon / 20 evening)', '2. Call 8-10 prospects who replied (voice > text)', '3. Identify 10 prospects for manual follow-up (personal touch)', '4. Track daily KPIs in the Analytics tab']:
    ws3.cell(row=row, column=1, value=p).font = Font(name='Calibri', size=11)
    ws3.merge_cells(f'A{row}:C{row}')
    row += 1

ws3.column_dimensions['A'].width = 90
ws3.column_dimensions['B'].width = 25
ws3.column_dimensions['C'].width = 25
print('Tab 3 (Daily Workflow) done.')
# Tab 4: Analytics
ws4 = wb.create_sheet('Analytics')
ws4.merge_cells('A1:D1')
ws4['A1'] = 'Larkspur Resourcing - Campaign Analytics Dashboard'
ws4['A1'].font = Font(name='Calibri', bold=True, size=14, color='1F4E79')

ws4.append(['KPI', 'Target', 'Actual', 'Notes'])
style_header(ws4, 4)

kpis = [
    ('Total Outreaches Sent', 100, 0, 'Number of WhatsApp 1 messages sent'),
    ('Reply Rate', '20-30%', 0, 'Replies / Sent x 100'),
    ('Qualification Rate', '50%', 0, 'Qualified / Replies x 100'),
    ('Meeting Rate', '15-20%', 0, 'Meetings / Replies x 100'),
    ('Conversion Rate', '40-60%', 0, 'Clients / Meetings x 100'),
    ('Total Meetings Booked', 10, 0, 'Meetings where call confirmed'),
    ('New Clients (Closed)', '4-6', 0, 'Mandates signed / active pilot'),
    ('Lost Opportunities', '0-5', 0, 'Disqualified + Unreachable count'),
    ('Pipeline Value (Naira)', '200,000-500,000', 0, 'Sum of qualified prospect deal values'),
    ('Days in Sprint', 28, 1, 'Days elapsed in campaign'),
]
for k in kpis:
    ws4.append(k)

row = 13
ws4.merge_cells(f'A{row}:D{row}')
ws4[f'A{row}'] = 'Pipeline Stage Distribution'
ws4[f'A{row}'].font = Font(name='Calibri', bold=True, size=12, color='1F4E79')
row += 1

ws4.append(['Stage', 'Count', 'Percentage', 'Action'])
style_header(ws4, 4, row - 1)

stage_labels = [
    ('Prospect', 'Add prospects and send WhatsApp 1'),
    ('Contacted', 'Initial message sent, awaiting reply'),
    ('Replied', 'Reply received - qualify within 24 hrs'),
    ('Meeting', 'Schedule call with decision maker'),
    ('Client', 'Mandate signed / active pilot'),
    ('Disqualified', 'Wrong fit, no budget, or existing agency'),
    ('Unreachable', 'No WhatsApp / wrong number / after 3 attempts'),
]
for stage, action in stage_labels:
    ws4.append([f'=COUNTIF(Master Tracker!J2:J1000,"{stage}")', '', '', action])

row += 1
ws4.merge_cells(f'A{row}:D{row}')
ws4[f'A{row}'] = 'Efficiency Metrics (formula-driven)'
ws4[f'A{row}'].font = Font(name='Calibri', bold=True, size=12, color='1F4E79')
row += 1

ws4.append(['Metric', 'Formula', 'Value', 'Notes'])
style_header(ws4, 4, row - 1)

metrics = [
    ('Reply Rate', '=IFERROR(COUNTIF(Master Tracker!M2:M1000,"Yes")/COUNTIF(Master Tracker!K2:K1000,"Yes")*100,"N/A") & "%"', 'Replies / Sent x 100'),
    ('Qualification Rate', '=IFERROR(COUNTIF(Master Tracker!P2:P1000,"Qualified")/MAX(COUNTIF(Master Tracker!M2:M1000,"Yes"),1)*100,"N/A") & "%"', 'Qualified / Replies x 100'),
    ('Meeting Rate', '=IFERROR(COUNTIF(Master Tracker!J2:J1000,"Meeting")/MAX(COUNTIF(Master Tracker!M2:M1000,"Yes"),1)*100,"N/A") & "%"', 'Meetings / Replies x 100'),
    ('Conversion Rate', '=IFERROR(COUNTIF(Master Tracker!J2:J1000,"Client")/MAX(COUNTIF(Master Tracker!J2:J1000,"Meeting"),1)*100,"N/A") & "%"', 'Clients / Meetings x 100'),
]
for m in metrics:
    ws4.append(m)

for i, w in enumerate([24, 38, 14, 36], start=1):
    ws4.column_dimensions[get_column_letter(i)].width = w
ws4.freeze_panes = 'A2'
print('Tab 4 (Analytics) done.')

# Save
output_path = '/Users/mishaeltamunotonyewilcox/Documents/AI-assisted projects/larkpur reach out/larkspur_outreach_tracker.xlsx'
wb.save(output_path)
print(f'Saved: {output_path}')

msg_headers = ['Stage', 'Template', 'A/B Variant', 'Timings', 'Best Used', 'Subject/Title']
ws2.append(msg_headers)
style_header(ws2, len(msg_headers))

messages = [
    ['Initial - Clarity Hook (A)',
     'Hi [Name], I am reaching out from Larkspur Resourcing - we help Nigerian SMEs like [Company] find and hire reliable staff, so you do not have to do it alone. We are currently helping [similar client type] with [specific service]. Quick question: how many new hires are you planning in the next 2 months? Reply Clarity and we will send a free hiring audit for your team.',
     'A', 'Day 1 (immediate)', 'Best for initial cold outreach to decision makers', 'Free Hiring Audit'],
    ['Initial - Problem-Solution (B)',
     'Hi [Name], I noticed [Company] is hiring for [role/industry]. I help SMEs structure hiring so it does not lead to bad fit or high turnover. We recently helped [similar company] reduce bad-hire risk by screening beyond CVs. Would you be open to a 10-min chat about how we could support your team hiring?',
     'B', 'Day 1 (alternative)', 'When prospects are known to be actively hiring', 'Reduce Bad-Hire Risk'],
    ['Initial - Warm Intro (C)',
     'Hi [Name], [Mutual Contact] suggested I reach out - we are a boutique HR firm helping SMEs in [industry] hire reliable staff without the headache of in-house recruiting. We offer screened shortlists, background checks, and employment support. Worth a 5-min chat if you are hiring later this quarter?',
     'C', 'Day 1 (if referral known)', 'When you know of a mutual contact', 'Warm Intro - HR Support'],
    ['Follow-Up 1 - Day 2 (A)',
     'Hi [Name], following up on my note from earlier - I know you are busy, so I will keep this brief. I am offering [Company] a free screening of your current vacancy criteria to reduce bad-hire risk. Worth 10 mins this week? If not, no worries at all.',
     'A', 'Day 2 (24 hrs later)', 'If no immediate reply, gentle nudge', 'Follow-Up: Free Screening'],
    ['Follow-Up 2 - Day 5',
     'Hi [Name] - quick follow-up on the hiring support I mentioned. Our background-verification and screening process is especially useful for businesses that have had a bad hire recently. Open to a 10-min chat this week to see if it is a fit?',
     'A', 'Day 5 (72 hrs later)', 'If still no reply, add value angle', 'Re: Screening Process'],
    ['Follow-Up 3 - Day 10 (Breakup)',
     'Hi [Name], I do not want to keep pushing. If your hiring needs are being handled well right now, just let me know - no hard feelings. If your team is hiring later this quarter, I will keep this on my radar. All the best!',
     'A', 'Day 10 (5 days later)', 'Breakup-style - gives chance to reply', 'Break-up Follow-Up'],
    ['Follow-Up 4 - Day 17 (Last Attempt)',
     'Hi [Name], just bumping this to the top of your inbox. We are taking a limited number of new SME clients for Q3/Q4. If you or your team are hiring soon, I would love to help. Otherwise, you are all set - just reply STOP to remove me.',
     'A', 'Day 17 (10 days later)', 'Final nudge before full disqualification', 'Final Follow-Up'],
    ['Re-Engagement (No Reply)',
     'Hi [Name] - hope the last message did not add noise. I am reopening my outreach to SMEs in [industry] for Larkspur Resourcing. If you have hiring plans, I would love to help. Otherwise, just reply NOT NOW and I will close your file.',
     'A', 'Day 21+ (if still no reply)', 'Re-engage long-quiet prospects', 'Re: Your Hiring Team'],
    ['Unsubscribe / Unreachable',
     'Hi [Name] - just confirming this number is not active anymore. No problem. Reply and I will remove you from our outreach list. Take care!',
     'A', 'When number bounces or blocked', 'Unreachable numbers', 'Unsubscribe Confirmation'],
]

for m in messages:
    ws2.append(m)

msg_widths = [26, 80, 12, 22, 36, 26]
for i, w in enumerate(msg_widths, start=1):
    ws2.column_dimensions[get_column_letter(i)].width = w

for r in range(2, len(messages) + 2):
    ws2.row_dimensions[r].height = 80

ws2.freeze_panes = 'A2'
print('Tab 2 (Message Library) done.')

ws1.add_data_validation(status_val)
status_val.add('T2:T1000')

# Column widths
col_widths = [8, 26, 18, 20, 30, 14, 18, 12, 12, 12, 12, 16, 10, 12, 40, 14, 22, 16, 10, 30]
for i, w in enumerate(col_widths, start=1):
    ws1.column_dimensions[get_column_letter(i)].width = w

ws1.freeze_panes = 'A2'
ws1.auto_filter.ref = 'A1:T1000'
for r in range(2, 102):
    ws1.row_dimensions[r].height = 20

print(f'Tab 1 done. Prospects: {len(prospects)}')

