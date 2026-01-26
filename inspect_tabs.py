import flet as ft
try:
    print("--- TABS INIT VARNAMES ---")
    print(ft.Tabs.__init__.__code__.co_varnames)
except Exception as e:
    print(e)
