#!/bin/bash
# Eseguire ogni ora via crontab:
# 0 * * * * /opt/booking-corsi/python_app/cron_reminder.sh >> /var/log/booking-reminder.log 2>&1
APP_URL="${APP_URL:-http://localhost:5000}"
SECRET_KEY="${SECRET_KEY:-}"
curl -s -X POST "${APP_URL}/admin/cron/reminder-scadenza" \
     -H "X-Cron-Token: ${SECRET_KEY}" \
     -o /dev/null -w "%{http_code}"
