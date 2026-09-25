import re

with open('src/main.js', 'r') as f:
    content = f.read()

# Remove UI emojis
content = content.replace("🗣️ ${speaker}", "${speaker}")
content = content.replace("🔇", "MUTE").replace("🔊", "SND")
content = content.replace("🎉 JUGAAD 1: LAAL EENT KA STAND! (+25%)", "JUGAAD 1: DOOR OPENED! (+25%)")
content = content.replace("🎉 JUGAAD 2: TIMBER BRIDGE READY! (+25%)", "JUGAAD 2: TIMBER BRIDGE READY! (+25%)")
content = content.replace("🎉 JUGAAD 3: GAU MATA RASTA CLEAR! (+25%)", "JUGAAD 3: ROAD CLEAR! (+25%)")
content = content.replace("💥 ACCIDENT! GAU MATA SE TAKKAR! 💥", "CRASH!")

# Update Story and Dialogues
content = content.replace(
    "'Chacha',\n      'Arre miyaan! Scooter ka stand toot gaya! Mohalle me kabaad dhundo aur Laal Eent jaisa koi thos stand banao!'",
    "'Mom',\n      'Beta jaldi uth! Aaj function hai. 10 baje tak pahunchna hai! Par darwaza jam ho gaya hai, koi jugaad lagao darwaza kholne ka!'"
)
content = content.replace(
    "Aage sadak par gehra gaddha hai! Construction pile se lamba lakdi ka phatta dhundo!",
    "Door is propped open. Now take the scooter, but there is a trench ahead! Find a wooden plank!"
)
content = content.replace(
    "Hao miyaan! Laal eent ka stand lag gaya! Ab sadak par dekho, municipal walon ne gehra gaddha khoda hai!",
    "Brick used as door stopper! You are out of the house. Now get on the scooter, but beware of the broken road!"
)
content = content.replace("Chacha", "Mom")

with open('src/main.js', 'w') as f:
    f.write(content)
