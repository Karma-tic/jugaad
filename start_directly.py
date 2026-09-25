with open('index.html', 'r') as f:
    html = f.read()

# Hide intro-screen
html = html.replace('id="intro-screen"', 'id="intro-screen" style="display: none;"')

# Hide landing-screen
html = html.replace('id="landing-screen"', 'id="landing-screen" style="display: none;"')

# Hide level-map-screen
html = html.replace('id="level-map-screen"', 'id="level-map-screen" style="display: none;"')

with open('index.html', 'w') as f:
    f.write(html)
