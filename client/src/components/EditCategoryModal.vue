<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <h2>Edit Category Name</h2>
      <form @submit.prevent="submitUpdate" class="modal-form">
        <div>
          <label for="editCategoryName">Category Name:</label>
          <input
            type="text"
            id="editCategoryName"
            v-model="categoryName"
            required
            ref="categoryNameInput"
            placeholder="Enter new category name"
          />
        </div>
        <div class="modal-actions">
          <button type="button" class="modal-button modal-button-secondary" @click="closeModal">
            Cancel
          </button>
          <button type="submit" class="modal-button modal-button-primary" :disabled="!isChanged || !categoryName.trim()">
            Save Changes
          </button>
        </div>
         <p v-if="errorMessage" style="color: red; margin-top: 10px;">{{ errorMessage }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue';

const props = defineProps({
  isVisible: Boolean,
  category: { // Category object being edited
    type: Object,
    default: null // Use default null
  },
  errorMessage: String,
});
const emit = defineEmits(['close', 'update-category']);

const categoryName = ref('');
const originalName = ref('');
const categoryNameInput = ref(null); // Ref for the input element

// Watch for visibility changes or when the category prop changes
watch(() => [props.isVisible, props.category], ([newVisible, newCategory]) => {
  if (newVisible && newCategory) {
    categoryName.value = newCategory.name || ''; // Populate input
    originalName.value = newCategory.name || ''; // Store original name
    nextTick(() => {
        categoryNameInput.value?.focus();
        categoryNameInput.value?.select(); // Select text for easy editing
    });
  } else if (!newVisible) {
     // Optional: Reset on close if needed, though watch handles repopulation
     categoryName.value = '';
     originalName.value = '';
  }
}, { immediate: true, deep: true }); // immediate/deep might be needed depending on usage pattern

const isChanged = computed(() => {
    return categoryName.value.trim() !== originalName.value.trim();
});

function closeModal() {
  emit('close');
}

function submitUpdate() {
  if (props.category && props.category.id && categoryName.value.trim() && isChanged.value) {
    emit('update-category', {
        id: props.category.id,
        name: categoryName.value.trim()
    });
    // Let parent handle closing on success/failure
  }
}
</script>

<style scoped>
/* Use existing modal styles or add specific ones */
.modal-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>