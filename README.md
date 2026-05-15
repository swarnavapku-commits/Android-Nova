# Android Nova

Mobile-first web app frontend for Nova AI. It is separate from the Python desktop app and does not delete or modify the existing desktop code.

## Run Locally

Open `index.html` in a browser, or serve this folder:

```powershell
cd /d "E:\ai & coding\NovaAI\android nova"
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

On Android, open the same URL from your phone if your PC and phone are on the same Wi-Fi and your firewall allows it.

## Notes

- Gemini streaming can work directly from the browser when an API key is pasted, but exposing API keys in browser apps is not safe for public release.
- Ollama from Android needs a small backend bridge because Android browser cannot safely call your PC's local Ollama service by default.
- The app is PWA-ready with `manifest.webmanifest` and `sw.js`.
