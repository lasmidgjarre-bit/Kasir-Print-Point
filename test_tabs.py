import flet as ft

def main(page: ft.Page):
    print("Testing Tabs...")
    try:
        # Attempt 1: Standard
        t = ft.Tabs(tabs=[ft.Tab(text="A"), ft.Tab(text="B")])
        print("Success Attempt 1")
    except Exception as e:
        print(f"Fail Attempt 1: {e}")

    try:
        # Attempt 2: using 'label' for Tab
        t = ft.Tabs(tabs=[ft.Tab(label="A"), ft.Tab(label="B")])
        print("Success Attempt 2")
    except Exception as e:
        print(f"Fail Attempt 2: {e}")

    try:
        # Attempt 3: Assigning property
        t = ft.Tabs()
        t.tabs = [ft.Tab(label="A")]
        print("Success Attempt 3")
    except Exception as e:
        print(f"Fail Attempt 3: {e}")

ft.app(target=main)
