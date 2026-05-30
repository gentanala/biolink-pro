import assert from 'node:assert/strict'
import { getOAuthCallbackUrl } from './oauth-redirect.mjs'

assert.equal(
    getOAuthCallbackUrl(new URL('http://localhost:3000/?code=abc123'))?.toString(),
    'http://localhost:3000/auth/callback?code=abc123&next=%2Fdashboard'
)

assert.equal(
    getOAuthCallbackUrl(new URL('http://localhost:3000/login?code=abc123&next=%2Fadmin'))?.toString(),
    'http://localhost:3000/auth/callback?code=abc123&next=%2Fadmin'
)

assert.equal(
    getOAuthCallbackUrl(new URL('http://localhost:3000/'))?.toString(),
    undefined
)
