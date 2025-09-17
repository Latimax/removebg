
# Save as process.py
# Python env setup (run once):
#   pip install virtualenv
#   virtualenv venv
#   venv/bin/pip install rembg pillow

import sys
import base64
from rembg import remove


def remove_bg(input_f: str):
    try:
        with open(input_f, 'rb') as f:
            i = f.read()
        o = remove(i)  # bytes (PNG with alpha)
        return base64.b64encode(o).decode('utf-8')
    except Exception:
        return False


if __name__ == '__main__':
    input_ = sys.argv[1]
    process_ = remove_bg(input_)
    print(process_)
