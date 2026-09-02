# Plan: Tareas de Seguridad → SEO → Cookies → A11y → Performance

## Instrucciones
Cada tarea es un paso pequeño y atacable de forma independiente. Se ejecutan en orden.

---

## FASE 1: SEGURIDAD

- [ ] **T-1.1** `backend/package.json` — Añadir dependencia `helmet`
- [ ] **T-1.2** `backend/src/server.ts` — Importar y añadir `app.use(helmet())` después de `cors` (con CSP configurado para Google Fonts + GA)
- [ ] **T-1.3** `backend/package.json` — Añadir dependencia `express-rate-limit`
- [ ] **T-1.4** `backend/src/server.ts` — Añadir rate limiter general (100 req/15min por IP)
- [ ] **T-1.5** `backend/src/server.ts` — Añadir rate limiter para `/api/auth` (10 intentos/15min por IP)
- [ ] **T-1.6** `backend/src/server.ts` — Añadir rate limiter para upload (5/hora) y settings write (10/hora)
- [ ] **T-1.7** `backend/src/server.ts` — Cambiar CORS de `origin: true` a lista explícita de dominios permitidos
- [ ] **T-1.8** `backend/src/server.ts` — Modificar error handler final para no exponer `err.message`, devolver `requestId`
- [ ] **T-1.9** `frontend/nginx.conf` — Añadir headers de seguridad (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- [ ] **T-1.10** Verificar si HTTPS ya está configurado en el gateway externo. Si no, documentar cómo añadirlo

---

## FASE 2: SEO

- [ ] **T-2.1** `frontend/index.html` — Añadir meta tags Open Graph (og:title, og:description, og:type, og:url, og:image, og:locale)
- [ ] **T-2.2** `frontend/index.html` — Añadir meta tags Twitter Card (twitter:card, twitter:title, twitter:description, twitter:image)
- [ ] **T-2.3** `frontend/public/` — Crear imagen `og-image.png` (1200x630px) con logo de DataInvestments
- [ ] **T-2.4** `frontend/index.html` — Añadir JSON-LD estructurado (Schema.org WebSite + SearchAction)
- [ ] **T-2.5** `frontend/` — Instalar dependencia `react-helmet-async`
- [ ] **T-2.6** `frontend/src/App.tsx` — Envolver app con `<HelmetProvider>`
- [ ] **T-2.7** `frontend/src/components/Landing.tsx` — Añadir `<Helmet>` con title, description, canonical, og tags
- [ ] **T-2.8** `frontend/src/components/CompanyPage.tsx` — Añadir `<Helmet>` con title dinámico ({ticker} - {name}), description, canonical, og tags
- [ ] **T-2.9** `backend/src/server.ts` — Añadir endpoint `GET /sitemap.xml` que genere sitemap dinámico desde la DB (todas las empresas activas + páginas estáticas)
- [ ] **T-2.10** `frontend/public/sitemap.xml` — Eliminar sitemap estático (ya lo genera el backend)

---

## FASE 3: COOKIES / GDPR

- [ ] **T-3.1** `frontend/` — Instalar dependencia `react-cookie-consent`
- [ ] **T-3.2** Crear `frontend/src/components/CookieConsentBanner.tsx` con botones Aceptar/Rechazar y link a política de cookies
- [ ] **T-3.3** `frontend/src/styles/` — Crear `cookies.css` con estilos del banner (coherentes con theme dark/light)
- [ ] **T-3.4** `frontend/src/hooks/useAnalytics.ts` — Modificar `useInitAnalytics` para solo cargar GA si `localStorage di-analytics-consent` !== 'denied'
- [ ] **T-3.5** `frontend/src/App.tsx` — Importar y renderizar `<CookieConsentBanner />` dentro del Router

---

## FASE 4: ACCESIBILIDAD

- [ ] **T-4.1** `frontend/src/App.tsx` — Añadir link "Saltar al contenido principal" (`<a href="#main-content" className="skip-to-content">`)
- [ ] **T-4.2** `frontend/src/App.tsx` — Añadir `id="main-content"` al `<main>`
- [ ] **T-4.3** `frontend/src/styles/ui.css` — Añadir estilos `.skip-to-content` (oculto por defecto, visible con `:focus`)
- [ ] **T-4.4** `frontend/src/styles/ui.css` — Añadir estilos globales `:focus-visible` (outline con color accent)
- [ ] **T-4.5** `frontend/src/components/Navbar.tsx` — Revisar y añadir `aria-label` a selects de filtro, botón de tema, botones de nav
- [ ] **T-4.6** `frontend/src/components/Navbar.tsx` — Añadir `aria-current="page"` a links de navegación activos
- [ ] **T-4.7** `frontend/src/components/CompanyPage.tsx` — Añadir `role="dialog" aria-modal="true"` a modales de portfolio y alarmas
- [ ] **T-4.8** `frontend/src/components/tabs/ValuationTab.tsx` — Revisar y añadir `aria-label` a botones de acción (icon buttons)

---

## FASE 5: RENDIMIENTO

- [ ] **T-5.1** `frontend/src/App.tsx` — Añadir `fallback` al `<Suspense>` con Skeleton (evitar pantalla blanca)
- [ ] **T-5.2** `frontend/src/components/ProtectedRoute.tsx` — Añadir Skeleton durante `loading` (evitar flash de UI vacío)
- [ ] **T-5.3** Descargar fuentes Fraunces e Instrument Sans y mover a `frontend/public/fonts/`
- [ ] **T-5.4** Crear `frontend/public/fonts/fonts.css` con `@font-face` apuntando a los .woff2 locales
- [ ] **T-5.5** `frontend/index.html` — Reemplazar enlace de Google Fonts por preload local + link a `fonts/fonts.css`
- [ ] **T-5.6** Verificar imports de Recharts en `ValuationChart.tsx` y `MarketComparisonChart.tsx` — optimizar si es necesario

---

## Verificación Final

- [ ] **V-1** Abrir https://securityheaders.com con el dominio → comprobar que los headers aparecen
- [ ] **V-2** Abrir Google Rich Results Test → comprobar que la página pasa
- [ ] **V-3** En DevTools → Application → verificar que GA no se carga si se rechazan cookies
- [ ] **V-4** Ejecutar Lighthouse audit → comprobar score Accessibility > 90
- [ ] **V-5** Navegar entre páginas → comprobar que no hay pantalla blanca al cambiar de ruta
