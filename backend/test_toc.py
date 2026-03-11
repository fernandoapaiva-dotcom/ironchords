import os
import win32com.client

# Path to the actual docx file or a test file
file_path = os.path.abspath(r"c:\Projetos\Anti Gravity\Caminho das Cifras\backend\Livreto.docx")

if os.path.exists(file_path):
    print(f"File found at {file_path}")
    word = None
    try:
        word = win32com.client.DispatchEx("Word.Application")
        word.Visible = False
        word.DisplayAlerts = 0

        doc = word.Documents.Open(file_path)
        word.ActiveWindow.View.Type = 3 # wdPrintView
        
        print("Repaginating...")
        doc.Repaginate()
        
        print("Updating fields...")
        doc.Fields.Update()
        
        if doc.TablesOfContents.Count > 0:
            print("Updating TOC...")
            # Try updating both the pages and the entire TOC
            doc.TablesOfContents(1).UpdatePageNumbers()
            doc.TablesOfContents(1).Update()
            print("TOC Updated.")
        else:
            print("No TOC found in the document.")

        doc.Save()
        doc.Close(SaveChanges=True)
        print("Done.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if word:
            word.Quit()
else:
    print("File not found.")
