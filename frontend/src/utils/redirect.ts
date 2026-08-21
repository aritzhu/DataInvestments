export function getSafeRedirect(param: string | null | undefined): string {
  if (param && param.startsWith('/') && !param.startsWith('//')) return param;
  return '/';
}

export function withRedirect(path: string, redirect: string): string {
  return redirect === '/'
    ? path
    : `${path}?redirect=${encodeURIComponent(redirect)}`;
}
