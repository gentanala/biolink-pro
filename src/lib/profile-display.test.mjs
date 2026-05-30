import assert from 'node:assert/strict'
import { getCompanyDisplayName } from './profile-display.mjs'

assert.equal(getCompanyDisplayName('Gentanala'), 'Gentanala')
assert.equal(getCompanyDisplayName({ name: 'Gentanala', logo_url: '/logo.png' }), 'Gentanala')
assert.equal(getCompanyDisplayName(null), '')
assert.equal(getCompanyDisplayName({ logo_url: '/logo.png' }), '')
