#!/usr/bin/env python3
"""
Simple Python Flask app for AWS Lesson 2
Alternative to Node.js version
"""

from flask import Flask, jsonify, request
import socket
import platform
import os
from datetime import datetime

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({
        'message': 'Hello from EC2! 🚀',
        'hostname': socket.gethostname(),
        'platform': platform.system(),
        'python_version': platform.python_version(),
        'timestamp': datetime.now().isoformat(),
        'environment': os.environ.get('FLASK_ENV', 'development')
    })

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/info')
def info():
    return jsonify({
        'server': {
            'hostname': socket.gethostname(),
            'platform': platform.system(),
            'python_version': platform.python_version()
        },
        'request': {
            'ip': request.remote_addr,
            'method': request.method,
            'path': request.path
        }
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port, debug=True)
