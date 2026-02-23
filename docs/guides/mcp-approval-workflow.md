# MCP Tool Approval Workflow

**Quick Reference for @qa (Quinn)**

Last Updated: 2026-02-23
Status: ✅ Live on Railway

---

## 🔐 Your Role

You are the **sole approval authority** for all AIOS tool executions from Lovable.

Every tool request must be approved by you before execution.

---

## 📊 Workflow at a Glance

```
User → Lovable → Tool Request → @qa Review → Approve/Reject → Execution
```

---

## 🚀 Quick Start

### **1️⃣ Check Pending Requests**

```bash
curl -H "Authorization: Bearer aios_lovable_mlyixanmi1ooyce8ys" \
  https://aios-lovable-mcp-production-6f63.up.railway.app/api/approval/pending
```

Response shows list of pending requests with IDs.

### **2️⃣ Review Request Details**

Look at:
- **Tool**: Which AIOS tool?
- **Input**: What parameters?
- **Requested at**: When was it submitted?

### **3️⃣ Approve or Reject**

**To Approve:**
```bash
curl -X POST \
  -H "Authorization: Bearer aios_lovable_mlyixanmi1ooyce8ys" \
  https://aios-lovable-mcp-production-6f63.up.railway.app/api/approval/{REQUEST_ID}/approve
```

**To Reject:**
```bash
curl -X POST \
  -H "Authorization: Bearer aios_lovable_mlyixanmi1ooyce8ys" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Missing required input"}' \
  https://aios-lovable-mcp-production-6f63.up.railway.app/api/approval/{REQUEST_ID}/reject
```

---

## 🛠️ Available Tools (You Can Approve)

1. **aios_strategize** - Product strategy & PRD
2. **aios_design_ux** - Design systems
3. **aios_design_architecture** - System design
4. **aios_generate_code** - Code generation
5. **aios_full_pipeline** - End-to-end pipeline
6. **aios_get_status** - Status checks
7. **aios_get_artifact** - Download artifacts

---

## ✅ Approval Checklist

- [ ] Tool is in the approved list (above)
- [ ] Input parameters are complete
- [ ] No sensitive information exposed
- [ ] Request is reasonable/legitimate
- [ ] No suspicious patterns

---

## ❌ Rejection Reasons

Use these when rejecting:

- "Missing required parameter: X"
- "Input contains invalid data type"
- "Security concern: credentials in payload"
- "Out of scope - not an AIOS tool"
- "Rate limit concern - too many requests"
- "Suspicious pattern detected"

---

## 📈 Tracking

Check approval history and report:

```bash
curl -H "Authorization: Bearer aios_lovable_mlyixanmi1ooyce8ys" \
  https://aios-lovable-mcp-production-6f63.up.railway.app/api/approval/report
```

Shows: pending count, approved count, rejected count

---

## 🔒 Security Notes

- All requests are logged with timestamp
- All approvals are audited
- No bypasses exist
- You are the only gatekeeper
- Rejected requests are final (not retryable)

---

## 📞 Need Help?

Contact: @aios-master or check `.aios-core/development/tasks/qa-approve-mcp-requests.md`

---

## 🚨 Emergency: System Not Responding

If approval endpoints are down:
1. Check Railway dashboard: https://railway.app
2. Check server health: `/health` endpoint
3. Contact DevOps or @devops

API Key: `aios_lovable_mlyixanmi1ooyce8ys` (never share!)
