with open('src/main.js', 'r') as f:
    content = f.read()

# Hide items initially except the brick
content = content.replace("this.items.push(broom);", "broom.visible = false;\n    this.items.push(broom);")
content = content.replace("this.items.push(bottle);", "bottle.visible = false;\n    this.items.push(bottle);")
content = content.replace("this.items.push(cardboard);", "cardboard.visible = false;\n    this.items.push(cardboard);")
content = content.replace("this.items.push(plank);", "plank.visible = false;\n    this.items.push(plank);")
content = content.replace("this.items.push(tyre);", "tyre.visible = false;\n    this.items.push(tyre);")
content = content.replace("this.items.push(grass);", "grass.visible = false;\n    this.items.push(grass);")

# Show items on teleport
old_teleport = "this.house.visible = false;"
new_teleport = "this.house.visible = false;\n              this.items.forEach(item => item.visible = true);"
content = content.replace(old_teleport, new_teleport)

with open('src/main.js', 'w') as f:
    f.write(content)
