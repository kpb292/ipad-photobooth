# Free iPad Event Photo Booth

A no-subscription, customizable iPad photo booth that runs as a web app.

## Included
- Front-camera preview
- 3-second countdown
- Mirrored capture
- Landscape, portrait, and square formats
- Four built-in themes
- Transparent PNG frame upload
- Download and iOS Share Sheet
- Optional EmailJS integration
- Offline app shell after first load
- Admin settings protected by PIN `2468`

## Important limitations
- A browser cannot silently text an image. The **Share** button opens the iOS Share Sheet, where a guest can choose Messages, Mail, AirDrop, or Save Image.
- Guided Access may need the share destination app to be allowed; test this before the event.
- EmailJS has a free tier, but account limits and attachment/message-size limits apply. This app sends the image as a base64 template variable.
- Direct SMS delivery requires a paid SMS provider or your own backend.

## Fast free hosting: GitHub Pages
1. Create a free GitHub repository.
2. Upload all files in this folder.
3. Open repository **Settings → Pages**.
4. Set source to **Deploy from a branch**, branch `main`, folder `/root`.
5. Open the generated HTTPS URL on the iPad.
6. Allow camera access.
7. Safari Share button → **Add to Home Screen**.
8. Launch from the new icon.

Camera access requires HTTPS. Opening `index.html` directly from Files will not work reliably.

## Customize on the iPad
1. Tap the gear.
2. Enter PIN `2468`.
3. Change title, footer, theme, ratio, and optional frame.
4. For a frame, use a transparent PNG in the selected ratio:
   - 4:3: 1800 × 1350
   - 3:4: 1350 × 1800
   - 1:1: 1800 × 1800

To change the PIN, edit this line in `app.js`:

```js
if(pin!=='2468') return;
```

## Optional free email setup with EmailJS
1. Create an EmailJS account.
2. Connect an email service.
3. Create a template using:
   - `{{to_email}}`
   - `{{event_name}}`
   - `{{photo_data}}`
4. Configure the template recipient as `{{to_email}}`.
5. Put the image in the email template using an HTML image tag with `src="{{photo_data}}"`, if supported by your template editor.
6. Enter the Public Key, Service ID, and Template ID in Admin Settings.

Because base64 images are large, test delivery. Some providers may reject large messages.

## Lock the iPad for the event
1. Turn on a Focus mode and silence all notifications.
2. Disable notification previews.
3. Open **Settings → Accessibility → Guided Access** and enable it.
4. Set a Guided Access passcode.
5. Launch the Photo Booth Home Screen app.
6. Triple-click the Side/Home button.
7. Disable hardware buttons and keyboard access as appropriate.
8. Start Guided Access.

## Recommended event workflow
- Keep the iPad plugged into power.
- Disable Auto-Lock or set a long interval before Guided Access.
- Use a stable stand and front-facing light.
- Test Share, Messages/Mail, camera permissions, and network at the venue.
- Use **Done** after each guest to clear the previous image from the booth screen.
