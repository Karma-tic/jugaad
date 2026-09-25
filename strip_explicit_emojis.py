import io

with io.open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Emojis seen in screenshot:
# 🛵 Bhopali Safar
# 💡 Press [E]
# 🎯 Mission:
replacements = {
    '🛵': '',
    '💡': '',
    '🎯': '',
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

with io.open('index.html', 'w', encoding='utf-8') as f:
    f.write(text)

with io.open('src/main.js', 'r', encoding='utf-8') as f:
    mainjs = f.read()

for k, v in replacements.items():
    mainjs = mainjs.replace(k, v)

with io.open('src/main.js', 'w', encoding='utf-8') as f:
    f.write(mainjs)
