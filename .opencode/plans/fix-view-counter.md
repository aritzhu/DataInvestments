# Fix: Contador de vistas no se incrementa

## Problema
Race condition entre `loadUsage()` (Navbar) y `recordCompanyView()` (CompanyPage). Ambos se disparan al cargar la página cuando `user` cambia de null → objeto.

## Plan (3 cambios)

### 1. `Navbar.tsx` — Quitar useEffect de loadUsage
Eliminar el useEffect que llama `loadUsage()` cuando `user` cambia. La carga inicial ya se hace en `initAuth()` de AuthContext.

```tsx
// ELIMINAR estas líneas (líneas 26-28):
useEffect(() => {
  if (user) loadUsage();
}, [user]);
```

### 2. `CompanyPage.tsx` — Añadir recordCompanyView a deps
Añadir `recordCompanyView` al array de dependencias del useEffect que trackea vistas.

```tsx
// Cambiar:
}, [ticker, user]);
// Por:
}, [ticker, user, recordCompanyView]);
```

### 3. `AuthContext.tsx` — Añadir loadUsage en login/register/google
Añadir `loadUsage()` después de login, register y loginWithGoogle para que el usage se cargue al autenticarse.

```tsx
// En login(), register(), loginWithGoogle(): añadir al final:
await loadUsage();
```

## Verificación
1. Login → contador muestra 0/3
2. Visitar empresa → contador muestra 1/3
3. Visitar 2 empresas más → contador muestra 3/3
4. Visitar 4ta empresa → PaywallModal aparece
