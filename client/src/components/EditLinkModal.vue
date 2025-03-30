<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <h2>Edit Link</h2>
      <form @submit.prevent="submitUpdate" class="modal-form">
        <div>
          <label for="editLinkName">Link Name:</label>
          <input type="text" id="editLinkName" v-model="editableLink.name" required ref="linkNameInput" placeholder="e.g., Google Drive">
        </div>
        <div>
          <label for="editLinkUrl">Link URL:</label>
          <input type="url" id="editLinkUrl" v-model="editableLink.url" required placeholder="https://...">
        </div>
        <div>
          <label class="checkbox-label">
            <input type="checkbox" v-model="editableLink.new_tab">
            Open in new tab
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="modal-button modal-button-secondary" @click="closeModal">
            Cancel
          </button>
          <button type="submit" class="modal-button modal-button-primary" :disabled="!isChanged">
            Save Changes
          </button>
        </div>
         <p v-if="errorMessage" style="color: red; margin-top: 10px;">{{ errorMessage }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, nextTick, computed } from 'vue';

const props = defineProps({
  isVisible: Boolean,
  link: { // Link object being edited
    type: Object,
    default: null
  },
  errorMessage: String,
});
const emit = defineEmits(['close', 'update-link']);

const linkNameInput = ref(null); // Ref for the input element
const originalLink = reactive({ name: '', url: '', new_tab: false });
const editableLink = reactive({ id: null, name: '', url: '', new_tab: false });

watch(() => props.link, (newLink) => {
  if (newLink && props.isVisible) {
    // Store original values and populate editable copy when link prop changes AND modal is visible
    originalLink.id = newLink.id; // No id needed for original, just comparison
    originalLink.name = newLink.name || '';
    originalLink.url = newLink.url || '';
    originalLink.new_tab = !!newLink.new_tab; // Ensure boolean

    editableLink.id = newLink.id;
    editableLink.name = newLink.name || '';
    editableLink.url = newLink.url || '';
    editableLink.new_tab = !!newLink.new_tab;

    // Focus after the DOM updates
    nextTick(() => {
        linkNameInput.value?.focus();
    });
  }
}, { deep: true }); // Watch deeply for prop changes

// Also reset/focus when visibility changes to true
watch(() => props.isVisible, (newVisible) => {
    if (newVisible && props.link) {
        // Repopulate from potentially updated props.link when becoming visible
        originalLink.name = props.link.name || '';
        originalLink.url = props.link.url || '';
        originalLink.new_tab = !!props.link.new_tab;

        editableLink.id = props.link.id;
        editableLink.name = props.link.name || '';
        editableLink.url = props.link.url || '';
        editableLink.new_tab = !!props.link.new_tab;

         nextTick(() => {
            linkNameInput.value?.focus();
        });
    } else if (!newVisible) {
        // Optional: Clear when closing
        Object.assign(editableLink, { id: null, name: '', url: '', new_tab: false });
        Object.assign(originalLink, { name: '', url: '', new_tab: false });
    }
});


const isChanged = computed(() => {
    if (!props.link) return false; // No link loaded yet
    return editableLink.name.trim() !== originalLink.name.trim() ||
           editableLink.url.trim() !== originalLink.url.trim() ||
           editableLink.new_tab !== originalLink.new_tab;
});

function closeModal() {
  emit('close');
}

function submitUpdate() {
  if (editableLink.id && editableLink.name.trim() && editableLink.url.trim() && isChanged.value) {
    emit('update-link', {
        id: editableLink.id,
        name: editableLink.name.trim(),
        url: editableLink.url.trim(),
        new_tab: editableLink.new_tab
    });
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