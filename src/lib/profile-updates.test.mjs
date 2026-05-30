import assert from 'node:assert/strict'
import { buildProfileUpdates } from './profile-updates.mjs'

assert.deepEqual(
    buildProfileUpdates({
        enable_special_greeting_anim: false,
        special_editions: ['aruna', 'prabowo'],
        selected_special_greeting_anim: 'aruna',
        theme: { welcome_word: 'halo' },
        display_name: 'Reza',
        unknown_field: 'ignore-me',
    }),
    {
        enable_special_greeting_anim: false,
        special_editions: ['aruna', 'prabowo'],
        selected_special_greeting_anim: 'aruna',
        theme: { welcome_word: 'halo' },
        display_name: 'Reza',
    }
)

assert.deepEqual(
    buildProfileUpdates({
        tier: 'PREMIUM',
        special_edition: null,
        company_id: null,
    }),
    {
        tier: 'PREMIUM',
        special_edition: null,
        company_id: null,
    }
)
