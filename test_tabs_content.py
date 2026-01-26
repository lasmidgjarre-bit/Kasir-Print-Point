import flet as ft

def main(page: ft.Page):
    print("Testing Tabs with content arg...")
    try:
        t = ft.Tabs(
            selected_index=0,
            content=[
                ft.Tab(label="A"),
                ft.Tab(label="B")
            ]
        )
        page.add(t)
        print("Success! Tabs created with content arg.")
    except Exception as e:
        print(f"Fail: {e}")

ft.app(target=main)
