import re
with open('index.html', 'r') as f:
    html = f.read()

dialogue_old = r""".dialogue-box \{
      align-self: center;
      background: rgba\(15, 23, 42, 0.95\);
      border: 3px solid #3b82f6;
      border-radius: 16px;
      padding: 16px 24px;
      color: #fff;
      font-size: 1.1rem;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 10px 30px rgba\(0,0,0,0.5\);
      display: none;
      pointer-events: auto;
      margin-bottom: auto;
      margin-top: 20px;
    \}
    .dialogue-speaker \{
      color: #60a5fa;
      font-weight: 900;
      font-size: 1.2rem;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    \}"""

dialogue_new = r""".dialogue-box {
      align-self: center;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(2, 6, 23, 0.98));
      border: 2px solid rgba(59, 130, 246, 0.7);
      border-radius: 12px;
      padding: 20px 28px;
      color: #f8fafc;
      font-size: 1.15rem;
      max-width: 550px;
      text-align: left;
      box-shadow: 0 12px 40px rgba(0,0,0,0.6), inset 0 0 20px rgba(59, 130, 246, 0.15);
      display: none;
      pointer-events: auto;
      margin-bottom: auto;
      margin-top: 20px;
      backdrop-filter: blur(10px);
      position: relative;
    }
    .dialogue-box::before {
      content: '';
      position: absolute;
      top: -2px; left: -2px; right: -2px; bottom: -2px;
      background: linear-gradient(45deg, #3b82f6, transparent, #8b5cf6, transparent);
      z-index: -1;
      border-radius: 14px;
      opacity: 0.5;
    }
    .dialogue-speaker {
      color: #93c5fd;
      font-weight: 800;
      font-size: 1.25rem;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
      border-bottom: 1px solid rgba(59, 130, 246, 0.3);
      padding-bottom: 6px;
    }"""
html = re.sub(dialogue_old, dialogue_new, html)

with open('index.html', 'w') as f:
    f.write(html)
