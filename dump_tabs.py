import flet as ft
import inspect

with open("tabs_info.txt", "w") as f:
    f.write(f"Version: {ft.__version__}\n\n")
    
    f.write("--- dir(ft.Tabs) ---\n")
    f.write(str(dir(ft.Tabs)) + "\n\n")
    
    f.write("--- ft.Tabs.__init__ varnames ---\n")
    try:
        f.write(str(ft.Tabs.__init__.__code__.co_varnames) + "\n\n")
    except Exception as e:
        f.write(f"Error getting varnames: {e}\n\n")
        
    f.write("--- ft.Tabs doc ---\n")
    f.write(str(ft.Tabs.__doc__) + "\n")
