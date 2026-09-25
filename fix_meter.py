import re
with open('index.html', 'r') as f:
    html = f.read()

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
      border: 1px solid rgba(16, 185, 129, 0.6);
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
