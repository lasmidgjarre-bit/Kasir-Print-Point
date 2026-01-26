import qrcode

# URL for the customer upload page
url = "https://lasmidgjarre-bit.github.io/Kasir-Print-Point/upload.html"

# Create QR code instance
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=10,
    border=4,
)

qr.add_data(url)
qr.make(fit=True)

# Create an image from the QR Code instance
img = qr.make_image(fill_color="black", back_color="white")

# Save it to the project folder
img.save("d:\\Proyek Kasir Fotocopy\\qr_upload.png")
print("QR Code generated successfully at d:\\Proyek Kasir Fotocopy\\qr_upload.png")
