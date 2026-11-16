import sys
sys.path.insert(0, "yt-api")
from app import validate_video_url, safe_filename, ApiError, format_for


def expect_reject(u):
    try:
        validate_video_url(u)
        return False
    except ApiError as e:
        return e.code in ("yt.invalid_url", "yt.playlist", "yt.unsupported")


def expect_accept(u):
    try:
        validate_video_url(u)
        return True
    except ApiError:
        return False


attacks = [
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",          # http scheme
    "https://youtube.com@evil.com/watch?v=dQw4w9WgXcQ",    # userinfo trick (host=evil.com)
    "https://evil.com/watch?v=dQw4w9WgXcQ",                # wrong host
    "https://www.youtube.com.evil.com/watch?v=abc1234567", # suffix trick
    "https://169.254.169.254/watch?v=abc1234567",          # cloud metadata IP
    "https://www.youtube.com:8443/watch?v=dQw4w9WgXcQ",    # weird port
    "file:///etc/passwd",                                  # file scheme
    "https://www.youtube.com/playlist?list=PL123",          # playlist page
    "https://www.youtube.com/@somechannel",                # channel page
    "https://www.youtube.com/results?search_query=x",      # search page
    "https://www.youtube.com/watch",                       # watch without id
    "https://www.youtube.com/watch?v=short",               # id too short
    "https://youtu.be/",                                   # empty id
    "javascript:alert(1)",                                 # js scheme
]
rejected = [u for u in attacks if not expect_reject(u)]

valids = [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
    "https://www.youtube.com/shorts/abcDEF12345",
    "https://www.youtube.com/embed/abcDEF12345",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&index=2",
]
wrongly_rejected = [u for u in valids if not expect_accept(u)]

print("ATTACKS NOT REJECTED:", rejected or "NONE")
print("VALIDS WRONGLY REJECTED:", wrongly_rejected or "NONE")

cases = [
    "evil\r\nSet-Cookie: pwned=1",
    "a\nb",
    "..\\..\\windows\\system32\\evil",
    'quote"name',
    "   . ",
    "",
    "Normal Title",
    "My Video.mp4",
]
bad = []
for inp in cases:
    out = safe_filename(inp)
    if "\r" in out or "\n" in out or "/" in out or "\\" in out or out.startswith("."):
        bad.append((inp, out))
print("UNSAFE FILENAMES:", bad or "NONE")
print("crlf sample:", repr(safe_filename("evil\r\nSet-Cookie: pwned=1")))

for q in ["max", "1080", "720", "480", "360", "240"]:
    f = format_for(q)
    assert all(c not in f for c in ";|&$`"), f
print("FORMAT SPECS OK (no shell metacharacters)")

ok = not rejected and not wrongly_rejected and not bad
print("ALL SECURITY UNIT TESTS PASSED" if ok else "FAILURES ABOVE")
sys.exit(0 if ok else 1)
