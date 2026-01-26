import flet as ft

print(f"Version: {ft.__version__}")
print(f"Tabs: {ft.Tabs}")
print(f"Tab: {ft.Tab}")
print(f"Are they equal? {ft.Tabs is ft.Tab}")

print("dir(ft):")
print([x for x in dir(ft) if 'Tab' in x])
