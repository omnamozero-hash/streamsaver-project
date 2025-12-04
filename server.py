from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import yt_dlp
import logging
import sys
import os
import glob
import time
import uuid
import urllib.request
import re
from urllib.parse import quote

app = Flask(__name__)
CORS(app) 

logging.basicConfig(level=logging.DEBUG)

@app.route('/', methods=['GET'])
def home():
    print("✅ Connection Test: SUCCESS!", file=sys.stderr)
    return "Server is running!"

@app.route('/proxy_thumbnail', methods=['GET'])
def proxy_thumbnail():
    url = request.args.get('url')
    if not url: return "", 404
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            return Response(response.read(), mimetype='image/jpeg')
    except Exception as e:
        return "", 404

def resolve_redirects(url):
    return url

def get_safe_opts():
    return {
        'quiet': False, 
        'no_warnings': True,
        'nocheckcertificate': True,
        'ignoreerrors': True, 
        'no_color': True,
        'force_ipv4': True,
        'socket_timeout': 30,
        'noplaylist': True, 
        'extractor_args': {'youtube': {'player_client': ['android']}},
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }

def clean_filename(title):
    clean = re.sub(r'[\\/*?:"<>|]', "", title)
    clean = clean.replace('\n', ' ').replace('\r', '')
    return clean[:60].strip()

def get_smart_title(info):
    title = info.get('title')
    if not title or title in ["Video", "Reel", "Instagram Reel", "Facebook Video"]:
        desc = info.get('description') or info.get('caption')
        if desc:
            title = desc.split('\n')[0][:50]
    if not title:
        title = f"Video_{str(uuid.uuid4())[:4]}"
    return clean_filename(title)

def get_video_info(url):
    ydl_opts = get_safe_opts()
    ydl_opts['extract_flat'] = 'in_playlist'

    try:
        print(f"🔍 ENGINE: Analyzing {url}...", file=sys.stderr)
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info: return None
            
            title = get_smart_title(info)
            thumbnail = info.get('thumbnail')
            
            return {
                'id': info.get('id'),
                'title': title,
                'author': info.get('uploader') or info.get('channel') or "Unknown",
                'duration': info.get('duration_string') or "N/A",
                'thumbnail': thumbnail,
                'platform': info.get('extractor_key'),
                'resolved_url': url,
                'formats': [
                    {'id': 'mp4', 'type': 'video', 'quality': 'Video', 'ext': 'mp4'},
                    {'id': 'mp3', 'type': 'audio', 'quality': 'Audio Only', 'ext': 'mp3'},
                    {'id': 'ringtone', 'type': 'audio', 'quality': 'Ringtone', 'ext': 'mp3'}
                ]
            }
    except Exception as e:
        print(f"❌ ENGINE ERROR: {str(e)}", file=sys.stderr)
        return None

@app.route('/analyze', methods=['POST'])
def analyze_url():
    data = request.json
    url = data.get('url')
    if not url: return jsonify({'error': 'No URL provided'}), 400
    
    info = get_video_info(url)
    if info: return jsonify(info)
    else: return jsonify({'error': 'Could not fetch video info.'}), 500

@app.route('/download', methods=['GET'])
def download_video():
    url = request.args.get('url')
    requested_format = request.args.get('format', 'mp4')
    unique_id = str(uuid.uuid4())[:8]
    temp_filename_base = f"temp_{unique_id}"
    
    print(f"⬇️ ENGINE: Downloading {url} as [{requested_format}]...", file=sys.stderr)

    # 1. Get Title
    video_title = "download"
    try:
        with yt_dlp.YoutubeDL(get_safe_opts()) as ydl:
            info = ydl.extract_info(url, download=False)
            video_title = get_smart_title(info)
    except: pass

    # 2. Configure Settings
    ydl_opts = get_safe_opts()
    ydl_opts['extract_flat'] = False 
    ydl_opts['outtmpl'] = f"{temp_filename_base}.%(ext)s"

    # STRICT FORMAT LOGIC
    if requested_format == 'mp3' or requested_format == 'ringtone':
        print("🎵 MODE DETECTED: AUDIO ONLY", file=sys.stderr)
        # Force downloading the best audio format available
        ydl_opts['format'] = 'bestaudio/best'
    else:
        print("🎥 MODE DETECTED: VIDEO", file=sys.stderr)
        ydl_opts['format'] = 'best[ext=mp4]/best'

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        downloaded_file = None
        for f in os.listdir('.'):
            if f.startswith(temp_filename_base):
                downloaded_file = f
                break
        
        if not downloaded_file or os.path.getsize(downloaded_file) == 0:
            return "Error: Download failed.", 500

        print(f"✅ ENGINE: Sending '{video_title}'...", file=sys.stderr)

        def generate():
            with open(downloaded_file, "rb") as f:
                while True:
                    data = f.read(4096)
                    if not data: break
                    yield data
            try: os.remove(downloaded_file) 
            except: pass
        
        ext = downloaded_file.split('.')[-1]
        
        # Add Ringtone suffix
        suffix = "_Ringtone" if requested_format == 'ringtone' else ""
        final_filename = f"{video_title}{suffix}.{ext}" # Removed timestamp for cleaner name
        
        try: encoded_filename = quote(final_filename)
        except: encoded_filename = f"download_{unique_id}.{ext}"

        # FORCE BROWSER TO SEE IT AS AUDIO
        if requested_format in ['mp3', 'ringtone']:
            mime = 'audio/mpeg' 
        else:
            mime = f'video/{ext}'

        return Response(
            stream_with_context(generate()), 
            mimetype=mime,
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
        )

    except Exception as e:
        print(f"Download Error: {e}", file=sys.stderr)
        for f in glob.glob(f"{temp_filename_base}.*"):
            try: os.remove(f)
            except: pass
        return f"Error: {str(e)}", 500

if __name__ == '__main__':
    print("------------------------------------------------")
    print("🚀 ENGINE READY (VERSION 15.0 - AUDIO FIX)")
    print("------------------------------------------------")
    app.run(port=5000, debug=True)