const PROFILE_UPDATE_FIELDS = [
    'slug',
    'display_name',
    'bio',
    'company',
    'job_title',
    'avatar_url',
    'phone',
    'email',
    'social_links',
    'special_edition',
    'special_editions',
    'selected_special_greeting_anim',
    'enable_special_greeting_anim',
    'theme',
    'tier',
    'user_tag',
    'company_id',
    'updated_at',
]

export function buildProfileUpdates(updates) {
    return PROFILE_UPDATE_FIELDS.reduce((profileUpdates, field) => {
        if (Object.prototype.hasOwnProperty.call(updates, field)) {
            profileUpdates[field] = updates[field]
        }

        return profileUpdates
    }, {})
}
