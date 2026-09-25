with open('index.html', 'r') as f:
    html = f.read()

html = html.replace('id="intro-screen" style="display: none;"', 'id="intro-screen"')
html = html.replace('id="landing-screen" style="display: none;"', 'id="landing-screen"')
html = html.replace('id="level-map-screen" style="display: none;"', 'id="level-map-screen"')

with open('index.html', 'w') as f:
    f.write(html)
