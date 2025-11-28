const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'data', 'categories.db');
const db = new sqlite3.Database(dbPath);
const express = require('express');
const router = express.Router();
const axios = require('axios');
const parseNaturalLanguageQuery = require('../utils/parseNaturalLanguageQuery');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      productId INTEGER PRIMARY KEY AUTOINCREMENT,
      productName TEXT NOT NULL,
      categoryId INTEGER,
      categoryName TEXT NOT NULL,
      numberOfUnits INTEGER NOT NULL,
      mrp REAL NOT NULL,
      discountPrice REAL NOT NULL,
      description TEXT NOT NULL,
      imageUrl TEXT,
      FOREIGN KEY (categoryId) REFERENCES categories (categoryid) ON DELETE CASCADE
    )
  `);
  
  // Add imageUrl column if it doesn't exist (for existing databases)
  db.run(`
    ALTER TABLE products ADD COLUMN imageUrl TEXT
  `, (err) => {
    // Column might already exist, ignore error
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding imageUrl column:', err.message);
    }
  });
});

router.post('/product', (req, res) => {
  console.log("Request received");

  const products = req.body; 

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Request body must be a non-empty array of product objects' });
  }

  for (const product of products) {
    const { productName, categoryId, categoryName, numberOfUnits, mrp, discountPrice, description } = product;

    if (!productName || !categoryId || !categoryName || !numberOfUnits || !mrp || !discountPrice || !description) {
      return res.status(400).json({ error: 'Each product must contain all required fields' });
    }
  }

  const query = `
    INSERT INTO products (productName, categoryId, categoryName, numberOfUnits, mrp, discountPrice, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const insertPromises = products.map((product) => {
    const { productName, categoryId, categoryName, numberOfUnits, mrp, discountPrice, description } = product;

    return new Promise((resolve, reject) => {
      const params = [productName, categoryId, categoryName, numberOfUnits, mrp, discountPrice, description];

      db.run(query, params, function (err) {
        if (err) {
          reject(err.message); 
        } else {
          resolve({ productId: this.lastID, message: 'Product added successfully' });
        }
      });
    });
  });

  Promise.all(insertPromises)
    .then((results) => {
      res.status(201).json({
        message: 'All products added successfully',
        products: results,
      });
    })
    .catch((error) => {
      res.status(500).json({ error: `Failed to add products: ${error}` });
    });
});


router.get('/ptable', (req, res) => {
  const {
    categoryName = '',
    minPrice = 0,
    maxPrice = Infinity,
    minUnits = 0,
    maxUnits = Infinity,
    page = 0,
    limit = 10,
    sortBy = 'relevance'
  } = req.query;


  const categoryArray = categoryName ? categoryName.split(',').map((cat) => cat.trim()) : [];

  let query = `
    SELECT productId, productName, categoryName, numberOfUnits, mrp, discountPrice, imageUrl
    FROM products
    WHERE 1=1
  `;
  const params = [];

  if (categoryArray.length > 0) {
    const placeholders = categoryArray.map(() => '?').join(',');
    query += ` AND categoryName IN (${placeholders})`;
    params.push(...categoryArray);
  }

  query += ` AND discountPrice BETWEEN ? AND ?`;
  params.push(minPrice, maxPrice);

  query += ` AND numberOfUnits BETWEEN ? AND ?`;
  params.push(minUnits, maxUnits);

  // Add sorting
  switch (sortBy) {
    case 'price-asc':
      query += ` ORDER BY discountPrice ASC`;
      break;
    case 'price-desc':
      query += ` ORDER BY discountPrice DESC`;
      break;
    case 'name-asc':
      query += ` ORDER BY productName ASC`;
      break;
    case 'name-desc':
      query += ` ORDER BY productName DESC`;
      break;
    case 'relevance':
    default:
      // Default: sort by productId (original order)
      query += ` ORDER BY productId ASC`;
      break;
  }

  const offset = page * limit;
  query += ` LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    let countQuery = `
      SELECT COUNT(*) AS totalProducts
      FROM products
      WHERE 1=1
    `;
    const countParams = [];

    if (categoryArray.length > 0) {
      const placeholders = categoryArray.map(() => '?').join(',');
      countQuery += ` AND categoryName IN (${placeholders})`;
      countParams.push(...categoryArray);
    }

    countQuery += ` AND discountPrice BETWEEN ? AND ?`;
    countParams.push(minPrice, maxPrice);
    countQuery += ` AND numberOfUnits BETWEEN ? AND ?`;
    countParams.push(minUnits, maxUnits);

    db.get(countQuery, countParams, (countErr, countRow) => {
      if (countErr) {
        return res.status(500).json({ error: countErr.message });
      }

      res.json({
        products: rows,
        totalProducts: countRow.totalProducts
      });
    });
  });
});

router.get('/search', async (req, res) => {
  const { query: userInput, categoryName, page = 1, limit = 10, sortBy = 'relevance' } = req.query;
  const from = (page - 1) * limit;

  try {
    const { searchTerm, minPrice, maxPrice } = parseNaturalLanguageQuery(userInput);

    // Build Elasticsearch query with advanced full-text search
    const mustClauses = [];
    const shouldClauses = [];
    const filterClauses = [];

    // Advanced text search with multiple strategies
    if (searchTerm && searchTerm.trim()) {
      const cleanSearchTerm = searchTerm.trim();
      const searchTerms = cleanSearchTerm.split(/\s+/).filter(t => t.length > 0);
      
      // 1. Multi-match query for best field matching (highest priority)
      shouldClauses.push({
        multi_match: {
          query: cleanSearchTerm,
          type: 'best_fields',
          fields: [
            'productName^10',           // Highest boost for exact product name
            'productName.exact^8',      // Exact match boost
            'productName.ngram^6',      // Partial match boost
            'description^4',            // Description boost
            'description.stemmed^3',    // Stemmed description
            'categoryName^2'            // Category boost
          ],
          operator: 'or',
          fuzziness: 'AUTO',            // Auto-detect fuzziness based on term length
          tie_breaker: 0.3
        }
      });

      // 2. Phrase matching for exact phrase searches (high priority)
      if (searchTerms.length > 1) {
        shouldClauses.push({
          multi_match: {
            query: cleanSearchTerm,
            type: 'phrase',
            fields: [
              'productName^8',
              'description^4',
              'categoryName^2'
            ],
            slop: 2                     // Allow words to be out of order by 2 positions
          }
        });
      }

      // 3. Cross-fields matching for matching across multiple fields
      shouldClauses.push({
        multi_match: {
          query: cleanSearchTerm,
          type: 'cross_fields',
          fields: [
            'productName^5',
            'description^3',
            'categoryName^1'
          ],
          operator: 'and'               // All terms must be present
        }
      });

      // 4. Fuzzy matching for typo tolerance (lower priority but still useful)
      shouldClauses.push({
        multi_match: {
          query: cleanSearchTerm,
          type: 'best_fields',
          fields: [
            'productName^3',
            'description^2'
          ],
          fuzziness: 1,                 // Allow 1 character difference
          prefix_length: 2              // First 2 characters must match exactly
        }
      });

      // 5. Prefix matching for autocomplete-like behavior
      if (cleanSearchTerm.length >= 2) {
        shouldClauses.push({
          match_phrase_prefix: {
            productName: {
              query: cleanSearchTerm,
              max_expansions: 50,
              boost: 2
            }
          }
        });
      }

      // 6. Wildcard matching for partial word searches
      if (cleanSearchTerm.length >= 3) {
        shouldClauses.push({
          wildcard: {
            'productName.ngram': {
              value: `*${cleanSearchTerm.toLowerCase()}*`,
              boost: 1.5
            }
          }
        });
      }

    } else {
      // Match all if no search term
      mustClauses.push({ match_all: {} });
    }

    // Category filter (using filter clause for better performance)
    if (categoryName) {
      const categories = categoryName.split(',').map(cat => cat.trim());
      filterClauses.push({
        terms: { 
          'categoryName.keyword': categories  // Use keyword field for exact matching
        }
      });
    }

    // Price range filter (using filter clause)
    if (minPrice !== null || maxPrice !== null) {
      const rangeFilter = {};
      if (minPrice !== null) {
        rangeFilter.gte = minPrice;
      }
      if (maxPrice !== null) {
        rangeFilter.lte = maxPrice;
      }
      filterClauses.push({
        range: { discountPrice: rangeFilter }
      });
    }

    // Build the final query
    const boolQuery = {
      bool: {
        must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }],
        should: shouldClauses.length > 0 ? shouldClauses : undefined,
        filter: filterClauses.length > 0 ? filterClauses : undefined,
        minimum_should_match: shouldClauses.length > 0 ? 1 : undefined
      }
    };

    const esQuery = {
      query: boolQuery,
      from: from,
      size: parseInt(limit),
      // Add highlighting for search terms
      highlight: {
        fields: {
          productName: {
            number_of_fragments: 0,
            pre_tags: ['<mark>'],
            post_tags: ['</mark>']
          },
          description: {
            fragment_size: 150,
            number_of_fragments: 2,
            pre_tags: ['<mark>'],
            post_tags: ['</mark>']
          }
        }
      },
      // Add sorting based on sortBy parameter
      sort: (() => {
        switch (sortBy) {
          case 'price-asc':
            return [{ discountPrice: { order: 'asc' } }, { _score: { order: 'desc' } }];
          case 'price-desc':
            return [{ discountPrice: { order: 'desc' } }, { _score: { order: 'desc' } }];
          case 'name-asc':
            return [{ 'productName.keyword': { order: 'asc' } }, { _score: { order: 'desc' } }];
          case 'name-desc':
            return [{ 'productName.keyword': { order: 'desc' } }, { _score: { order: 'desc' } }];
          case 'relevance':
          default:
            return [
              { _score: { order: 'desc' } },
              { discountPrice: { order: 'asc' } }  // Secondary sort by price
            ];
        }
      })()
    };

    const elasticsearchUrl = process.env.ELASTICSEARCH_URL 
      ? `${process.env.ELASTICSEARCH_URL}/products/_search`
      : `http://localhost:9200/products/_search`;
    
    // Configure request with authentication for Elastic Cloud
    const esConfig = {
      headers: { 'Content-Type': 'application/json' }
    };
    
    // Add authentication if credentials are provided (for Elastic Cloud)
    if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
      esConfig.auth = {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD
      };
    }
    
    const esResponse = await axios.post(elasticsearchUrl, esQuery, esConfig);

    const hits = esResponse.data.hits;
    const products = hits.hits.map(hit => hit._source);
    const totalProducts = hits.total.value || hits.total; // ES 7.x uses value, older versions use direct number

    res.json({
      products: products,
      totalProducts: totalProducts,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalProducts / limit),
    });
  } catch (error) {
    console.error('Error querying Elasticsearch:', error.message);
    if (error.response) {
      console.error('Elasticsearch error response:', error.response.data);
    }
    res.status(500).json({ error: 'Search failed' });
  }
});



  
  
module.exports = router;
