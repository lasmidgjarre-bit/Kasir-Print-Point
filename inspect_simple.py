import flet as ft
try:
    print(f"Version: {ft.__version__}")
except:
    pass

print("--- TAB INIT VARNAMES ---")
try:
    print(ft.Tab.__init__.__code__.co_varnames)
except Exception as e:
    print(e)
