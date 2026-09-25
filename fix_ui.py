import re

with open('index.html', 'r') as f:
    html = f.read()

# Fix btn-right
html = html.replace('<button id="btn-right" class="btn-act" title="Move Right (D)">️</button>', '<button id="btn-right" class="btn-act" title="Move Right (D)">➡️</button>')

# Fix quest-banner CSS
quest_css_old = r"""\.quest-banner \{
      align-self: center;
      background: rgba\(30, 27, 75, 0\.9\);"""
quest_css_new = r""".quest-banner {
      position: absolute;
      bottom: 65px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      background: rgba(30, 27, 75, 0.9);"""
html = re.sub(quest_css_old, quest_css_new, html)

# Ensure prompt-tip is positioned well
prompt_css_old = r"""\.prompt-tip \{
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX\(-50\%\);"""
prompt_css_new = r""".prompt-tip {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 11;"""
html = re.sub(prompt_css_old, prompt_css_new, html)

with open('index.html', 'w') as f:
    f.write(html)
