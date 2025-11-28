const axios = require('axios');

const elasticsearchUrl = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const indexName = 'products';

async function recreateIndex() {
    try {
        // Delete existing index if it exists
        try {
            await axios.delete(`${elasticsearchUrl}/${indexName}`);
            console.log(`Deleted existing index: ${indexName}`);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log(`Index ${indexName} does not exist, will create new one`);
            } else {
                throw error;
            }
        }

        // Create new index with optimized mappings
        const indexMapping = {
            settings: {
                analysis: {
                    analyzer: {
                        // Custom analyzer for product names with edge n-grams for autocomplete
                        product_name_analyzer: {
                            type: 'custom',
                            tokenizer: 'standard',
                            filter: ['lowercase', 'asciifolding', 'product_name_ngram']
                        },
                        // Custom analyzer for descriptions
                        description_analyzer: {
                            type: 'custom',
                            tokenizer: 'standard',
                            filter: ['lowercase', 'asciifolding', 'stop', 'snowball']
                        },
                        // Standard analyzer for general text search
                        standard_lowercase: {
                            type: 'custom',
                            tokenizer: 'standard',
                            filter: ['lowercase', 'asciifolding']
                        }
                    },
                    filter: {
                        // Edge n-gram filter for autocomplete (matches from start of word)
                        product_name_ngram: {
                            type: 'edge_ngram',
                            min_gram: 2,
                            max_gram: 20,
                            preserve_original: true
                        }
                    }
                }
            },
            mappings: {
                properties: {
                    productId: { type: 'integer' },
                    productName: { 
                        type: 'text',
                        analyzer: 'product_name_analyzer',
                        search_analyzer: 'standard_lowercase',
                        fields: {
                            keyword: { 
                                type: 'keyword',
                                ignore_above: 256
                            },
                            // Exact match field for precise searches
                            exact: {
                                type: 'text',
                                analyzer: 'keyword',
                                search_analyzer: 'keyword'
                            },
                            // N-gram field for partial word matching
                            ngram: {
                                type: 'text',
                                analyzer: 'standard_lowercase',
                                search_analyzer: 'standard_lowercase'
                            }
                        }
                    },
                    categoryName: { 
                        type: 'text',
                        analyzer: 'standard_lowercase',
                        fields: {
                            keyword: { 
                                type: 'keyword',
                                ignore_above: 256
                            }
                        }
                    },
                    numberOfUnits: { type: 'integer' },
                    mrp: { type: 'float' },
                    discountPrice: { type: 'float' },
                    description: { 
                        type: 'text',
                        analyzer: 'description_analyzer',
                        search_analyzer: 'standard_lowercase',
                        fields: {
                            // Stemmed version for better matching
                            stemmed: {
                                type: 'text',
                                analyzer: 'description_analyzer'
                            }
                        }
                    },
                    imageUrl: { type: 'keyword' }
                }
            }
        };
        
        await axios.put(`${elasticsearchUrl}/${indexName}`, indexMapping, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log(`Index ${indexName} created successfully with optimized mappings`);
        console.log('Now run: node elasticsearch/elasticsearchIndexing.js to index your data');
    } catch (error) {
        console.error('Error recreating index:', error.message);
        if (error.response) {
            console.error('Elasticsearch error response:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

recreateIndex();

