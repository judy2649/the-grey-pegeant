/**
 * Generates a random alphanumeric string of a given length.
 * Useful for unique Ticket IDs.
 * @param {number} length 
 * @returns {string}
 */
const generateTicketId = (length = 6) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

module.exports = { generateTicketId };
