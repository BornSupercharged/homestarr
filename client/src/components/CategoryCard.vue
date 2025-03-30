<script setup>
defineProps({
  category: {
    type: Object,
    required: true
  },
  // New prop to control visibility of link edit/delete icons
  isManaging: {
      type: Boolean,
      default: false
  }
});
// Declare emitted events
defineEmits([
    'add-link',
    'edit-category',
    'delete-category',
    'toggle-manage-links', 
    'edit-link',
    'delete-link' 
]);
</script>
<template>
  <div class="card category-card">
    <div class="category-header">
       <h3>{{ category.name }}</h3>
       <!-- These actions will show on header hover -->
       <div class="category-actions">
         <button @click.stop="$emit('edit-category', category)" class="icon-button" title="Edit Category Name">
           ✏️
         </button>
         <button @click.stop="$emit('delete-category', category.id)" class="icon-button icon-button-delete" title="Delete Category">
           🗑️
         </button>
       </div>
    </div>
    <div class="category-links">
       <ul>
         <li v-for="link in category.links" :key="link.id" class="link-item">
            <a :href="link.url" :target="link.new_tab ? '_blank' : '_self'" rel="noopener noreferrer" class="link-anchor">
                {{ link.name }}
            </a>
            <!-- Add Edit/Delete Icons for links, shown conditionally -->
            <div v-if="isManaging" class="link-actions">
                 <button @click.stop="$emit('edit-link', link)" class="icon-button" title="Edit Link">
                   ✏️
                 </button>
                 <button @click.stop="$emit('delete-link', link.id, category.id)" class="icon-button icon-button-delete" title="Delete Link">
                   🗑️
                 </button>
            </div>
         </li>
          <li v-if="!category.links || category.links.length === 0">
              <span style="color: #888; font-style: italic;">No links yet.</span>
          </li>
       </ul>
    </div>
    <!-- Add Link Button -->
    <button class="add-link-button" @click="$emit('add-link', category.id)">
      + Add Link
    </button>
    <!-- Manage Links Button -->
    <button
        v-if="category.links && category.links.length > 0"
        class="manage-links-button"
        @click="$emit('toggle-manage-links', category.id)">
      {{ isManaging ? 'Done Managing' : 'Manage Links' }}
    </button>
  </div>
</template>

<style scoped>
/* Scoped styles specific to CategoryCard, if needed */
.category-card {
  /* Add specific styles if they shouldn't be global */
  min-height: 150px; /* Ensure cards have some minimum height */
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid rgba(79, 79, 140, 0.5);
  padding-bottom: 5px;
  position: relative; /* Needed if absolute positioning were used, good practice anyway */
}

.category-header h3 {
  margin: 0;
  border: none;
  padding: 0;
  flex-grow: 1;
  margin-right: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-actions {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
  opacity: 0; /* Hidden by default */
  visibility: hidden; /* Hide from accessibility tree too */
  transition: opacity 0.2s ease-in-out, visibility 0s linear 0.2s; /* Smooth fade, delay visibility change */
}

/* Show actions when the header is hovered */
.category-header:hover .category-actions {
  opacity: 1;
  visibility: visible;
  transition-delay: 0s; /* Show immediately on hover */
}

.icon-button {
   background: none; border: none; padding: 3px 5px; cursor: pointer; font-size: 1em; color: #a0a0c0; border-radius: 4px; line-height: 1; transition: background-color 0.2s ease, color 0.2s ease;
}
.icon-button:hover { background-color: rgba(255, 255, 255, 0.1); color: #fff; }
.icon-button-delete:hover { color: #ff8a80; }

.link-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 2px 0; }
.link-anchor { padding-left: 10px; border-radius: 4px; transition: background-color 0.2s ease; word-break: break-all; flex-grow: 1; margin-right: 10px; color: #8bb7f0; text-decoration: none; }
.link-anchor:hover { background-color: #3a3a5e; color: #fff; }
.link-actions { display: flex; gap: 5px; flex-shrink: 0; }
.link-actions .icon-button { font-size: 0.9em; }
.add-link-button { display: block; width: 100%; margin-top: 10px; padding: 8px 10px; background-color: #4f4f8c; color: #e0e0e0; border: none; border-radius: 5px; cursor: pointer; text-align: center; font-size: 0.9em; transition: background-color 0.2s ease; }
.add-link-button:hover { background-color: #61dafb; color: #1a1a2e; }
.manage-links-button { display: block; width: 100%; margin-top: 8px; padding: 6px 10px; background-color: transparent; color: #a0a0c0; border: 1px solid #4f4f8c; border-radius: 5px; cursor: pointer; text-align: center; font-size: 0.85em; transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease; }
.manage-links-button:hover { background-color: #4f4f8c; border-color: #61dafb; color: #e0e0e0; }

</style>