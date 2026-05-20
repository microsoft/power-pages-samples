import { createRouter, createWebHashHistory } from 'vue-router';

export const adminSections = [
  {
    path: '/',
    name: 'Dashboard',
    title: 'Dashboard',
    description: 'Track visits, revenue, and support activity for the portal.'
  },
  {
    path: '/mailbox',
    name: 'Mailbox',
    title: 'Mailbox',
    description: 'Review customer messages and triage follow-up work.'
  },
  {
    path: '/calendar',
    name: 'Calendar',
    title: 'Calendar',
    description: 'Coordinate launches, appointments, and content updates.'
  },
  {
    path: '/media',
    name: 'Media',
    title: 'Media',
    description: 'Organize reusable portal assets for authors and makers.'
  },
  {
    path: '/social',
    name: 'Social',
    title: 'Social',
    description: 'Monitor campaign engagement across social channels.'
  },
  {
    path: '/reports',
    name: 'Reports',
    title: 'Reports',
    description: 'Summarize sample metrics in a Power Pages-ready Vue app.'
  }
];

function createSectionView(section) {
  return {
    name: `${section.name}View`,
    template: `
      <section class="panel">
        <p class="eyebrow">{{ section.name }}</p>
        <h2>{{ section.title }}</h2>
        <p>{{ section.description }}</p>
      </section>
    `,
    data() {
      return { section };
    }
  };
}

export default createRouter({
  history: createWebHashHistory(),
  routes: adminSections.map((section) => ({
    path: section.path,
    name: section.name,
    component: createSectionView(section)
  }))
});
