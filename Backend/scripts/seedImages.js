const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'categories.db');
const db = new sqlite3.Database(dbPath);

// Extract relevant keywords from product name for image search
const extractImageKeywords = (productName, categoryName) => {
  // Clean product name: remove common words, keep meaningful terms
  const cleaned = productName
    .toLowerCase()
    .replace(/\b(the|a|an|and|or|but|in|on|at|to|for|of|with|by|set|pack|pair|products?)\b/g, '')
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 2); // Take first 2 meaningful words
  
  // If we have good keywords, use them; otherwise use category
  if (cleaned.length > 0) {
    return cleaned.join(',');
  }
  
  // Fallback to category name
  return categoryName.toLowerCase();
};

// Get relevant image URL based on product name and category
const getRelevantImageUrl = (productName, categoryName, productId) => {
  // Extract keywords from product name for relevant images
  const keywords = extractImageKeywords(productName, categoryName);
  
  // Use LoremFlickr with keywords for relevant product images
  // Format: https://loremflickr.com/400/400/{keywords}?random={productId}
  // The random parameter ensures consistency (same productId = same image)
  // The keywords ensure relevance to the actual product
  const encodedKeywords = encodeURIComponent(keywords);
  return `https://loremflickr.com/400/400/${encodedKeywords}?random=${productId}`;
};

async function seedImages() {
  return new Promise((resolve, reject) => {
    db.all('SELECT productId, productName, categoryName, imageUrl FROM products', [], async (err, rows) => {
      if (err) {
        console.error('Error fetching products:', err.message);
        db.close();
        reject(err);
        return;
      }

      console.log(`Found ${rows.length} products`);
      let updated = 0;
      let skipped = 0;

      for (const row of rows) {
        // Update all products with relevant images (overwrite existing if needed)
        const imageUrl = getRelevantImageUrl(row.productName, row.categoryName, row.productId);
        
        db.run(
          'UPDATE products SET imageUrl = ? WHERE productId = ?',
          [imageUrl, row.productId],
          function(updateErr) {
            if (updateErr) {
              console.error(`Error updating product ${row.productId}:`, updateErr.message);
            } else {
              updated++;
              console.log(`Updated product ${row.productId} (${row.productName}) with relevant image: ${imageUrl}`);
            }
          }
        );
      }

      // Wait a bit for all updates to complete
      setTimeout(() => {
        console.log(`\nImage seeding complete!`);
        console.log(`Updated: ${updated} products with relevant images`);
        db.close();
        resolve();
      }, 2000);
    });
  });
}

// Run the seeding
seedImages()
  .then(() => {
    console.log('Image seeding finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Image seeding failed:', error);
    process.exit(1);
  });

