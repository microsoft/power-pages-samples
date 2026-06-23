<script setup lang="ts">
import { ref } from 'vue'
import { requestCallback, type CallbackResponse } from './cloudFlowClient'

// One screen, one button. The UI exists only to demonstrate the flow call in
// cloudFlowClient.ts and to render its three states: loading, error, result.
const name = ref('')
const topic = ref('Account help')
const status = ref<'idle' | 'loading' | 'error'>('idle')
const result = ref<CallbackResponse | null>(null)
const error = ref('')

async function handleSubmit() {
  status.value = 'loading'
  error.value = ''
  result.value = null
  try {
    const response = await requestCallback({ name: name.value, topic: topic.value })
    result.value = response
    status.value = 'idle'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Something went wrong.'
    status.value = 'error'
  }
}
</script>

<template>
  <main class="card">
    <h1>Request a callback</h1>
    <p class="subtitle">
      Submitting this form calls a Power Automate cloud flow and shows what it
      returns.
    </p>

    <form @submit.prevent="handleSubmit">
      <label>
        Your name
        <input v-model="name" required placeholder="Jordan Avery" />
      </label>

      <label>
        Topic
        <select v-model="topic">
          <option>Account help</option>
          <option>Billing question</option>
          <option>Technical support</option>
        </select>
      </label>

      <button type="submit" :disabled="status === 'loading'">
        {{ status === 'loading' ? 'Calling flow…' : 'Request callback' }}
      </button>
    </form>

    <p v-if="status === 'error'" class="error">⚠️ {{ error }}</p>

    <div v-if="result" class="result">
      <h2>Flow response</h2>
      <dl>
        <dt>Ticket</dt>
        <dd>{{ result.ticketNumber }}</dd>
        <dt>Message</dt>
        <dd>{{ result.message }}</dd>
        <dt>Estimated callback</dt>
        <dd>{{ result.estimatedCallback }}</dd>
      </dl>
    </div>
  </main>
</template>
