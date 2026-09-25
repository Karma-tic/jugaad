import re
with open('index.html', 'r') as f:
    html = f.read()

btn_css_old = r""".btn-act \{
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba\(245, 158, 11, 0.9\);
      border: 2px solid #fff;
      color: #fff;
      font-size: 1.3rem;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 0 #b45309;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
    \}
    .btn-act:active \{
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
