# Tasouwk Dashboard

Admin dashboard for Jomran, built with React 19, Vite, Ant Design, and Tailwind CSS.

## Requirements

- Node.js 20+ (recommended for Vite 8)

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` as needed. `VITE_API_BASE_URL` is the API base URL (no trailing slash; defaults to `https://test.taswouk.com` in code if unset). If authenticated requests fail with 401, try `VITE_AUTH_SCHEME=JWT` per `.env.example`.

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Start dev server (Vite)  |
| `npm run build` | Production build        |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint               |

## Stack

- [Vite](https://vite.dev) with [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react)
- [React Router](https://reactrouter.com)
- [Ant Design](https://ant.design) and [Tailwind CSS](https://tailwindcss.com)
- [Zustand](https://zustand-demo.pmnd.rs) for client state
- [Axios](https://axios-http.com) for HTTP

## Remote (GitLab)

```bash
git remote add origin https://gitlab.com/majdSayouh/taswouk-admin-panel.git
git branch -M main
git push -uf origin main
```

(Use only if this repo is not already connected to a remote.)
