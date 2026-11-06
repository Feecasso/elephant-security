# Elephant Security & Tech Support

A responsive website for an independent IT technician and cybersecurity specialist serving small businesses and home users.

## Live site

Published with GitHub Pages at:

https://feecasso.github.io/elephant-security/

The static frontend is served from the `main` branch root. `.nojekyll` disables Jekyll processing so the CSS, JavaScript, and SVG assets are published as-is.

## Run locally

```bash
npm start
```

Open `http://localhost:3000`.

The project has no runtime dependencies and requires Node.js 18 or newer.

## Contact form

The live GitHub Pages deployment is static and cannot run `server.js` or the `/api/contact` endpoint. The consultation form is therefore disabled and clearly labeled as offline, and no inquiries are collected or transmitted on the live site.

`data/inquiries.jsonl` is ignored by Git and is not deployed.

The local Node server still includes the contact endpoint for future development, but enabling the form requires a hosted backend plus restoring the form controls and submission handler. Do not enable the form in the static deployment without a working backend and an approved data-handling process.

## Validation

```bash
npm run check
npx --yes html-validate index.html
npx --yes csstree-validator styles.css
```

## Service scope

The website intentionally avoids unsupported enterprise claims. It does not advertise guaranteed data recovery, guaranteed response times, a staffed 24/7 SOC, forensic investigations, or enterprise-scale security operations. Managed services and SIEM integration are presented as optional and subject to the client’s environment, tooling, licensing, and a written service agreement.

## Project structure

```text
.
├── .nojekyll
├── assets/elephant-mark.svg
├── data/.gitkeep
├── index.html
├── script.js
├── server.js
├── styles.css
├── package.json
└── README.md
```
