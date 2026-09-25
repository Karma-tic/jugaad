import re
with open('index.html', 'r') as f:
    text = f.read()

# Emojis to remove or replace
replacements = {
    '🗣️': '',
    '💥': '',
    '🎉': '',
    '🎁': '',
    '🏆': '',
    '🔊': 'Sound On',
    '🔇': 'Sound Off'
}

for k, v in replacements.items():
    text = text.replace(k, v)

with open('index.html', 'w') as f:
    f.write(text)
