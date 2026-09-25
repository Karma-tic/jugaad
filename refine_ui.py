import re

with open('index.html', 'r') as f:
    html = f.read()

# 1. Update general font and add subtle drop shadows for better game feel
html = html.replace("font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;",
                    "font-family: 'Inter', system-ui, -apple-system, sans-serif; text-shadow: 0px 1px 2px rgba(0,0,0,0.5);")

# 2. Refine .quest-banner (Mission text)
quest_css_old = r""".quest-banner \{
      position: absolute;
      bottom: 65px;
      left: 50%;
      transform: translateX\(-50\%\);
      z-index: 10;
      background: rgba\(30, 27, 75, 0\.9\);
      border: 2px solid #818cf8;
      border-radius: 30px;
      padding: 8px 24px;
      color: #e0e7ff;
      font-size: 0\.95rem;
      font-weight: 600;
      box-shadow: 0 4px 20px rgba\(99, 102, 241, 0\.4\);
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: auto;
    \}"""

quest_css_new = r""".quest-banner {
      position: absolute;
      bottom: 65px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      background: linear-gradient(135deg, rgba(30, 27, 75, 0.85), rgba(49, 46, 129, 0.95));
      backdrop-filter: blur(8px);
      border: 1px solid rgba(129, 140, 248, 0.6);
      border-radius: 30px;
      padding: 10px 28px;
      color: #e0e7ff;
      font-size: 1rem;
      font-weight: 700;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 10px rgba(129, 140, 248, 0.2);
      display: flex;
      align-items: center;
      gap: 12px;
      pointer-events: auto;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }"""
html = re.sub(quest_css_old, quest_css_new, html)

# 3. Refine .prompt-tip (Explore mohalla)
prompt_css_old = r""".prompt-tip \{
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX\(-50\%\);
      z-index: 11;
      background: rgba\(0,0,0,0\.85\);
      color: #fef08a;
      border: 1px dashed #ca8a04;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 0\.9rem;
      font-weight: 500;
      pointer-events: auto;
      text-align: center;
    \}"""

prompt_css_new = r""".prompt-tip {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 11;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(10px);
      color: #fef08a;
      border: 1px solid rgba(202, 138, 4, 0.5);
      padding: 10px 24px;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
      pointer-events: auto;
      text-align: center;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
      white-space: nowrap;
    }"""
html = re.sub(prompt_css_old, prompt_css_new, html)

# 4. Refine mobile controls (buttons)
btn_css_old = r""".btn-act \{
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba\(245, 158, 11, 0\.9\);
      border: 2px solid #fff;
      color: #fff;
      font-size: 1\.3rem;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 0 #b45309;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
    \}
    \.btn-act:active \{
      transform: translateY\(4px\);
      box-shadow: 0 0 0 #b45309;
    \}"""

btn_css_new = r""".btn-act {
      width: 54px;
      height: 54px;
      border-radius: 14px;
      background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%);
      border: 2px solid rgba(255, 255, 255, 0.8);
      color: #fff;
      font-size: 1.4rem;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 6px 0 #b45309, 0 8px 15px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      transition: transform 0.1s, box-shadow 0.1s, filter 0.1s;
    }
    .btn-act:hover {
      filter: brightness(1.1);
    }
    .btn-act:active {
      transform: translateY(6px);
      box-shadow: 0 0 0 #b45309, 0 2px 5px rgba(0,0,0,0.3);
    }"""
html = re.sub(btn_css_old, btn_css_new, html)

with open('index.html', 'w') as f:
    f.write(html)
