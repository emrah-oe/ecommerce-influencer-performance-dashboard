import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')

  if (authHeader?.startsWith('Basic ')) {
    const decoded = atob(authHeader.slice('Basic '.length))
    const colonIndex = decoded.indexOf(':')
    const username = decoded.slice(0, colonIndex)
    const password = decoded.slice(colonIndex + 1)

    const expectedUser = process.env.DASHBOARD_BASIC_AUTH_USER
    const expectedPass = process.env.DASHBOARD_BASIC_AUTH_PASSWORD

    if (expectedUser && expectedPass && username === expectedUser && password === expectedPass) {
      return NextResponse.next()
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Dashboard", charset="UTF-8"' },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)'],
}
