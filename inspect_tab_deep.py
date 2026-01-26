import flet as ft
import inspect

print("--- FLET VERSION ---")
print(ft.version.version)

print("\n--- TAB INIT SIGNATURE ---")
try:
    print(inspect.signature(ft.Tab.__init__))
except:
    print("Could not get signature")

print("\n--- TAB INIT VARNAMES ---")
try:
    print(ft.Tab.__init__.__code__.co_varnames)
except:
    print("Could not get varnames")

print("\n--- TAB DIR ---")
print(dir(ft.Tab))
