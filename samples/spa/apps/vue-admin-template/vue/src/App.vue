<template>
  <div class="admin-shell">
    <aside class="sidebar">
      <img class="logo" :src="logoUrl" alt="Vue Admin Template logo">
      <p class="eyebrow">Power Pages sample</p>
      <h1>Vue Admin Template</h1>
      <nav aria-label="Admin sections">
        <RouterLink
          v-for="section in sections"
          :key="section.name"
          :to="section.path"
        >
          {{ section.title }}
        </RouterLink>
      </nav>
    </aside>
    <main>
      <section class="hero">
        <p class="eyebrow">Bring your own code</p>
        <h2>Modern Vue sample for Power Pages</h2>
        <p>
          This template uses Vue 3 and Vite so makers can build and upload the
          site without relying on vulnerable legacy tooling.
        </p>
      </section>
      <RouterView />
    </main>
  </div>
</template>

<script>
import { adminSections } from './router';
import logoUrl from '../static/logo.png';

export default {
  name: 'App',
  data() {
    return {
      logoUrl,
      sections: adminSections
    };
  }
};
</script>

<style>
.admin-shell {
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: 100vh;
  background: #f5f7fb;
  color: #172033;
}

.sidebar {
  background: #1d2939;
  color: #ffffff;
  padding: 32px;
}

.logo {
  width: 56px;
  height: 56px;
  margin-bottom: 32px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #6b8afd;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1,
h2 {
  margin: 0;
}

nav {
  display: grid;
  gap: 10px;
  margin-top: 32px;
}

a {
  border-radius: 12px;
  color: inherit;
  padding: 12px 14px;
  text-decoration: none;
}

a.router-link-active {
  background: rgba(255, 255, 255, 0.14);
}

main {
  padding: 40px;
}

.hero,
.panel {
  max-width: 880px;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 18px 45px rgba(23, 32, 51, 0.08);
  margin-bottom: 24px;
  padding: 32px;
}

.hero p,
.panel p {
  color: #53627c;
  line-height: 1.7;
}

@media (max-width: 760px) {
  .admin-shell {
    grid-template-columns: 1fr;
  }
}
</style>
