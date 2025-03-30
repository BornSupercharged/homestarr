<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2>Add New Category</h2>
      <form @submit.prevent="submitCategory" class="modal-form">
        <div>
          <label for="categoryName">Category Name:</label>
          <input
            type="text"
            id="categoryName"
            v-model="categoryName"
            required
            ref="categoryNameInput"
            placeholder="e.g., Work Tools, Fun Sites"
          />
        </div>
        <div class="modal-actions">
          <button type="button" class="modal-button modal-button-secondary" @click="$emit('close')">
            Cancel
          </button>
          <button type="submit" class="modal-button modal-button-primary">
            Add Category
          </button>
        </div>
         <p v-if="errorMessage" style="color: red; margin-top: 10px;">{{ errorMessage }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
  isVisible: Boolean,
  errorMessage: String,
});
const emit = defineEmits(['close', 'add-category']);

const categoryName = ref('');
const categoryNameInput = ref(null); // Ref for the input element

watch(() => props.isVisible, (newVal) => {
  if (newVal) {
    categoryName.value = ''; // Reset name when modal opens
    // Focus the input field when the modal becomes visible
    nextTick(() => {
        categoryNameInput.value?.focus();
    });
  }
});

function submitCategory() {
  if (categoryName.value.trim()) {
    emit('add-category', categoryName.value.trim());
    // Keep modal open if there's an error, otherwise parent handles close
    // emit('close'); // Let parent decide to close based on API response
  }
}
</script>

<style scoped>
/* Scoped styles specific to AddCategoryModal, if needed */
</style>