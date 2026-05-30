export function getCompanyDisplayName(company) {
    if (typeof company === 'string') return company
    if (company && typeof company === 'object' && typeof company.name === 'string') return company.name
    return ''
}
