<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2>Add New Link</h2>
      <form @submit.prevent="submitLink" class="modal-form">
        <div>
          <label for="linkName">Link Name:</label>
          <input type="text" id="linkName" v-model="link.name" required ref="linkNameInput" placeholder="e.g., Google Drive">
        </div>
        <div>
          <label for="linkUrl">Link URL:</label>
          <input type="url" id="linkUrl" v-model="link.url" required placeholder="https://...">
        </div>
        <div>
          <label class="checkbox-label">
            <input type="checkbox" v-model="link.new_tab">
            Open in new tab
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="modal-button modal-button-secondary" @click="$emit('close')">
            Cancel
          </button>
          <button type="submit" class="modal-button modal-button-primary">
            Add Link
          </button>
        </div>
         <p v-if="errorMessage" style="color: red; margin-top: 10px;">{{ errorMessage }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from 'vue';

const props = defineProps({
  isVisible: Boolean,
  categoryId: Number,
  errorMessage: String,
});
const emit = defineEmits(['close', 'add-link']);

const linkNameInput = ref(null); // Ref for the input element

const link = reactive({
  name: '',
  url: '',
  new_tab: true, // Default to opening in new tab
});

watch(() => props.isVisible, (newVal) => {
  if (newVal) {
    // Reset form when modal opens
    link.name = '';
    link.url = '';
    link.new_tab = true;
     // Focus the input field when the modal becomes visible
    nextTick(() => {
        linkNameInput.value?.focus();
    });
  }
});

function submitLink() {
  if (link.name.trim() && link.url.trim() && props.categoryId) {
    emit('add-link', { ...link, category_id: props.categoryId });
    // emit('close'); // Let parent decide to close
  }
}
</script>

<style scoped>
/* Scoped styles specific to AddLinkModal, if needed */
</style>