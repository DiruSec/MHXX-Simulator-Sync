#!/usr/bin/python3
# -*- coding: utf-8 -*-
import sys
import json
import cgi
import pymysql
import configparser
from datetime import datetime as dt

resultJSON = {}
def sentJSON():
    print("Content-Type: application/json")
    print("\n")
    print("\n")
    print(json.dumps(resultJSON,indent=1))
def setJSON(status, message):
    resultJSON["status"] = status
    resultJSON["message"] = message
    
try:
    configFile = configparser.ConfigParser()
    configFile.read(sys.path[0] + "/config.ini")
    config = configFile["Connection"]
    db = pymysql.connect(host=config["Host"], user=config["User"], \
         passwd=config["Password"], db=config["Scheme"], port=int(config["Port"]), use_unicode=True, charset="utf8")
    cursor = db.cursor()
except:
    setJSON("error", "Error while connecting to database.")
    sentJSON()
    sys.exit(0)

form = cgi.FieldStorage()
mode = str(form.getlist("mode")[0])
syncid = str(form.getlist("syncid")[0])

if (mode == 'send'):
    data = str(form.getlist("data")[0])
    time = dt.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        insertSql = '''INSERT INTO mhxxsync (sync_id, data, time) VALUES (%s,%s,%s) on duplicate key update data=%s,time=%s'''
        insertVari = (syncid, str(data), time, str(data), time)
        cursor.execute(insertSql, insertVari)
        setJSON("success","Saving data completed.")
    except:
        setJSON("error","Error while saving data.")
        
if (mode == 'receive'):
    try:
        readSql = '''select data from mhxxsync where sync_id = %s'''
        readVari = syncid
        cursor.execute(readSql, readVari)
        resultJSON["data"] = cursor.fetchall()[0]
        setJSON("success","Load data completed.")
    except:
        setJSON("error","Error while loading data.")

sentJSON()

#Close database
db.commit()
cursor.close()
db.close()
