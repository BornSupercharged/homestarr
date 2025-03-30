<template>
  <div id="app-content">
    <div class="search-container">
      <input
        type="search"
        class="search-box"
        v-model="searchQuery"
        placeholder="Search the web..."
        @keyup.enter="performSearch"
        :disabled="configLoading || !!configError"
      />
    </div>

     <p v-if="configLoading">Loading configuration...</p>
     <p v-if="configError" style="color: red; text-align: center;">{{ configError }}</p>
     <p v-if="loading">Loading data...</p>
     <p v-if="error">{{ error }}</p>

    <draggable
      v-model="categories"
      item-key="id"
      class="categories-container"
      ghost-class="sortable-ghost"
      drag-class="sortable-drag"
      :animation="200"
      @end="onDragEnd"
      v-if="shouldShowCategories"
    >
      <template #item="{ element: category }">
        <div v-if="category.id === addCategoryPlaceholderId"
             class="card add-category-card"
             @click="openAddCategoryModal"
             style="cursor: pointer;">
          +
        </div>
        <CategoryCard
            v-else
            :category="category"
            :is-managing="managingLinksInCategory.has(category.id)" 
            @add-link="openAddLinkModal"
            @edit-category="openEditCategoryModal"
            @delete-category="confirmDeleteCategory"
            @toggle-manage-links="toggleManageLinksMode"
            @edit-link="openEditLinkModal"           
            @delete-link="confirmDeleteLink" 
        />
      </template>
    </draggable>

     <AddCategoryModal :is-visible="isAddCategoryModalVisible" :error-message="modalError" @close="closeAddCategoryModal" @add-category="addCategory" />
     <EditCategoryModal :is-visible="isEditCategoryModalVisible" :category="categoryToEdit" :error-message="editModalError" @close="closeEditCategoryModal" @update-category="updateCategory" />

    <AddLinkModal
        :is-visible="isAddLinkModalVisible"
        :category-id="currentCategoryIdForLink"
        :error-message="modalError"
        @close="closeAddLinkModal"
        @add-link="addLink" />

     <EditLinkModal
         :is-visible="isEditLinkModalVisible"
         :link="linkToEdit"
         :error-message="editLinkModalError"
         @close="closeEditLinkModal"
         @update-link="updateLink"
     />

  </div>
</template>

<script setup>
import { ref, onMounted, watchEffect, computed } from 'vue';
import draggable from 'vuedraggable';
import CategoryCard from './components/CategoryCard.vue';
import AddCategoryModal from './components/AddCategoryModal.vue';
import AddLinkModal from './components/AddLinkModal.vue';
import EditCategoryModal from './components/EditCategoryModal.vue';
import EditLinkModal from './components/EditLinkModal.vue'; // Import new modal

// Constants
// Use a unique ID for the placeholder that won't clash with DB IDs
const addCategoryPlaceholderId = '__ADD_CATEGORY_PLACEHOLDER__';
const localStorageKey = 'homepage_placeholder_index'; // Key for local storage

// State variables
const categories = ref([]);
const loading = ref(true); // For category/link data
const error = ref(null); // For category/link data error
const modalError = ref(''); // For Add/Link modals

const configLoading = ref(true); // For loading config
const configError = ref(null); // For config loading error
const searxUrlTemplate = ref(''); // Store the fetched Searx URL

const isAddCategoryModalVisible = ref(false);
const isAddLinkModalVisible = ref(false);
const currentCategoryIdForLink = ref(null);
const searchQuery = ref('');

// State for Edit Category Modal
const isEditCategoryModalVisible = ref(false);
const categoryToEdit = ref(null);
const editModalError = ref('');

// --- Computed Property for v-if ---
const shouldShowCategories = computed(() => {
  return !configLoading.value && !configError.value && !loading.value && !error.value;
});


// --- Fetch Config & Data ---
const fetchConfig = async () => {
    configLoading.value = true;
    configError.value = null;
    try {
        const response = await fetch('/api/config'); // Fetch from backend endpoint
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const config = await response.json();
        if (!config.searxUrlTemplate || !config.searxUrlTemplate.includes('%s')) {
             console.warn('Received Searx URL template seems invalid:', config.searxUrlTemplate);
             throw new Error('Invalid Searx URL template received from server. Must contain "%s".');
        }
        searxUrlTemplate.value = config.searxUrlTemplate;
        console.log('[App.vue fetchConfig] Configuration loaded successfully. Searx Template:', searxUrlTemplate.value);
    } catch (err) {
        console.error("[App.vue fetchConfig] Config fetch error:", err);
        configError.value = `Failed to load configuration: ${err.message}. Search may not work.`;
        // Keep the search bar disabled by not setting configLoading to false on error,
        // Or you could allow it and show an error on search attempt. Let's disable it.
        // configLoading.value = false; // Setting this would enable the bar even on error
    } finally {
         // Only set loading to false if successful. Error state handles the rest.
         if (!configError.value) {
            configLoading.value = false;
         }
         console.log(`[App.vue fetchConfig] Set configLoading to false (if no error). ConfigLoading state: ${configLoading.value}`);
    }
};

// Fetch Data
const fetchData = async () => {
  loading.value = true;
  error.value = null;
  try {
    // Ensure config is loaded before fetching data (optional, but good practice)
    if (configLoading.value || configError.value) {
        console.log('Waiting for config before fetching data...');
        // Could implement a watcher or retry mechanism if needed
        return;
    }
    const response = await fetch('/api/data'); // Using Vite proxy
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const dbCategories = await response.json(); // Data from database
    console.log('[App.vue fetchData] Received DB data:', JSON.stringify(dbCategories, null, 2));

    // Create the placeholder object
    const placeholder = {
      id: addCategoryPlaceholderId,
      name: 'Add Category', // Name for debugging/tracking if needed
      links: [], // Needs links array to match structure expected by CategoryCard (even though v-else prevents its use)
      // No 'position' needed from DB, its position is determined by its place in the array
    };

    // Process DB categories (ensure links array exists)
    let combinedList = dbCategories.map(cat => ({ ...cat, links: cat.links || [] }));

    // --- Retrieve and use saved placeholder index ---
    const savedIndexStr = localStorage.getItem(localStorageKey);
    let placeholderIndex = -1; // Default to invalid index

    if (savedIndexStr !== null) {
        const savedIndex = parseInt(savedIndexStr, 10);
        // Validate the saved index is within the bounds of the *current* list + 1 (for appending)
        if (!isNaN(savedIndex) && savedIndex >= 0 && savedIndex <= combinedList.length) {
             placeholderIndex = savedIndex;
        } else {
            console.warn(`Invalid placeholder index '${savedIndexStr}' found in local storage. Resetting.`);
            localStorage.removeItem(localStorageKey); // Clean up invalid value
        }
    }

    // Insert placeholder at the saved index, or append if index is invalid/missing
    if (placeholderIndex !== -1) {
        combinedList.splice(placeholderIndex, 0, placeholder); // Insert at specific index
        console.log(`[App.vue fetchData] Inserted placeholder at saved index: ${placeholderIndex}`);
    } else {
        combinedList.push(placeholder); // Append to the end (fallback/first time)
        console.log('[App.vue fetchData] Appended placeholder to end (no valid saved index).');
    }
    
    categories.value = combinedList; // Assign the final ordered list
    console.log('[App.vue fetchData] Assigned final list to categories.value:', JSON.stringify(categories.value, null, 2));
    console.log(`[App.vue fetchData] categories.value length: ${categories.value.length}`);
  } catch (err) {
    console.error("[App.vue fetchData] Fetch data error:", err);
    error.value = 'Failed to load data. Please try refreshing.';
  } finally {
    loading.value = false;
    console.log(`[App.vue fetchData] Set loading to false. Loading state: ${loading.value}`);
  }
};

// --- Lifecycle Hooks & Search ---
// ... onMounted, watchEffect, performSearch remain the same ...
onMounted(async () => {
    await fetchConfig();
    // Only fetch data if config is okay
    if (!configError.value) {
         await fetchData();
    } else {
        loading.value = false; // Ensure data loading stops if config fails
        console.log('[App.vue onMounted] Config error, skipping data fetch.');
    }
     console.log('[App.vue onMounted] Initial mount fetches complete.');
     console.log('[App.vue onMounted] Final v-if flags state after fetches:', {
          configLoading: configLoading.value,
          configError: configError.value,
          loading: loading.value,
          error: error.value
     });
});

// Log flag changes for debugging v-if
watchEffect(() => {
    console.log('[App.vue watchEffect] v-if flags state changed:', {
        configLoading: configLoading.value,
        configError: configError.value,
        loading: loading.value,
        error: error.value
    });
    console.log('[App.vue watchEffect] Combined v-if condition (shouldShowCategories):', shouldShowCategories.value);
});


// --- Search ---
const performSearch = () => {

  // Check if config loaded and template is available
  if (configLoading.value || configError.value || !searxUrlTemplate.value) {
    console.error('Cannot search: Configuration not loaded or invalid.');
    // Optionally show a user-facing error/alert here
    return;
  }
  
    console.log('[App.vue performSearch] Attempting search.');
    console.log('[App.vue performSearch] Current searchQuery:', searchQuery.value);
    console.log('[App.vue performSearch] Current searxUrlTemplate:', searxUrlTemplate.value);
    console.log('[App.vue performSearch] Config Loading:', configLoading.value);
    console.log('[App.vue performSearch] Config Error:', configError.value);

    if (configLoading.value || configError.value || !searxUrlTemplate.value) {
    	console.error('[App.vue performSearch] Cannot search: Configuration not loaded or invalid.');
    	return;
    }
    
  if (searchQuery.value.trim()) {
    // Use the fetched template
    const url = searxUrlTemplate.value.replace('%s', encodeURIComponent(searchQuery.value));
    console.log('[App.vue performSearch] Constructed URL:', url);
    // window.location.href = url; // Redirect the current tab
    window.open(url, '_blank'); // Open searches in a new tab
  } else {
    console.log('[App.vue performSearch] Search query is empty.');
  }
};

// Category Management
const openAddCategoryModal = () => {
  modalError.value = '';
  isAddCategoryModalVisible.value = true;
};
const closeAddCategoryModal = () => {
  isAddCategoryModalVisible.value = false;
};

const addCategory = async (name) => {
   modalError.value = '';
  try {
    const response = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const newCategory = await response.json(); // Includes ID and Position from backend
    if (!response.ok) {
        throw new Error(newCategory.error || `HTTP error! status: ${response.status}`);
    }

    // Add the new category to the list, visually placing it before the placeholder
    const placeholderIndex = categories.value.findIndex(cat => cat.id === addCategoryPlaceholderId);

    if (placeholderIndex !== -1) {
        // Insert the new category just before the placeholder
        categories.value.splice(placeholderIndex, 0, { ...newCategory, links: [] });
    } else {
        // Fallback: Add to the end if placeholder somehow wasn't found (shouldn't happen)
        categories.value.push({ ...newCategory, links: [] });
        console.warn("Add category placeholder not found, appending new category to the end.");
    }

    console.log('Added category, updated categories.value:', JSON.stringify(categories.value));
    closeAddCategoryModal();
  } catch (err) {
    console.error("Add category error:", err);
    modalError.value = `Failed to add category: ${err.message}`;
  }
};

// Edit Category Functions
const openEditCategoryModal = (category) => {
    console.log("Opening edit modal for:", category);
    editModalError.value = ''; // Clear previous error
    categoryToEdit.value = category; // Store the category being edited
    isEditCategoryModalVisible.value = true;
};

const closeEditCategoryModal = () => {
    isEditCategoryModalVisible.value = false;
    categoryToEdit.value = null; // Clear the stored category
    editModalError.value = ''; // Clear error on close
};

const updateCategory = async ({ id, name }) => {
    editModalError.value = ''; // Clear previous error
    console.log(`Attempting to update category ${id} to name "${name}"`);
    try {
        const response = await fetch(`/api/categories/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        const responseData = await response.json(); // Read body even for errors
        if (!response.ok) {
            throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
        }

        // Update local state
        const categoryIndex = categories.value.findIndex(cat => cat.id === id);
        if (categoryIndex !== -1) {
            categories.value[categoryIndex].name = name; // Update the name directly
            console.log(`Updated category ${id} name locally.`);
        } else {
             console.warn(`Category with ID ${id} not found locally after update.`);
             // Optionally refetch data if local state seems inconsistent
             // await fetchData();
        }
        closeEditCategoryModal(); // Close modal on success

    } catch (err) {
        console.error("Update category error:", err);
        editModalError.value = `Failed to update category: ${err.message}`;
        // Keep modal open on error
    }
};

// Delete Category Function
const confirmDeleteCategory = async (categoryId) => {
    const categoryToDelete = categories.value.find(cat => cat.id === categoryId);
    if (!categoryToDelete) return; // Should not happen

    if (window.confirm(`Are you sure you want to delete the category "${categoryToDelete.name}"? This will also delete all links within it.`)) {
         console.log(`Attempting to delete category ${categoryId}`);
         try {
            const response = await fetch(`/api/categories/${categoryId}`, {
                method: 'DELETE',
            });

            if (response.status === 204) { // Success (No Content)
                 // Remove from local state
                categories.value = categories.value.filter(cat => cat.id !== categoryId);
                console.log(`Deleted category ${categoryId} locally.`);
                // Important: Update placeholder index in local storage if it was affected
                const currentPlaceholderIndex = categories.value.findIndex(cat => cat.id === addCategoryPlaceholderId);
                 if (currentPlaceholderIndex !== -1) {
                     localStorage.setItem(localStorageKey, currentPlaceholderIndex.toString());
                     console.log(`Updated placeholder index to ${currentPlaceholderIndex} after deletion.`);
                 } else {
                     // Should not happen unless placeholder was deleted, but good to handle
                     localStorage.removeItem(localStorageKey);
                 }

            } else {
                 // Handle potential errors (e.g., 404 Not Found, 500 Server Error)
                 let errorMsg = `HTTP error! status: ${response.status}`;
                 try {
                      const errorData = await response.json();
                      errorMsg = errorData.error || errorMsg;
                 } catch (e) { /* Ignore if body isn't JSON */ }
                 throw new Error(errorMsg);
            }
        } catch (err) {
            console.error("Delete category error:", err);
            // Display error to user (could use a more prominent notification system)
            error.value = `Failed to delete category: ${err.message}`; // Use main error display for now
            // Optionally refetch data to ensure consistency if delete failed partially
            // await fetchData();
        }
    }
};

// State for managing links
const managingLinksInCategory = ref(new Set()); // Stores IDs of categories being managed

// State for Edit Link Modal
const isEditLinkModalVisible = ref(false);
const linkToEdit = ref(null);
const editLinkModalError = ref('');

// Link Management (Add, Edit, Delete) ---
// ADD LINK (Modal open/close/submit)
const openAddLinkModal = (categoryId) => { modalError.value = ''; currentCategoryIdForLink.value = categoryId; isAddLinkModalVisible.value = true; };
const closeAddLinkModal = () => { isAddLinkModalVisible.value = false; currentCategoryIdForLink.value = null; };
const addLink = async (linkData) => { modalError.value = ''; try { const response = await fetch('/api/links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(linkData), }); const newLink = await response.json(); if (!response.ok) { throw new Error(newLink.error || `HTTP ${response.status}`); } const category = categories.value.find(cat => cat.id === linkData.category_id); if (category) { if (!category.links) { category.links = []; } category.links.push(newLink); } else { console.warn(`Cat ${linkData.category_id} not found.`); } closeAddLinkModal(); } catch (err) { console.error("Add link error:", err); modalError.value = `Failed: ${err.message}`; } };

// Toggle Manage Links Mode
const toggleManageLinksMode = (categoryId) => {
    if (managingLinksInCategory.value.has(categoryId)) {
        managingLinksInCategory.value.delete(categoryId);
        console.log(`Stopped managing links for category ${categoryId}`);
    } else {
        managingLinksInCategory.value.add(categoryId);
        console.log(`Started managing links for category ${categoryId}`);
    }
};

// Edit Link Functions
const openEditLinkModal = (link) => {
    console.log("Opening edit modal for link:", link);
    editLinkModalError.value = ''; // Clear previous error
    linkToEdit.value = link;      // Store the link object
    isEditLinkModalVisible.value = true;
};

const closeEditLinkModal = () => {
    isEditLinkModalVisible.value = false;
    linkToEdit.value = null;      // Clear stored link
    editLinkModalError.value = ''; // Clear error
};

const updateLink = async ({ id, name, url, new_tab }) => {
    editLinkModalError.value = '';
    console.log(`Attempting to update link ${id} to name "${name}", url "${url}", new_tab ${new_tab}`);
    try {
        const response = await fetch(`/api/links/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, url, new_tab }),
        });
        const updatedLink = await response.json(); // Read body even for errors
        if (!response.ok) {
            throw new Error(updatedLink.error || `HTTP error! status: ${response.status}`);
        }

        // Find and update the link in the local state
        let found = false;
        for (const category of categories.value) {
            if (category.links && category.id !== addCategoryPlaceholderId) {
                const linkIndex = category.links.findIndex(link => link.id === id);
                if (linkIndex !== -1) {
                    // Update the properties of the existing link object
                    category.links[linkIndex].name = updatedLink.name;
                    category.links[linkIndex].url = updatedLink.url;
                    category.links[linkIndex].new_tab = updatedLink.new_tab;
                    console.log(`Updated link ${id} locally in category ${category.id}.`);
                    found = true;
                    break; // Stop searching once found
                }
            }
        }
        if (!found) {
             console.warn(`Link with ID ${id} not found locally after update.`);
        }
        closeEditLinkModal(); // Close modal on success

    } catch (err) {
        console.error("Update link error:", err);
        editLinkModalError.value = `Failed to update link: ${err.message}`;
        // Keep modal open on error
    }
};


// NEW - Delete Link Function
const confirmDeleteLink = async (linkId, categoryId) => {
    // Find the link name for the confirmation message (optional but nice)
    const category = categories.value.find(cat => cat.id === categoryId);
    const link = category?.links?.find(lnk => lnk.id === linkId);
    const linkName = link ? `"${link.name}"` : `ID ${linkId}`;

    if (window.confirm(`Are you sure you want to delete the link ${linkName}?`)) {
         console.log(`Attempting to delete link ${linkId} from category ${categoryId}`);
         try {
            const response = await fetch(`/api/links/${linkId}`, {
                method: 'DELETE',
            });

            if (response.status === 204) { // Success (No Content)
                // Remove from local state
                if (category && category.links) {
                    category.links = category.links.filter(lnk => lnk.id !== linkId);
                    console.log(`Deleted link ${linkId} locally from category ${categoryId}.`);
                } else {
                     console.warn(`Could not find category ${categoryId} or its links locally after delete.`);
                     // Maybe refetch if state seems corrupt
                     // await fetchData();
                }
            } else {
                 let errorMsg = `HTTP error! status: ${response.status}`;
                 try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; } catch (e) { /* Ignore */ }
                 throw new Error(errorMsg);
            }
        } catch (err) {
            console.error("Delete link error:", err);
            error.value = `Failed to delete link: ${err.message}`; // Use main error display
        }
    }
};



// --- Drag and Drop ---
const onDragEnd = async () => {
  // The categories.value array *already* reflects the new visual order after drag

  // --- FILTER OUT placeholder BEFORE calculating order for backend ---
  const updatedOrderForBackend = categories.value
      .filter(cat => cat.id !== addCategoryPlaceholderId) // Get only real categories
      .map((cat, index) => ({ // Map them to the required structure, using their new index
          id: cat.id,
          position: index,
      }));

  console.log('Order changed. Full frontend order:', categories.value.map(c => c.id));
  console.log('Order to send to backend (filtered):', updatedOrderForBackend);

  // --- SAVE placeholder index to Local Storage ---
  const currentPlaceholderIndex = categories.value.findIndex(cat => cat.id === addCategoryPlaceholderId);
  if (currentPlaceholderIndex !== -1) {
      localStorage.setItem(localStorageKey, currentPlaceholderIndex.toString());
      console.log(`Saved placeholder index ${currentPlaceholderIndex} to local storage.`);
  } else {
      console.warn("Could not find placeholder after drag to save its index.");
      localStorage.removeItem(localStorageKey); // Remove potentially stale index
  }
  // --- End saving placeholder index ---


  // Only send update to backend if there are actual categories to update
  if (updatedOrderForBackend.length === 0) {
      console.log('No real categories to update order for.');
      return; // Skip backend call if only the placeholder exists/was moved
  }

  try {
    const response = await fetch('/api/categories/order', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedOrderForBackend), // Send filtered list
    });
     const result = await response.json();
    if (!response.ok) {
        // If backend save fails, we should ideally revert the local storage change too,
        // or at least remove the potentially bad index. Let's remove it on error.
        localStorage.removeItem(localStorageKey);
        console.warn("Removed placeholder index from local storage due to backend save error.");
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
    }
    console.log('Category order saved successfully to backend.');
    // No need to refetch here, we trust the local storage + backend position on next load
    // await fetchData(); // Uncomment this line if you prefer strict sync after save

  } catch (err) {
    console.error("Error saving category order:", err);
    error.value = `Failed to save new order: ${err.message}. Reverting local order.`;
    // Force refetch to revert to last known good state from DB
    await fetchData();
  }
};

</script>

<style scoped>
/* Add specific scoped styles if needed */
.add-category-card {
  /* Ensure it looks clickable and behaves visually like other cards for dragging */
   display: flex;
   justify-content: center;
   align-items: center;
   font-size: 3em;
   color: #61dafb; /* Or your theme's accent color */
   min-height: 100px; /* Match other cards or set appropriate height */
   /* cursor: pointer !important; If dragging overrides cursor */
}
.add-category-card:hover {
   background-color: #3a3a5e; /* Match card hover */
}
</style>