# Whack-a-Mole GitHub Pages Deploy

This project is prepared as a static web app for GitHub Pages.

## Included deploy files

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`
- `.nojekyll`
- `icon-192.png`
- `icon-512.png`
- `apple-touch-icon.png`

## Deploy steps

1. Upload this folder to a GitHub repository.
2. Open `Settings > Pages` in the repository.
3. Choose `Deploy from a branch`.
4. Select `main` or `master` and use `/ (root)`.
5. Save and wait for the GitHub Pages URL to be generated.

## Notes

- Asset paths are relative, so the app works on GitHub Pages project URLs.
- `manifest.webmanifest` and `sw.js` are included for installable web app behavior.
