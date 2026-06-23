<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  listFiles,
  uploadFile,
  downloadFile,
  deleteFile,
  validateFile,
  formatSize,
  type UploadedFile,
} from './fileService'

// One screen: pick a file, upload it, see your files, download or delete them.
// All the Web API work lives in fileService.ts.
const files = ref<UploadedFile[]>([])
const busy = ref(false)
const error = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

async function refresh() {
  try {
    files.value = await listFiles()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not load files.'
  }
}

onMounted(refresh)

async function handleFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  error.value = ''

  // Guard before touching the network.
  const validationError = validateFile(file)
  if (validationError) {
    error.value = validationError
    if (inputRef.value) inputRef.value.value = ''
    return
  }

  busy.value = true
  try {
    await uploadFile(file)
    await refresh()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Upload failed.'
  } finally {
    busy.value = false
    if (inputRef.value) inputRef.value.value = ''
  }
}

async function handleDelete(id: string) {
  busy.value = true
  error.value = ''
  try {
    await deleteFile(id)
    await refresh()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Delete failed.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="card">
    <h1>My documents</h1>
    <p class="subtitle">
      Files are stored as Dataverse notes on your contact record, uploaded and
      downloaded through the Power Pages Web API.
    </p>

    <label :class="`upload ${busy ? 'disabled' : ''}`">
      {{ busy ? 'Working…' : '＋ Upload a file' }}
      <input
        ref="inputRef"
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.txt"
        :disabled="busy"
        hidden
        @change="handleFile"
      />
    </label>
    <p class="hint">PDF, PNG, JPEG, or TXT · up to 3.5 MB</p>

    <p v-if="error" class="error">⚠️ {{ error }}</p>

    <p v-if="files.length === 0" class="empty">No files yet.</p>
    <ul v-else class="files">
      <li v-for="f in files" :key="f.annotationid">
        <div>
          <span class="name">{{ f.filename }}</span>
          <span class="meta">{{ formatSize(f.filesize) }}</span>
        </div>
        <div class="actions">
          <button :disabled="busy" @click="downloadFile(f.annotationid)">
            Download
          </button>
          <button
            class="danger"
            :disabled="busy"
            @click="handleDelete(f.annotationid)"
          >
            Delete
          </button>
        </div>
      </li>
    </ul>
  </main>
</template>
