import re
with open('index.html', 'r') as f:
    html = f.read()

# Make score badge glassmorphic
badge_old = r""".score-badge \{
      background: rgba\(0, 0, 0, 0.5\);
      border: 1px solid #f59e0b;
      border-radius: 30px;
      padding: 6px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: bold;
      color: #fef08a;
      font-size: 0.95rem;
      backdrop-filter: blur\(8px\);
    \}"""
badge_new = r""".score-badge {
      background: linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(20, 20, 20, 0.8));
      border: 1px solid rgba(245, 158, 11, 0.6);
      border-radius: 30px;
      padding: 8px 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
      color: #fef08a;
      font-size: 1rem;
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5), inset 0 0 8px rgba(245, 158, 11, 0.2);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }"""
html = re.sub(badge_old, badge_new, html)

# Make jugaad meter better
meter_old = r""".jugaad-meter-container \{
      background: rgba\(0, 0, 0, 0.7\);
      border: 2px solid #10b981;
      border-radius: 12px;
      padding: 10px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 220px;
      box-shadow: 0 4px 15px rgba\(16, 185, 129, 0.2\);
      pointer-events: auto;
    \}"""
meter_new = r""".jugaad-meter-container {
      background: linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(20, 20, 20, 0.95));
      border: 2px solid rgba(16, 185, 129, 0.6);
      border-radius: 16px;
      padding: 12px 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 240px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.6), inset 0 0 15px rgba(16, 185, 129, 0.15);
      backdrop-filter: blur(12px);
      pointer-events: auto;
    }"""
html = re.sub(meter_old, meter_new, html)

with open('index.html', 'w') as f:
    f.write(html)
