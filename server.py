import http.server
import socketserver
import os
import cgi
import json
import urllib.request
import threading
import time
from urllib.parse import urlparse, parse_qs

PORT = 8000
ROOT = os.path.abspath(os.path.dirname(__file__))
IMAGES_DIR = os.path.join(ROOT, "images")
DATA_DIR = os.path.join(ROOT, "data")
STORY_PATH = os.path.join(DATA_DIR, "story.json")

_jobs = {}
_jobs_lock = threading.Lock()
_job_counter = 0


def safe_slug(value: str) -> str:
    keep = []
    for ch in value.lower():
        if ch.isalnum():
            keep.append(ch)
        elif ch in ("-", "_"):
            keep.append(ch)
        else:
            keep.append("-")
    slug = "".join(keep).strip("-")
    return slug or "scene"


def unique_filename(base: str, ext: str) -> str:
    if not ext.startswith(".") and ext:
        ext = f".{ext}"
    filename = f"{base}{ext}"
    path = os.path.join(IMAGES_DIR, filename)
    if not os.path.exists(path):
        return filename
    counter = 2
    while True:
        filename = f"{base}-{counter}{ext}"
        path = os.path.join(IMAGES_DIR, filename)
        if not os.path.exists(path):
            return filename
        counter += 1


def create_job():
    global _job_counter
    with _jobs_lock:
        _job_counter += 1
        job_id = f"job-{int(time.time())}-{_job_counter}"
        _jobs[job_id] = {
            "status": "queued",
            "progress": 0,
            "path": "",
            "error": "",
        }
    return job_id


def update_job(job_id, **kwargs):
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            return
        job.update(kwargs)


def get_job(job_id):
    with _jobs_lock:
        return dict(_jobs.get(job_id, {}))


class UploadHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/upload-status":
            return self.handle_upload_status(parsed)
        if parsed.path == "/story":
            return self.handle_story_get()
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/upload":
            return self.handle_upload_file()
        if parsed.path == "/upload-url":
            return self.handle_upload_url()
        if parsed.path == "/save-story":
            return self.handle_story_save()
        self.send_error(404, "Not Found")

    def handle_upload_status(self, parsed):
        query = parse_qs(parsed.query)
        job_id = query.get("id", [""])[0]
        if not job_id:
            self.send_error(400, "Missing id")
            return
        job = get_job(job_id)
        if not job:
            self.send_error(404, "Not Found")
            return
        self.respond_json(job)

    def handle_story_get(self):
        if not os.path.exists(STORY_PATH):
            self.send_error(404, "Not Found")
            return
        with open(STORY_PATH, "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def handle_story_save(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length).decode("utf-8")
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return
        if not isinstance(payload, dict) or "scenes" not in payload:
            self.send_error(400, "Invalid story payload")
            return
        with open(STORY_PATH, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        self.respond_json({"ok": True})

    def handle_upload_file(self):
        os.makedirs(IMAGES_DIR, exist_ok=True)
        content_type = self.headers.get("Content-Type")
        if not content_type or "multipart/form-data" not in content_type:
            self.send_error(400, "Expected multipart/form-data")
            return

        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": content_type,
            },
        )

        if "file" not in form:
            self.send_error(400, "Missing file")
            return

        file_item = form["file"]
        if not getattr(file_item, "filename", None):
            self.send_error(400, "Missing filename")
            return

        desired = form.getfirst("name", "")
        base = safe_slug(desired) if desired else safe_slug(os.path.splitext(file_item.filename)[0])
        ext = os.path.splitext(file_item.filename)[1]
        filename = unique_filename(base, ext)

        dest_path = os.path.join(IMAGES_DIR, filename)
        with open(dest_path, "wb") as f:
            f.write(file_item.file.read())

        self.respond_json({"path": f"images/{filename}"})

    def handle_upload_url(self):
        os.makedirs(IMAGES_DIR, exist_ok=True)
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length).decode("utf-8")
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return

        url = payload.get("url", "").strip()
        if not url:
            self.send_error(400, "Missing url")
            return

        desired = payload.get("name", "")
        base = safe_slug(desired) if desired else "scene"

        job_id = create_job()
        update_job(job_id, status="downloading", progress=0)

        thread = threading.Thread(
            target=download_url,
            args=(job_id, url, base),
            daemon=True,
        )
        thread.start()

        self.respond_json({"id": job_id})

    def respond_json(self, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def download_url(job_id, url, base):
    try:
        with urllib.request.urlopen(url) as resp:
            content_type = resp.headers.get("Content-Type", "")
            length = resp.headers.get("Content-Length")
            total = int(length) if length and length.isdigit() else None

            ext = ""
            if "image/" in content_type:
                ext = "." + content_type.split("image/")[-1].split(";")[0].strip()
            if not ext:
                parsed = urlparse(url)
                ext = os.path.splitext(parsed.path)[1]
            if not ext:
                ext = ".jpg"

            filename = unique_filename(base, ext)
            dest_path = os.path.join(IMAGES_DIR, filename)

            downloaded = 0
            with open(dest_path, "wb") as f:
                while True:
                    chunk = resp.read(1024 * 128)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        pct = int((downloaded / total) * 100)
                        update_job(job_id, progress=min(99, pct))
            update_job(job_id, status="done", progress=100, path=f"images/{filename}")
    except Exception as exc:
        update_job(job_id, status="error", progress=0, error=str(exc))


if __name__ == "__main__":
    os.chdir(ROOT)
    with socketserver.TCPServer(("", PORT), UploadHandler) as httpd:
        print(f"Serving on http://localhost:{PORT}")
        httpd.serve_forever()
