import re

with open('src/main.js', 'r') as f:
    content = f.read()

# Add a check to prevent movement while on overlay screens
old_move = "if (!this.isRiding && this.stage < 4 && !this.isFalling) {"
new_move = """
      const landing = document.getElementById('landing-screen');
      const intro = document.getElementById('intro-screen');
      const map = document.getElementById('level-map-screen');
      const isOverlayActive = (landing && landing.style.display !== 'none') || 
                              (intro && intro.style.display !== 'none') || 
                              (map && map.style.display === 'flex');

      if (!this.isRiding && this.stage < 4 && !this.isFalling && !isOverlayActive) {"""

content = content.replace(old_move, new_move.lstrip())

with open('src/main.js', 'w') as f:
    f.write(content)
