# Elephant Security & Tech Support

A responsive website for an independent IT technician and cybersecurity specialist serving small businesses and home users.

## Run locally

```bash
npm start
```

Open `http://localhost:3000`.

The project has no runtime dependencies and requires Node.js 18 or newer.

## Contact form

Consultation requests are posted to `/api/contact` and stored locally in `data/inquiries.jsonl`. The data file is ignored by Git and is written with restrictive permissions.

The form does not send email. Before publishing, configure an email notification workflow or another approved delivery process, and ensure the data file is backed up and handled according to the business privacy policy.

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
├── assets/elephant-mark.svg
├── data/.gitkeep
├── index.html
├── script.js
├── server.js
├── styles.css
├── package.json
└── README.md
```
