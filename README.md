# EventPass — Event Ticketing App

A mobile-first web app for managing up to 200 event tickets with QR code generation and camera-based check-in scanning.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Create admin account
```bash
node db/seed-admin.js admin yourpassword
```

### 3. Start the server
```bash
npm start
```

App runs at **http://localhost:3000**

---

## Pages

| URL | Description |
|-----|-------------|
| `/admin` | Admin dashboard (login required) |
| `/admin/scanner` | Camera QR scanner (login required) |
| `/admin/ticket/:token` | Ticket detail + scan history |
| `/t/:token` | Public ticket page (no login) |
| `/auth/login` | Admin login |

---

## Usage

### Generate Tickets
1. Login at `/admin`
2. Enter VIP count + General count → click **Generate**
3. Maximum 200 tickets total

### Share Tickets with Attendees
- From ticket detail page, copy the **Public Link** (`/t/<token>`)
- Attendees open the link on their phone and save the QR code screenshot

### Scan Tickets at Entry
1. Open `/admin/scanner` on a staff phone
2. Allow camera access
3. Point camera at ticket QR → see result in 1–2 seconds
4. Green = VALID ✅, Red = INVALID ❌, Yellow = VOIDED ⚠️
5. Tap the result card to dismiss and scan next ticket

### Re-entry
Re-scanning the same ticket is **allowed** and recorded. The overlay shows the entry count and last scan time.

### Void a Ticket
Admin → Ticket Detail → **Void Ticket**. Subsequent scans show VOIDED result.

---

## Configuration

Edit `.env`:
```env
PORT=3000
BASE_URL=http://localhost:3000       # Change to your public URL for QR links
JWT_SECRET=change_me_to_something_long_and_random
```

---

## Security

- Tokens: 32-char nanoid (~192-bit entropy), unguessable
- Passwords: bcrypt with cost factor 12
- Sessions: httpOnly + sameSite=strict JWT cookie (12h expiry)
- Rate limiting: 30 scan requests/minute per IP, 120 req/min globally
- Responses: strictly `valid` / `invalid` / `voided` — no partial info leaked

---

## Manual Test Plan

| Test | Steps | Expected |
|------|-------|----------|
| Admin login | Go to `/auth/login`, enter credentials | Redirected to dashboard |
| Wrong password | Enter wrong password | Error message, no cookie |
| Generate tickets | Enter 20 VIP + 30 General → Generate | 50 tickets appear in list |
| Over 200 limit | Try to generate beyond 200 | Error shown, no tickets created |
| View ticket | Click any ticket → View | QR image, type badge, empty scan history |
| Scan valid QR | Scanner → point at ticket QR | Green overlay, type shown, entry #1 |
| Re-entry | Scan same QR again | Green overlay, entry #2, last-scan time |
| Scan invalid | Type a random URL into scanner manually | Red INVALID overlay |
| Void ticket | Admin → ticket → Void → rescan | Yellow VOIDED overlay |
| Reactivate | Void → Reactivate → rescan | Green VALID again |
| Save QR | Public ticket page → Save QR | PNG downloads |

---

## Event-Day Checklist

- [ ] Server running and accessible (ideally over HTTPS / tunnel)
- [ ] Test scan with a real phone before guests arrive
- [ ] Ensure phone brightness is up for camera
- [ ] Scanner URL bookmarked on staff phones
- [ ] Staff logged in before the event starts
- [ ] Have an offline backup (printed QR list) for worst-case

## Mobile Browser Tips

- **HTTPS is required** for camera access in production. Use a reverse proxy (nginx + Let's Encrypt) or a tunnel like Cloudflare Tunnel / ngrok for local testing.
- If camera doesn't start: check browser permissions (Settings → Site Settings → Camera)
- For low-light scanning: use a phone with a good camera; the html5-qrcode library supports torch/flashlight via device API on Android Chrome.
- iOS Safari works with HTTPS. Chrome for iOS also works.

---

## Deployment (Production)

1. Set `BASE_URL` to your public domain (`https://tickets.example.com`)
2. Serve behind nginx with HTTPS (Let's Encrypt)
3. Set a strong `JWT_SECRET` (32+ random chars)
4. Run with a process manager: `pm2 start server.js`
5. Back up `db/tickets.db` regularly
