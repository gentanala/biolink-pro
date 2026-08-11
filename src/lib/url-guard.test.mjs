// Cek penjaga URL. Jalankan: node src/lib/url-guard.test.mjs
import assert from 'node:assert/strict'
import { hasAllowedProtocol, isBlockedAddress, isBlockedHostname } from './url-guard.mjs'

// Protokol
assert.equal(hasAllowedProtocol('https://toko.com'), true)
assert.equal(hasAllowedProtocol('http://toko.com'), true)
assert.equal(hasAllowedProtocol('file:///etc/passwd'), false)
assert.equal(hasAllowedProtocol('data:text/html,x'), false)
assert.equal(hasAllowedProtocol('bukan url'), false)

// Hostname
assert.equal(isBlockedHostname('toko.com'), false)
assert.equal(isBlockedHostname('localhost'), true)
assert.equal(isBlockedHostname('LOCALHOST'), true)
assert.equal(isBlockedHostname('printer.local'), true)
assert.equal(isBlockedHostname('api.internal'), true)
assert.equal(isBlockedHostname(''), true)

// Alamat publik lolos
assert.equal(isBlockedAddress('142.250.190.78'), false)
assert.equal(isBlockedAddress('8.8.8.8'), false)
assert.equal(isBlockedAddress('2404:6800:4003::200e'), false)

// Loopback & privat ditolak
assert.equal(isBlockedAddress('127.0.0.1'), true)
assert.equal(isBlockedAddress('10.1.2.3'), true)
assert.equal(isBlockedAddress('192.168.1.1'), true)
assert.equal(isBlockedAddress('172.16.0.1'), true)
assert.equal(isBlockedAddress('172.31.255.255'), true)
// 172.32 sudah di luar rentang privat, harus lolos.
assert.equal(isBlockedAddress('172.32.0.1'), false)

// Metadata cloud — target SSRF paling umum.
assert.equal(isBlockedAddress('169.254.169.254'), true)

// IPv6 loopback / unique-local / link-local
assert.equal(isBlockedAddress('::1'), true)
assert.equal(isBlockedAddress('fd00::1'), true)
assert.equal(isBlockedAddress('fe80::1'), true)

// IPv4 yang disamarkan sebagai IPv6 tetap ketahuan.
assert.equal(isBlockedAddress('::ffff:169.254.169.254'), true)
assert.equal(isBlockedAddress('::ffff:10.0.0.1'), true)

// Sampah ditolak, bukan diloloskan.
assert.equal(isBlockedAddress('999.1.1.1'), true)
assert.equal(isBlockedAddress(''), true)

console.log('url-guard: semua cek lolos')
