import re

with open('index.html', 'r') as f:
    html = f.read()

# Change fonts and colors to be more modern
html = html.replace("font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;", "font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;")
html = html.replace("background: radial-gradient(circle at center, #1e1b4b 0%, #090d16 100%);", "background: radial-gradient(circle at center, #1e1e1e 0%, #121212 100%);")
html = html.replace("background: linear-gradient(135deg, #10b981, #059669);", "background: linear-gradient(135deg, #f39c12, #e67e22);")
html = html.replace("border: 2px solid #a7f3d0;", "border: 1px solid #d35400;")
html = html.replace("color: #fbbf24;", "color: #f39c12;")
html = html.replace("color: #38bdf8;", "color: #bdc3c7;")
html = html.replace("background: rgba(255, 255, 255, 0.08);", "background: rgba(0, 0, 0, 0.5);")

with open('index.html', 'w') as f:
    f.write(html)
