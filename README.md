# ITS Admin Portal

An IT Support Ticketing System — React frontend + Node.js backend, deployed to AWS EC2 via Terraform with full CI/CD.

---

## Quick Start (Local)

```bash
# Terminal 1 — Backend
cd backend && npm install && npm start

# Terminal 2 — Frontend
cd frontend && npm install && npm start
```

- Frontend: http://localhost:3000
- Backend:  http://localhost:3001

---

## Project Structure

```
its-admin/
├── .github/workflows/deploy.yml   ← CI/CD pipeline (GitHub Actions)
├── backend/
│   ├── server.js                  ← Express REST API (port 3001)
│   ├── tickets.js                 ← CRUD routes + JSON file persistence
│   └── package.json
└── frontend/
    ├── src/App.jsx                ← Full React UI
    ├── vite.config.js
    └── package.json
```

---

## CI/CD — GitHub Actions

Every push to `main` automatically:
1. Builds the React frontend with Vite
2. Deploys backend files to EC2 via rsync
3. Deploys the built frontend dist to EC2
4. Restarts both processes with PM2
5. Runs a health check against `/health`

### Required GitHub Secrets

Go to your repo → **Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|---|---|
| `EC2_HOST` | Your EC2 public IP (e.g. `13.x.x.x`) |
| `EC2_SSH_KEY` | Contents of your `.pem` key file (the full private key) |

---

## Deployment (Terraform)

```bash
cd ITS-ADMIN/

# First time only — create S3 + DynamoDB for remote state
./bootstrap-remote-state.sh

# Then uncomment the backend block in main.tf and run:
terraform init
terraform plan
terraform apply
```

After apply, Terraform prints:
```
frontend_url = "http://<ip>:3000"
backend_url  = "http://<ip>:3001"
ssh_command  = "ssh -i mykey-12.pem ec2-user@<ip>"
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /health | Health check |
| GET | /tickets | List all tickets |
| GET | /tickets/:id | Get one ticket |
| POST | /tickets | Create ticket |
| PUT | /tickets/:id | Update ticket |
| DELETE | /tickets/:id | Delete ticket |

---

## Monitoring

CloudWatch alarms are configured for:
- **CPU > 80%** for 10 minutes
- **Instance health check failure**

Alerts are sent to the email in `var.alert_email` via SNS.

To confirm your email subscription, check your inbox after `terraform apply` and click the confirmation link.

---

## Troubleshooting

**App not loading after EC2 deploy:**
```bash
ssh -i mykey-12.pem ec2-user@<ip>
cat /var/log/userdata.log   # startup log
pm2 status                  # check if processes are running
pm2 logs its-backend        # backend logs
pm2 logs its-frontend       # frontend logs
```

**Restart processes manually:**
```bash
pm2 restart its-backend
pm2 restart its-frontend
```
