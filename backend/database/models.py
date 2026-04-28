import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "payguard_audit.db")

def get_connection():
    return sqlite3.connect(DB_PATH)

def initialize_database():
    conn = get_connection()
    c = conn.cursor()
    # Immutable Execution/Audit Log Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id TEXT NOT NULL,
            action TEXT NOT NULL,
            status TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            request_payload TEXT,
            response_payload TEXT,
            execution_delay REAL
        )
    ''')
    
    # State tracking table for ARDG tasks
    c.execute('''
        CREATE TABLE IF NOT EXISTS action_state (
            case_id TEXT NOT NULL,
            action TEXT NOT NULL,
            current_state TEXT NOT NULL,
            attempts INTEGER DEFAULT 0,
            last_updated TEXT NOT NULL,
            PRIMARY KEY (case_id, action)
        )
    ''')
    conn.commit()
    conn.close()

def log_audit(case_id, action, status, req_payload, res_payload, delay=0.0):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        INSERT INTO audit_logs (case_id, action, status, timestamp, request_payload, response_payload, execution_delay)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (case_id, action, status, datetime.now().isoformat(), json.dumps(req_payload), json.dumps(res_payload), delay))
    conn.commit()
    conn.close()

def set_action_state(case_id, action, state, increment_attempt=False):
    conn = get_connection()
    c = conn.cursor()
    
    # Check if exists
    c.execute("SELECT attempts FROM action_state WHERE case_id=? AND action=?", (case_id, action))
    row = c.fetchone()
    
    attempts = 1 if increment_attempt else 0
    if row:
        attempts = row[0] + 1 if increment_attempt else row[0]
        c.execute('''
            UPDATE action_state 
            SET current_state=?, last_updated=?, attempts=? 
            WHERE case_id=? AND action=?
        ''', (state, datetime.now().isoformat(), attempts, case_id, action))
    else:
        c.execute('''
            INSERT INTO action_state (case_id, action, current_state, attempts, last_updated)
            VALUES (?, ?, ?, ?, ?)
        ''', (case_id, action, state, attempts, datetime.now().isoformat()))
        
    conn.commit()
    conn.close()

def get_action_state(case_id, action):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT current_state, attempts FROM action_state WHERE case_id=? AND action=?", (case_id, action))
    row = c.fetchone()
    conn.close()
    return {"state": row[0], "attempts": row[1]} if row else None

def already_executed(case_id, action) -> bool:
    res = get_action_state(case_id, action)
    if not res:
         return False
    state = res["state"]
    return state in ["SUCCESS", "PENDING", "EXECUTING"]

# Run init immediately on import
initialize_database()
