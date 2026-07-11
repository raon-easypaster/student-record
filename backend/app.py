import json
import secrets
import sys
import threading
import time
import urllib.parse
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

import hashlib
import base64
import ssl

app = Flask(__name__)
CORS(app)

TOKENS_DIR = Path("tokens")
TOKENS_DIR.mkdir(exist_ok=True)

def get_token_file(user_id):
    if not user_id:
        return None
    return TOKENS_DIR / f"{user_id}_gemini_token.json"

GEMINI_OAUTH_CLIENT_ID = "995167660237-7on70f80j44oefof0ic23m9ft34oifst.apps.googleusercontent.com"
GEMINI_OAUTH_CLIENT_SECRET = "" # NOT NEEDED FOR PKCE
GEMINI_OAUTH_REDIRECT_URI = "http://127.0.0.1:8085"

# session store per state
oauth_sessions = {}

def generate_pkce():
    verifier_bytes = secrets.token_bytes(32)
    verifier = base64.urlsafe_b64encode(verifier_bytes).rstrip(b'=').decode('utf-8')
    challenge_bytes = hashlib.sha256(verifier.encode('utf-8')).digest()
    challenge = base64.urlsafe_b64encode(challenge_bytes).rstrip(b'=').decode('utf-8')
    return verifier, challenge

def build_gemini_authorize_url(state, challenge):
    params = {
        "client_id": GEMINI_OAUTH_CLIENT_ID,
        "redirect_uri": GEMINI_OAUTH_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile https://www.googleapis.com/auth/cloud-platform",
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "access_type": "offline",
        "prompt": "consent"
    }
    return "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)

class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(query)
        
        self.send_response(200)
        self.send_header('Content-type', 'text/html; charset=utf-8')
        self.end_headers()
        
        state_received = params.get('state', [''])[0]
        code = params.get('code', [''])[0]
        error = params.get('error', [''])[0]
        
        if error:
            self.wfile.write(f"<h2>로그인 실패 (로그인 오류)</h2><p>{error}</p>".encode('utf-8'))
        elif not code or state_received not in self.server.sessions:
            self.wfile.write(b"<h2>로그인 실패 (잘못된 요청 또는 세션 만료)</h2>")
        else:
            self.wfile.write(b"<h2>로그인 성공! 이 창을 닫고 프로그램으로 돌아가세요.</h2>")
            if self.server.callback:
                self.server.callback(state_received, code)
                
        # We don't shutdown immediately if we support multiple users, 
        # but to keep it simple, we let the server run if it's meant to handle multiple callbacks, 
        # but here we spawn a server per request. Actually, multiple users might click login simultaneously.
        # Let's keep the server alive instead of shutting down per request.
        # We'll just rely on the main loop.

class CallbackServerThread(threading.Thread):
    def __init__(self, callback):
        super().__init__()
        self.callback = callback
        self.server = None
        self.sessions = {}

    def run(self):
        try:
            self.server = HTTPServer(('127.0.0.1', 8085), CallbackHandler)
            self.server.sessions = self.sessions
            self.server.callback = self.callback
            self.server.serve_forever()
        except Exception as e:
            print(f"Callback server error: {e}")

# Global server instance
cb_server_thread = None

def get_gemini_oauth_token(user_id):
    token_file = get_token_file(user_id)
    if not token_file or not token_file.exists():
        return None
        
    try:
        with open(token_file, 'r', encoding='utf-8') as f:
            token_data = json.load(f)
            
        if time.time() < token_data.get('expires_at', 0) - 60:
            return token_data['access_token']
            
        refresh_token = token_data.get('refresh_token')
        if not refresh_token:
            return None
            
        url = "https://oauth2.googleapis.com/token"
        payload = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": GEMINI_OAUTH_CLIENT_ID
        }
        data = urllib.parse.urlencode(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
        
        ctx = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=10, context=ctx) as response:
            res = json.loads(response.read().decode('utf-8'))
            
        token_data['access_token'] = res['access_token']
        if 'refresh_token' in res:
            token_data['refresh_token'] = res['refresh_token']
        token_data['expires_at'] = time.time() + res.get('expires_in', 3600)
        
        with open(token_file, 'w', encoding='utf-8') as f:
            json.dump(token_data, f, ensure_ascii=False, indent=2)
            
        return token_data['access_token']
    except Exception as e:
        print(f"Failed to refresh Google OAuth token for {user_id}: {e}", file=sys.stderr)
        return None

def ensure_gemini_project_id(user_id, access_token):
    token_file = get_token_file(user_id)
    if token_file and token_file.exists():
        try:
            with open(token_file, 'r', encoding='utf-8') as f:
                token_data = json.load(f)
            if token_data.get('project_id'):
                return token_data.get('project_id')
        except Exception:
            pass
            
    url = "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist"
    payload = {
        "metadata": {
            "ideType": "IDE_UNSPECIFIED",
            "platform": "PLATFORM_UNSPECIFIED",
            "pluginType": "GEMINI"
        }
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}',
            'User-Agent': 'google-api-nodejs-client/9.15.1',
            'X-Goog-Api-Client': 'gl-node/22.17.0',
            'Client-Metadata': 'ideType=IDE_UNSPECIFIED,platform=PLATFORM_UNSPECIFIED,pluginType=GEMINI'
        }
    )
    
    try:
        ctx = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=10, context=ctx) as response:
            res = json.loads(response.read().decode('utf-8'))
            project_id = res.get('workspaceMetadata', {}).get('projectId')
            
            if project_id and token_file and token_file.exists():
                with open(token_file, 'r', encoding='utf-8') as f:
                    token_data = json.load(f)
                token_data['project_id'] = project_id
                with open(token_file, 'w', encoding='utf-8') as f:
                    json.dump(token_data, f, ensure_ascii=False, indent=2)
                    
            return project_id
    except Exception as e:
        print(f"Error fetching project ID for {user_id}: {e}")
        
    return None

def on_code_received(state, code):
    if state not in oauth_sessions:
        return
        
    session_data = oauth_sessions[state]
    user_id = session_data["user_id"]
    
    try:
        url = "https://oauth2.googleapis.com/token"
        payload = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": GEMINI_OAUTH_REDIRECT_URI,
            "client_id": GEMINI_OAUTH_CLIENT_ID,
            "code_verifier": session_data["verifier"]
        }
        data = urllib.parse.urlencode(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
        
        ctx = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=15, context=ctx) as response:
            res = json.loads(response.read().decode('utf-8'))
        
        email = None
        try:
            user_info_req = urllib.request.Request(
                "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
                headers={'Authorization': f"Bearer {res['access_token']}"}
            )
            with urllib.request.urlopen(user_info_req, timeout=10, context=ctx) as uinfo_res:
                uinfo = json.loads(uinfo_res.read().decode('utf-8'))
                email = uinfo.get('email')
        except Exception as ue:
            print(f"Could not retrieve user email: {ue}")
        
        token_data = {
            "access_token": res["access_token"],
            "refresh_token": res["refresh_token"],
            "expires_at": time.time() + res.get("expires_in", 3600),
            "email": email,
            "user_id": user_id
        }
        
        token_file = get_token_file(user_id)
        if token_file:
            with open(token_file, 'w', encoding='utf-8') as f:
                json.dump(token_data, f, ensure_ascii=False, indent=2)
        
        session_data["email"] = email
        session_data["success"] = True
        
        ensure_gemini_project_id(user_id, res["access_token"])
        
    except Exception as e:
        print(f"Token exchange error for {user_id}: {e}")
        session_data["error"] = f"토큰 교환 실패: {str(e)}"

# Start the callback server once globally
cb_server_thread = CallbackServerThread(on_code_received)
cb_server_thread.daemon = True
cb_server_thread.start()

@app.route('/oauth/start', methods=['POST'])
def oauth_start():
    req_data = request.json or {}
    user_id = req_data.get('user_id')
    
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
        
    try:
        verifier, challenge = generate_pkce()
        state = secrets.token_urlsafe(16)
        
        oauth_sessions[state] = {
            "user_id": user_id,
            "verifier": verifier,
            "state": state,
            "email": None,
            "error": None,
            "success": False
        }
        
        if cb_server_thread.server:
            cb_server_thread.server.sessions[state] = True
        
        auth_url = build_gemini_authorize_url(state, challenge)
        return jsonify({"url": auth_url, "state": state})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/oauth/status', methods=['GET'])
def oauth_status():
    user_id = request.args.get('user_id')
    state = request.args.get('state')
    
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    token_file = get_token_file(user_id)
    if token_file and token_file.exists():
        try:
            with open(token_file, 'r', encoding='utf-8') as f:
                token_data = json.load(f)
            token = get_gemini_oauth_token(user_id)
            if token:
                return jsonify({
                    "authenticated": True,
                    "email": token_data.get('email')
                })
        except Exception:
            pass
            
    if state and state in oauth_sessions:
        session_data = oauth_sessions[state]
        if session_data["success"]:
            return jsonify({
                "authenticated": True,
                "email": session_data["email"]
            })
        elif session_data["error"]:
            err = session_data["error"]
            return jsonify({
                "authenticated": False,
                "error": err
            })
        
    return jsonify({"authenticated": False})

@app.route('/api/generateContent', methods=['POST'])
def proxy_generate_content():
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return jsonify({"error": "X-User-Id header is required"}), 400

    access_token = get_gemini_oauth_token(user_id)
    if not access_token:
        return jsonify({"error": "Unauthorized"}), 401
        
    project_id = ensure_gemini_project_id(user_id, access_token)
    if not project_id:
        return jsonify({"error": "Could not determine GCP Project ID"}), 500
        
    req_data = request.json
    if not req_data:
        return jsonify({"error": "No payload provided"}), 400
        
    payload = {
        "project": project_id,
        "model": "models/gemini-2.5-flash",
        "request": req_data
    }
    
    url = "https://cloudcode-pa.googleapis.com/v1internal:generateContent"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}',
            'User-Agent': 'google-api-nodejs-client/9.15.1',
            'X-Goog-Api-Client': 'gl-node/22.17.0',
            'Client-Metadata': 'ideType=IDE_UNSPECIFIED,platform=PLATFORM_UNSPECIFIED,pluginType=GEMINI'
        }
    )
    
    try:
        ctx = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=30, context=ctx) as response:
            res = json.loads(response.read().decode('utf-8'))
            return jsonify(res)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        return jsonify({"error": f"Cloud Code API Error {e.code}", "details": error_body}), e.code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
