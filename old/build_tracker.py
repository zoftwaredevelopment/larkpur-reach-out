
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
ws1.title = "Prospects Tracker"

headers = ['Name', 'Organization', 'Email', 'WhatsApp No', 'Source', 'Date Added', 'Stage', 'WhatsApp Sent',
           'Date WhatsApp Sent', 'Reply?', 'Reply Date', 'Reply Content',
           'Qualify?', 'Next Action', 'Next Follow-up Date', 'Status', 'Notes']
ws1.append(headers)
style_header(ws1, len(headers))

prospects = []
