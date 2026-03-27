import os

path = r'c:\pythonapp\LINEportalsite-main\files\pdf'
files = os.listdir(path)
for f in files:
    if '備蓄食' in f:
        print(f"Name: '{f}'")
        print(f"Hex:  {f.encode('utf-8').hex()}")
