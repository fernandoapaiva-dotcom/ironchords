import os
import win32com.client

out_p = r"c:\Projetos\Anti Gravity\Caminho das Cifras\backend\test_output.docx"

word = win32com.client.Dispatch("Word.Application")
word.Visible = False
word.DisplayAlerts = 0

doc = word.Documents.Open(os.path.abspath(out_p))
try:
    if doc.TablesOfContents.Count > 0:
        toc = doc.TablesOfContents(1)
        print("TOC Text:")
        print(toc.Range.Text)
finally:
    doc.Close(SaveChanges=False)
try:
    word.Quit()
except:
    pass
