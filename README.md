# LAN Screen Share

A small, consent-based screen-sharing dashboard for laptops on the same Wi-Fi network.

## What it does
- Multiple laptops can join the same room.
- One laptop at a time can actively share its screen.
- The person at the sharing laptop must click **Share this screen** and approve the browser's screen-selection prompt.
- Viewers can watch the shared screen and use fullscreen.
- There is no remote control, keystroke capture, hidden recording, or background monitoring.

## Requirements
- Node.js 18 or newer on the laptop acting as the host.
- A modern browser with WebRTC and `getDisplayMedia` support.
- All laptops on the same trusted Wi-Fi/LAN.
- HTTPS with a certificate trusted by the devices. Browsers restrict screen capture on ordinary LAN HTTP pages.

## Setup (host laptop)

1. Install Node.js.
2. Install `mkcert` (https://github.com/FiloSottile/mkcert) on the host.
3. In this folder, run:

   ```bash
   mkcert -install
   mkcert localhost 127.0.0.1 ::1 YOUR_HOST_LAN_IP
   ```

   Replace `YOUR_HOST_LAN_IP` with the host laptop's local Wi-Fi IP address. The command creates a certificate and key. Rename the generated `localhost+...pem` certificate to `cert.pem` and the `localhost+...-key.pem` key to `key.pem`, and put both in this folder.

4. Install dependencies and start the server:

   ```bash
   npm install
   npm start
   ```

5. The terminal prints an address such as `https://192.168.1.25:8443`. Open that address on each laptop.

## Trusting the certificate on the other laptops

For the browser to allow screen sharing from a LAN address, the certificate must be trusted by each laptop. For a personal/trusted network, install the mkcert local CA root certificate on each viewer/sharer laptop using mkcert's documented `rootCA.pem` installation steps for that operating system. Do not send your CA private key (`rootCA-key.pem`) to anyone. If certificate trust is not configured, screen capture may be blocked by the browser.

## Use

1. Open the same HTTPS address on all laptops.
2. Enter the same room code and a recognizable device name.
3. Click **Connect**.
4. On the laptop whose screen should be visible, click **Share this screen** and select a screen or window in the browser prompt.
5. Other connected laptops see the shared screen in the viewer.
6. Click **Stop sharing** when finished.

Only one laptop can share at a time. Use a non-public room code and only on a network you trust. The room code is a convenience, not strong authentication. This demo does not encrypt or authenticate users beyond HTTPS transport and room membership; do not use it on public or untrusted networks.

## Troubleshooting
- If the page loads but sharing is unavailable, check that the browser shows a trusted HTTPS connection.
- Allow the host's port `8443` through the host firewall for your private network only.
- Make sure every laptop is on the same Wi-Fi and uses the same room code.
- Keep the host terminal running.
