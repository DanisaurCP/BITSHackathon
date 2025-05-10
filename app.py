from flask import Flask, render_template, request, jsonify
import json, os, uuid

app = Flask(__name__)

REPORTS_FILE = 'reports.json'

# Ensure reports file exists
if not os.path.exists(REPORTS_FILE):
    with open(REPORTS_FILE, 'w') as f:
        json.dump([], f)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/report', methods=['POST'])
def report():
    data = request.json
    data['id'] = str(uuid.uuid4())  # unique report ID
    data['confirmations'] = 1
    data['confirmed_by'] = [data.get('user_id', 'anon')]
    with open(REPORTS_FILE, 'r+') as f:
        reports = json.load(f)
        reports.append(data)
        f.seek(0)
        json.dump(reports, f, indent=2)
    return jsonify({'message': 'Report received'})

@app.route('/confirm', methods=['POST'])
def confirm_report():
    req = request.json
    report_id = req['id']
    user_id = req.get('user_id', 'anon')

    with open(REPORTS_FILE, 'r+') as f:
        reports = json.load(f)
        for r in reports:
            if r['id'] == report_id:
                if user_id not in r['confirmed_by']:
                    r['confirmations'] += 1
                    r['confirmed_by'].append(user_id)
                break
        f.seek(0)
        f.truncate()
        json.dump(reports, f, indent=2)
    return jsonify({'message': 'Confirmation added'})

@app.route('/delete', methods=['POST'])
def delete_report():
    req = request.json
    report_id = req['id']
    user_id = req['user_id']

    with open(REPORTS_FILE, 'r+') as f:
        reports = json.load(f)
        updated = [r for r in reports if not (r['id'] == report_id and r['user_id'] == user_id)]
        f.seek(0)
        f.truncate()
        json.dump(updated, f, indent=2)
    return jsonify({'message': 'Report deleted'})

@app.route('/status')
def status():
    with open(REPORTS_FILE) as f:
        reports = json.load(f)
    count = len(reports)
    status = "Unconfirmed"
    if count >= 3:
        status = "Likely Incident"
    return jsonify({'status': status, 'report_count': count})


@app.route('/getReports')
def get_reports():
    with open(REPORTS_FILE) as f:
        reports = json.load(f)
    return jsonify(reports)

if __name__ == '__main__':
    app.run(debug=True)
