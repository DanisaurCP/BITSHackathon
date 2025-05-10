from flask import Flask, render_template, request, jsonify
import json
import os

app = Flask(__name__)

REPORTS_FILE = 'reports.json'

# Load or create reports file
if not os.path.exists(REPORTS_FILE):
    with open(REPORTS_FILE, 'w') as f:
        json.dump([], f)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/report', methods=['POST'])
def report():
    data = request.json
    with open(REPORTS_FILE, 'r+') as f:
        reports = json.load(f)
        reports.append(data)
        f.seek(0)
        json.dump(reports, f, indent=2)
    return jsonify({'message': 'Report submitted successfully'})

@app.route('/status')
def status():
    with open(REPORTS_FILE) as f:
        reports = json.load(f)
    report_count = len(reports)
    status = "Unconfirmed"
    if report_count >= 3:
        status = "Likely Incident"
    return jsonify({'report_count': report_count, 'status': status})

if __name__ == '__main__':
    app.run(debug=True)
