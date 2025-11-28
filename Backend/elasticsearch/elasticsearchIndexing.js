const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');
require('dotenv').config(); // Load environment variables

const dbPath = path.join(__dirname, '..', 'data', 'categories.db');
const db = new sqlite3.Database(dbPath);

const elasticsearchUrl = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const indexName = 'products';

// Configure axios with authentication if credentials provided (for Elastic Cloud)
const axiosConfig = {
  headers: { 'Content-Type': 'application/json' }
};

if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
  axiosConfig.auth = {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD
  };
}

async function createIndexIfNotExists() {
    try {
        // Check if index exists
        await axios.get(`${elasticsearchUrl}/${indexName}`, axiosConfig);
        console.log(`Index ${indexName} already exists`);
    } catch (error) {
        if (error.response && error.response.status === 404) {
            // Index doesn't exist, create it
            try {
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
                
                await axios.put(`${elasticsearchUrl}/${indexName}`, indexMapping, axiosConfig);
                console.log(`Index ${indexName} created successfully`);
            } catch (createError) {
                console.error('Error creating index:', createError.message);
                throw createError;
            }
        } else {
            throw error;
        }
    }
}

db.all('SELECT * FROM products', [], async (err, rows) => {
    if (err) {
        console.error(err.message);
        db.close();
        return;
    }

    try {
        // Create index if it doesn't exist
        await createIndexIfNotExists();

        // Prepare bulk request body for Elasticsearch
        const bulkBody = [];
        rows.forEach((row) => {
            // Action metadata
            bulkBody.push({
                index: {
                    _index: indexName,
                    _id: row.productId.toString()
                }
            });
            // Document data
            bulkBody.push({
                productId: row.productId,
                productName: row.productName,
                categoryName: row.categoryName,
                numberOfUnits: parseInt(row.numberOfUnits),
                mrp: row.mrp,
                discountPrice: row.discountPrice,
                description: row.description,
                imageUrl: row.imageUrl || null
            });
        });

        // Convert to NDJSON format (newline-delimited JSON)
        const ndjsonBody = bulkBody.map(item => JSON.stringify(item)).join('\n') + '\n';

        // Bulk index documents
        const bulkConfig = { ...axiosConfig, headers: { 'Content-Type': 'application/x-ndjson' } };
        if (axiosConfig.auth) bulkConfig.auth = axiosConfig.auth;
        
        const response = await axios.post(
            `${elasticsearchUrl}/_bulk`,
            ndjsonBody,
            bulkConfig
        );

        if (response.data.errors) {
            console.error('Some documents failed to index:', response.data.items.filter(item => item.index.error));
        } else {
            console.log(`Successfully indexed ${rows.length} documents`);
        }
    } catch (error) {
        console.error('Error indexing data:', error.message);
        if (error.response) {
            console.error('Elasticsearch error response:', error.response.data);
        }
    } finally {
        db.close();
    }
});

