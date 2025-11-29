export function load({ url }) {
  return { path: url.searchParams.get('path') }
}