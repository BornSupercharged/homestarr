const express = require('express');
const cors = require('cors');
const path = require('path');
const { run, get, all } = require('./database');
require('dotenv').config(); // Load .env file variables into process.env (at the top!)

const app = express();
// Read PORT and SEARX_URL from environment variables, provide defaults
const PORT = process.env.PORT || 5050;
const SEARX_URL = process.env.SEARX_URL || 'http://localhost/search?q=%s'; // Default fallback

console.log('--- Server Startup Environment ---');
console.log(`DOTENV: process.env.SEARX_URL read as: ${process.env.SEARX_URL}`);
console.log(`DOTENV: Final SEARX_URL variable value: ${SEARX_URL}`);
console.log(`DOTENV: Final PORT variable value: ${PORT}`);
console.log('----------------------------------');
// --- End logging ---

// Middleware
app.use(cors()); // Allow requests from frontend (adjust in production)
app.use(express.json()); // Parse JSON bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static frontend files

// --- API Routes ---
// Endpoint to provide configuration to the frontend
app.get('/api/config', (req, res) => {
    console.log(`[API /api/config] Sending SEARX_URL template: ${SEARX_URL}`); // Log what's being sent
    res.json({
        searxUrlTemplate: SEARX_URL // Send the URL template to the client
    });
});

// GET all data (categories and links)
app.get('/api/data', async (req, res) => {
    try {
        console.log('[GET /api/data] Fetching categories...');
        const categories = await all('SELECT * FROM categories ORDER BY position ASC');
        console.log(`[GET /api/data] Found ${categories.length} categories.`); // Log count

        console.log('[GET /api/data] Fetching links...');
        const links = await all('SELECT * FROM links');
        console.log(`[GET /api/data] Found ${links.length} links.`); // Log count

        // Structure data: embed links within categories
        const categoryMap = new Map();
        categories.forEach(cat => {
            cat.links = [];
            categoryMap.set(cat.id, cat);
        });

        links.forEach(link => {
            const category = categoryMap.get(link.category_id);
            if (category) {
                category.links.push(link);
            }
        });

        const finalData = Array.from(categoryMap.values());
        // Log only a summary or structure if data is large
        console.log(`[GET /api/data] Sending ${finalData.length} categories structure back to client.`);
        res.json(finalData);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch data', details: err.message });
    }
});

// POST create a new category
app.post('/api/categories', async (req, res) => {
     const { name } = req.body;
     if (!name) {
         return res.status(400).json({ error: 'Category name is required' });
     }
     try {
         // Find the highest current position
         const maxPos = await get('SELECT MAX(position) as max_pos FROM categories');
         const nextPosition = (maxPos && typeof maxPos.max_pos === 'number') ? maxPos.max_pos + 1 : 0;

         const result = await run('INSERT INTO categories (name, position) VALUES (?, ?)', [name, nextPosition]);
         const newCategory = await get('SELECT * FROM categories WHERE id = ?', [result.id]);
         newCategory.links = []; // Initialize with empty links array
         res.status(201).json(newCategory);
     } catch (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
              res.status(409).json({ error: 'Category name already exists', details: err.message });
          } else {
              res.status(500).json({ error: 'Failed to create category', details: err.message });
          }
     }
});

// PUT update category order
app.put('/api/categories/order', async (req, res) => {
    const categoriesOrder = req.body; // Expects array: [{ id: 1, position: 0 }, { id: 3, position: 1 }, ...]
    if (!Array.isArray(categoriesOrder)) {
        return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
    }

    // Use a transaction to ensure all updates succeed or fail together
    try {
        await run('BEGIN TRANSACTION');
        await Promise.all(categoriesOrder.map(cat =>
            run('UPDATE categories SET position = ? WHERE id = ?', [cat.position, cat.id])
        ));
        await run('COMMIT');
        res.status(200).json({ message: 'Category order updated successfully' });
    } catch (err) {
        await run('ROLLBACK'); // Roll back changes on error
        res.status(500).json({ error: 'Failed to update category order', details: err.message });
    }
});

// PUT update a category name
app.put('/api/categories/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'New category name is required' });
    }

    try {
        // Check if the category exists first (optional but good practice)
        const existing = await get('SELECT id FROM categories WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const result = await run('UPDATE categories SET name = ? WHERE id = ?', [name, id]);

        if (result.changes === 0) {
             // Should be caught by the check above, but as a safeguard
            return res.status(404).json({ error: 'Category not found or name unchanged' });
        }

        // Fetch the updated category to send back (optional, could also just send success)
        const updatedCategory = await get('SELECT * FROM categories WHERE id = ?', [id]);
        // Note: We don't necessarily need to fetch links here for just a name update response
        res.status(200).json(updatedCategory);

    } catch (err) {
         if (err.message.includes('UNIQUE constraint failed')) {
             res.status(409).json({ error: 'Another category with this name already exists', details: err.message });
         } else {
             console.error(`[PUT /api/categories/${id}] Error:`, err.message);
             res.status(500).json({ error: 'Failed to update category', details: err.message });
         }
    }
});

// DELETE a category (and its links via CASCADE)
app.delete('/api/categories/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // The ON DELETE CASCADE in the links table schema handles link deletion
        const result = await run('DELETE FROM categories WHERE id = ?', [id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        console.log(`[DELETE /api/categories/${id}] Deleted category successfully.`);
        res.status(204).send(); // 204 No Content is appropriate for successful DELETE

    } catch (err) {
        console.error(`[DELETE /api/categories/${id}] Error:`, err.message);
        res.status(500).json({ error: 'Failed to delete category', details: err.message });
    }
});

// POST create a new link
app.post('/api/links', async (req, res) => {
     const { name, url, new_tab, category_id } = req.body;
     if (!name || !url || !category_id) {
         return res.status(400).json({ error: 'Missing required fields (name, url, category_id)' });
     }
     try {
         const result = await run(
             'INSERT INTO links (name, url, new_tab, category_id) VALUES (?, ?, ?, ?)',
             [name, url, !!new_tab, category_id] // Ensure new_tab is boolean/integer 0 or 1
         );
         const newLink = await get('SELECT * FROM links WHERE id = ?', [result.id]);
         res.status(201).json(newLink);
     } catch (err) {
         res.status(500).json({ error: 'Failed to add link', details: err.message });
     }
});

// PUT update a link
app.put('/api/links/:id', async (req, res) => {
    const { id } = req.params;
    const { name, url, new_tab } = req.body;

    // Basic validation
    if (!name || !url || new_tab === undefined || new_tab === null) {
        return res.status(400).json({ error: 'Missing required fields: name, url, new_tab' });
    }
    // Could add URL validation here if desired

    try {
        // Check if link exists
        const existing = await get('SELECT id FROM links WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Link not found' });
        }

        const result = await run(
            'UPDATE links SET name = ?, url = ?, new_tab = ? WHERE id = ?',
            [name, url, !!new_tab, id] // Ensure new_tab is stored as 0 or 1
        );

        if (result.changes === 0) {
             // Should be caught by the check above, but as a safeguard
             return res.status(404).json({ error: 'Link not found or data unchanged' });
        }

        const updatedLink = await get('SELECT * FROM links WHERE id = ?', [id]);
        res.status(200).json(updatedLink);

    } catch (err) {
        console.error(`[PUT /api/links/${id}] Error:`, err.message);
        res.status(500).json({ error: 'Failed to update link', details: err.message });
    }
});

// DELETE a link
app.delete('/api/links/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await run('DELETE FROM links WHERE id = ?', [id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Link not found' });
        }

        console.log(`[DELETE /api/links/${id}] Deleted link successfully.`);
        res.status(204).send(); // No Content on success

    } catch (err) {
        console.error(`[DELETE /api/links/${id}] Error:`, err.message);
        res.status(500).json({ error: 'Failed to delete link', details: err.message });
    }
});

// --- Serve Frontend ---
// Handle SPA routing: serve index.html for any route not handled by API or static files
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});