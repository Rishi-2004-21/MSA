/**
 * Excel Parser Service
 * Reads .xlsx / .xls and returns normalized lead rows.
 * Expected columns: Name, Email, Phone, Requirement (case-insensitive)
 */
const XLSX = require('xlsx');

function normalizeKey(key) {
    return key.toLowerCase().replace(/\s+/g, '');
}

function parseExcelBuffer(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const leads = [];

    for (const row of rows) {
        // Normalize keys
        const normalized = {};
        for (const [k, v] of Object.entries(row)) {
            normalized[normalizeKey(k)] = typeof v === 'string' ? v.trim() : String(v || '').trim();
        }

        // Map common column aliases
        const name = normalized['name'] || normalized['fullname'] || normalized['leadname'] || '';
        const email = normalized['email'] || normalized['emailaddress'] || normalized['e-mail'] || '';
        const phone = normalized['phone'] || normalized['phonenumber'] || normalized['mobile'] || normalized['contact'] || '';
        const message = normalized['requirement'] || normalized['message'] || normalized['inquiry'] || normalized['enquiry'] || normalized['notes'] || '';
        const company = normalized['company'] || normalized['organization'] || normalized['companyname'] || '';
        const location = normalized['location'] || normalized['city'] || normalized['state'] || normalized['country'] || '';

        // Skip completely empty rows
        if (!name && !email && !phone) continue;

        // Basic validation
        const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const phoneValid = !phone || /[\d\s\-\+\(\)]{7,15}/.test(phone);

        if (!emailValid && !phoneValid && !name) continue;

        leads.push({
            name: name || '',
            email: emailValid ? email : '',
            phone: phoneValid ? phone.replace(/[^\d\+]/g, '') : '',
            company,
            location,
            message,
            source: 'excel',
            channel: 'excel',
            rawLeadData: JSON.stringify(row),
        });
    }

    return leads;
}

module.exports = { parseExcelBuffer };
