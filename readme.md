# Pro Background Remover (PHP + Python) by @Latimax

A lightweight web app that removes image backgrounds on **your** server using **PHP**, **Python**, and **[rembg](https://github.com/danielgatis/rembg)** (ONNX Runtime). It features a clean UI with drag‑and‑drop upload, a viewer to switch between **Original** and **Removed BG**, accessible alerts, and a one‑click **Download PNG**.

---

## ✨ Features

- Drag & drop or click‑to‑upload (PNG/JPG, ≤ 3 MB)
- Client‑side preview + smart compression before upload
- One‑click processing via Python `rembg`
- Switch between **Original** and **Removed BG**
- Download the result as PNG with transparency
- Robust error handling (client + server)
- Cross‑platform Python runner (uses local `venv` if present; falls back cleanly)
- Minimal, accessible UI

---

## 🧭 How it works (architecture)

```
[Browser: HTML/CSS/JS]
        │ 1. upload (FormData)
        ▼
[PHP: process.php] — validates file, calls →
        ▼
[Python: process.py + rembg] — returns base64 PNG
        ▼
[PHP] — JSON { status, msg, output: data:image/png;base64,... }
        ▼
[JS] — updates UI, enables download, toggles viewer
```

---

## 📁 Project structure

```
/project-root
├─ index.html        # UI markup (uploader, viewer, actions)
├─ style.css         # modern, accessible styles
├─ script.js         # upload, tabs, alerts, fetch to PHP
├─ process.php       # server-side validation & Python bridge
├─ process.py        # uses rembg to remove background
└─ upload.png        # placeholder graphic for initial state
```

---

## ✅ Requirements

- PHP 7.4+ (CLI server or Apache/Nginx)
- Python 3.9+ (same machine/user as PHP)
- Ability to run Python from PHP (via `shell_exec`) **OR** a Python app endpoint
- Python packages:
  - `rembg`
  - `onnxruntime` (or `onnxruntime-gpu` if you know what you’re doing)
  - `pillow`

> **Note:** `onnxruntime` requires x86_64 and a reasonably recent glibc/Windows runtime. Most modern hosts are fine.

---

## 🚀 Quick Start (Local)

### 1) Place files
Copy all files into your web root or a folder served by PHP.

### 2) Set up Python environment

**Windows (PowerShell/CMD):**
```bat
python -m venv venv
venv\Scripts\python -m pip install --upgrade pip
venv\Scripts\pip install rembg onnxruntime pillow
```

**macOS / Linux:**
```bash
python3 -m venv venv
./venv/bin/python -m pip install --upgrade pip
./venv/bin/pip install rembg onnxruntime pillow
```

### 3) Serve the app

**Option A – PHP built‑in server** (from project root):
```bash
php -S localhost:8000
```
Open `http://localhost:8000/index.html`

**Option B – XAMPP/WAMP/MAMP**  
Copy the folder into the proper web root (e.g., `htdocs`) and visit `http://localhost/<folder>/index.html`.

---

## 🔧 Configuration notes

- **Python path (process.php):**  
  By default it points to a `venv` inside the project. If the venv isn’t found, it falls back to `python3` (Linux/macOS) or `python` (Windows). You can hardcode your interpreter path if needed:
  ```php
  // Example: user-level venv on shared hosting
  $python = $_SERVER['HOME'].'/rembg-venv/bin/python';
  ```
- **Upload limits:**  
  Frontend enforces ≤ 3 MB. PHP also checks size. Adjust both if you need larger files.
- **Timeouts:**  
  For Apache/PHP, consider raising `max_execution_time` (e.g., 120s) for cold model downloads.

---

## 🧑‍💻 Test the Python step directly

Before testing in the browser, make sure Python returns base64 (no tracebacks):

**Windows:**
```bat
venv\Scripts\python process.py path\to\image.png > out.txt
type out.txt
```

**macOS / Linux:**
```bash
./venv/bin/python process.py path/to/image.png > out.txt
head -c 80 out.txt && echo ...
```

You should see a **long** base64 string. If you see `False` or a traceback, check troubleshooting.

---

## 🛠️ Shared Hosting (cPanel) Deployment

Shared hosting varies. Pick the first path your provider supports.

### Path A — PHP calls Python directly
**Use when:** `shell_exec` is enabled and you have SSH.

1. SSH into your account:
   ```bash
   python3 -m venv ~/rembg-venv
   ~/rembg-venv/bin/pip install --upgrade pip
   ~/rembg-venv/bin/pip install rembg onnxruntime pillow
   ```
2. Edit `process.php` to point to the user‑level venv:
   ```php
   $python = $_SERVER['HOME'].'/rembg-venv/bin/python';
   ```
3. Upload the project to `public_html/yourapp/` and visit `/index.html`.

### Path B — Run a small Python API via “Setup Python App”
**Use when:** Your cPanel has **Setup Python App** (Passenger).

1. Create a Python app in cPanel (Py 3.10+).
2. In the app terminal:
   ```bash
   pip install rembg onnxruntime pillow flask
   ```
3. Minimal `app.py`:
   ```python
   from flask import Flask, request, jsonify
   from rembg import remove
   import base64

   app = Flask(__name__)

   @app.post("/remove")
   def rm():
       f = request.files.get("file")
       if not f: return jsonify({"status":"error","msg":"no file"}), 400
       try:
           out = remove(f.read())
           b64 = base64.b64encode(out).decode("utf-8")
           return jsonify({"status":"success","output":"data:image/png;base64,"+b64})
       except Exception:
           return jsonify({"status":"error","msg":"processing failed"}), 500
   ```
4. Point Passenger (e.g., `passenger_wsgi.py`) to `app.app` and restart.
5. Change `process.php` to call this endpoint via cURL instead of `shell_exec`.

### Path C — External API or a small VPS
When the host blocks Python or `onnxruntime` won’t install:
- Call a third‑party background‑removal API from PHP.
- Or run the Python service on a tiny VPS and POST images to it.

---

## 🔍 Troubleshooting

**`ModuleNotFoundError: No module named 'onnxruntime'`**  
Install into the exact interpreter PHP is calling:
```bash
venv/bin/pip install onnxruntime
```
Windows:
```bat
venv\Scripts\pip install onnxruntime
```

**`ERR_INVALID_URL` with `data:image/png;base64,Traceback…`**  
Python crashed and printed a traceback; JS tried to use it as an image.  
Fix the Python import/runtime error; ensure `process.php` **validates** output and returns a proper error.

**`shell_exec` returns nothing / disabled**  
Your host disallows it. Use cPanel “Setup Python App” (Path B) or Path C.

**First run is slow / fails**  
The model may download on first use. Give it time, ensure outbound network is allowed and you have disk quota.

**Large images time out**  
Increase PHP `max_execution_time`, web server timeouts, and consider raising client/server file limits.

**Which Python is PHP using?**  
Add a quick probe in PHP:
```php
echo shell_exec('which python3 2>&1');
echo shell_exec('python3 -V 2>&1');
```

**Environment checker (`env-check.php`):**
```php
<?php
echo "<pre>";
echo "shell_exec: ".(function_exists('shell_exec') ? "ENABLED" : "DISABLED")."\n";
echo "which python: ".(function_exists('shell_exec') ? shell_exec('which python3 2>&1') : "n/a")."\n";
echo "python -V: ".(function_exists('shell_exec') ? shell_exec('python3 -V 2>&1') : "n/a")."\n";
phpinfo(INFO_GENERAL);
```

---

## ⚙️ Configuration & Customization

- **Max dimensions for client‑side compression:** in `script.js` (`maxW = 800`, `maxH = 600`).
- **Size limits:** 3 MB enforced in both JS and PHP—keep them in sync.
- **UI accents:** tweak CSS variables in `:root` in `style.css`.
- **Download filename:** change in `script.js` (`removed-background.png`).

---

## 🧪 API contract (PHP ⇄ Python)

**Request:** `POST process.php` with `FormData`:
- `action`: `remove_bg`
- `compress`: uploaded image file

**Response (success):**
```json
{
  "status": "success",
  "msg": "Background removed.",
  "output": "data:image/png;base64,iVBORw0KGgoAAA..."
}
```

**Response (error):**
```json
{ "status": "error", "msg": "Processing failed. Try another image." }
```

---

## 🗺️ Roadmap

- Batch uploads + queued processing
- Background **replacement** (solid color, gradient, custom image)
- Feathering & edge smoothing control
- EXIF orientation handling
- Dockerfile for portable deploys
- Optional GPU support with `onnxruntime-gpu`

---

## 🔒 Security & Privacy

- Files are processed locally on your server; nothing is sent to third parties (unless you choose an external API).
- Validate and size‑limit uploads.
- Consider serving over HTTPS and adding CSRF protection if you expose this publicly.

---

## 🙏 Acknowledgements

- [rembg](https://github.com/danielgatis/rembg)
- [ONNX Runtime](https://onnxruntime.ai/)
- [Pillow](https://python-pillow.org/)

---

## 📄 License (MIT)

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECT