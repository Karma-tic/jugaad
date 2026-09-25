import re

def remove_emojis(text):
    # Matches most common emoji ranges
    emoji_pattern = re.compile(
        u"(\ud83d[\ude00-\ude4f])|"  # emoticons
        u"(\ud83d[\ude80-\udeff])|"  # transport/map
        u"(\ud83e[\udd00-\uddff])|"  # supplemental
        u"(\ud83c[\udf00-\udfff])|"  # miscellaneous
        u"([\u2600-\u26FF\u2700-\u27BF])" # dingbats
        "+", flags=re.UNICODE)
    return emoji_pattern.sub(r'', text)

with open('index.html', 'r') as f:
    html = f.read()
html = remove_emojis(html)
with open('index.html', 'w') as f:
    f.write(html)

with open('src/main.js', 'r') as f:
    main_js = f.read()
main_js = remove_emojis(main_js)
with open('src/main.js', 'w') as f:
    f.write(main_js)
