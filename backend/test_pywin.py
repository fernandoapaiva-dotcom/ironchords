try:
    import pythoncom
    import win32com.client
    print("SUCCESS: pywin32 is available")
    pythoncom.CoInitialize()
    print("SUCCESS: CoInitialize worked")
    word = win32com.client.DispatchEx("Word.Application")
    print(f"SUCCESS: Word Version: {word.Version}")
    word.Quit()
    pythoncom.CoUninitialize()
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()
