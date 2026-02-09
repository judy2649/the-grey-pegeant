/**
 * Formats a sequential ticket ID.
 * @param {string} tier - The ticket tier (Normal, VIP, VVIP)
 * @param {number} count - The current sequence number
 * @returns {string}
 */
const generateTicketId = (tier = 'Normal', count = 1) => {
    // Ensure first letter is uppercase, rest lowercase (e.g., "Normal", "Vip")
    // For VVIP, keep it as VVIP
    let tierDisplay = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();

    // special case for acronyms
    const upper = tier.toUpperCase();
    if (upper === 'VVIP' || upper.includes('VVIP')) tierDisplay = 'VVIP';
    else if (upper === 'VIP' || upper.includes('VIP')) tierDisplay = 'VIP';
    else if (upper === 'NORMAL') tierDisplay = 'Normal';

    return `${tierDisplay} ticket ${count}`;
};

module.exports = { generateTicketId };
