import flet as ft

def main(page: ft.Page):
    print("Testing Tabs with length...")
    t1 = ft.Tab(label="A")
    t2 = ft.Tab(label="B")
    
    try:
        # Attempt 1: Positional
        t = ft.Tabs([t1, t2], 2)
        page.add(t)
        print("Success Attempt 1")
    except Exception as e:
        print(f"Fail Attempt 1: {e}")

    try:
        # Attempt 2: Keyword
        t = ft.Tabs(content=[t1, t2], length=2)
        page.add(t)
        print("Success Attempt 2")
    except Exception as e:
        print(f"Fail Attempt 2: {e}")

ft.app(target=main)
