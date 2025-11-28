
function parseNaturalLanguageQuery(query) {
    const result = {
        searchTerm: '',
        maxPrice: null,
        minPrice: null,
    };

    if (!query) return result;

    const priceRegex = /under\s*(\d+)|below\s*(\d+)|upto\s*(\d+)|between\s*(\d+)\s*and\s*(\d+)/i;

    const priceMatch = query.match(priceRegex);
    
    if (priceMatch) {
        if (priceMatch[1]) result.maxPrice = parseInt(priceMatch[1], 10); 
        if (priceMatch[2]) result.maxPrice = parseInt(priceMatch[2], 10); 
        if (priceMatch[3]) result.maxPrice = parseInt(priceMatch[3], 10); 
        if (priceMatch[4] && priceMatch[5]) {
            result.minPrice = parseInt(priceMatch[4], 10); 
            result.maxPrice = parseInt(priceMatch[5], 10); 
        }

        query = query.replace(priceRegex, '').trim();
    }

    result.searchTerm = query.trim();      
    return result;
}

module.exports = parseNaturalLanguageQuery;