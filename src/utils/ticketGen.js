/**
 * Formats a sequential ticket ID.
 * @param {string} tier - The ticket tier (Normal, VIP, VVIP)
 * @param {number} count - The current sequence number
 * @returns {string}
 */
const generateTicketId = (tier = 'Normal', count = 1) => {
    // Handle null or undefined tier
    const safeTier = tier || 'Normal';

    // Ensure first letter is uppercase, rest lowercase (e.g., "Normal", "Vip")
    // For VVIP, keep it as VVIP
    let tierDisplay = safeTier.charAt(0).toUpperCase() + safeTier.slice(1).toLowerCase();

    // special case for acronyms
    const upper = safeTier.toUpperCase();
    if (upper === 'VVIP' || upper.includes('VVIP')) tierDisplay = 'VVIP';
    else if (upper === 'VIP' || upper.includes('VIP')) tierDisplay = 'VIP';
    else if (upper === 'NORMAL') tierDisplay = 'Normal';

    return `${tierDisplay} ticket ${count}`;
};

module.exports = { generateTicketId };
