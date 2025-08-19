# Power Pages - Bring Your Own Code - Contoso Blogs

This is a React-based sample application demonstrating how a multilingual blog website can be hosted on Power Pages with full internationalization (i18n) support using react-i18next. This sample showcases modern React development practices with a focus on localization across multiple languages.

## Features

### 🌍 Multi-language Support
- **4 Languages**: English, Spanish, French, and German
- **Dynamic Language Switching**: Users can change languages on-the-fly
- **Persistent Language Selection**: The selected language persists across page navigation
- **RTL Support Ready**: Architecture supports right-to-left languages

### 📝 Blog Functionality
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Modern UI/UX**: Clean, professional design with smooth animations
- **Sample Content**: Pre-populated with technical blog posts
- **Reading Time Estimation**: Shows estimated reading time for each post

### 🔧 Technical Features
- **TypeScript**: Full type safety and better developer experience
- **React Router**: Client-side routing for SPA experience
- **React i18next**: Robust internationalization framework
- **Semantic HTML**: Accessible markup with proper ARIA labels
- **CSS3**: Modern styling with flexbox and grid layouts

## Internationalization Implementation

### 1. Translation Structure
```
src/i18n/locales/
├── en.json (English - Default)
├── es.json (Spanish)
├── fr.json (French)
└── de.json (German)
```

### 2. Key Features Demonstrated

#### Hierarchical Translation Keys
```json
{
  "nav": {
    "home": "Home",
    "about": "About",
    "blog": "Blog"
  },
  "home": {
    "welcome": "Welcome to My Blog",
    "description": "This is a demonstration..."
  }
}
```

#### String Interpolation
```typescript
// Dynamic content with variables
t('blog.readingTime', { minutes: post.readingTime })
// Result: "5 min read"
```

#### Array Translation
```typescript
// Handle translated arrays
t('about.skillsList', { returnObjects: true })
```

#### Language Selector Component
```typescript
const LanguageSelector = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (event) => {
    i18n.changeLanguage(event.target.value);
  };

  return (
    <select value={i18n.language} onChange={handleLanguageChange}>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.nativeName}
        </option>
      ))}
    </select>
  );
};
```

## Getting Started

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- Basic knowledge of React and TypeScript

## Installation

1. Clone the repository:

   ```powershell
   git clone https://github.com/microsoft/power-pages-samples
   cd samples/bring-your-own-code/react/localization-sample/
   ```

2. Install dependencies:

   ```powershell
   npm install
   ```

## Development

To start the development server:

```powershell
npm run dev
```

The application will be available at `http://localhost:5173`

## Building for Production

To create a production build:

```powershell
npm run build
```

The built files will be in the `dist` directory.

## Running on Power Pages

Below steps will help you run this localized blog app in Power Pages.

### Setup

1. Install [Microsoft Power Platform CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction?tabs=windows#install-microsoft-power-platform-cli). (Version should be >= 1.43.6)
2. Allow `*.js` files by removing it from `Blocked Attachments` in `Privacy + Security` settings for your environment from Power Pages Admin Center.
3. Open a terminal and cd into `localization-sample` folder.
4. Run `pac auth create --environment <Environment URL>` to login to your environment.

### Uploading site to Power Pages

1. Open a terminal and cd into `localization-sample` folder.
2. Run `npm run build` to build the code.
3. Run `pac pages upload-code-site --rootPath .` to upload the site to Power Pages.
4. Go to Power Pages home and click on **Inactive sites**.
5. You should see **Contoso Blogs** site listed there. Click on **Reactivate** to proceed.
6. Once the site is activated, click on **Preview** to see it running on Power Pages.
7. Additionally, install [Power Platform Tools VS Code extension](https://aka.ms/power-platform-vscode) to easily upload the site in future iterations with a single click from within VS Code.

**Note:** The language selector will work immediately - try switching between English, Spanish, French, and German to see the localization in action!

## Project Structure

```text
localization-sample/
├── public/
│   └── blog-icon.svg
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── BlogCard.tsx
│   │   └── LanguageSelector.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── About.tsx
│   │   ├── Blog.tsx
│   │   └── BlogPost.tsx
│   ├── i18n/
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── en.json
│   │       ├── es.json
│   │       ├── fr.json
│   │       └── de.json
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .powerpages-site/
│   ├── website.yml
│   └── web-pages/
├── index.html
├── package.json
├── powerpages.config.json
├── tsconfig.json
└── vite.config.ts
```

## Technologies Used

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [React Router](https://reactrouter.com/)
- [React i18next](https://react.i18next.com/)
- [i18next](https://www.i18next.com/)
- [Vite](https://vite.dev/guide/)

## Key Localization Features

This sample demonstrates comprehensive internationalization capabilities:

### Language Support
- **English (en)**: Default language with complete translations
- **Spanish (es)**: Full Spanish localization including cultural adaptations
- **French (fr)**: Complete French translations with proper grammar
- **German (de)**: German translations with appropriate formal/informal language

### Translation Features
- **Hierarchical Translation Keys**: Organized structure for maintainable translations
- **String Interpolation**: Dynamic content with variable substitution
- **Array Translations**: Support for translated lists and arrays
- **Real-time Language Switching**: Instant language changes without page reload
- **Persistent Language Selection**: User's language choice persists across sessions

## Localization Best Practices Demonstrated

### 1. **Organized Translation Keys**
- Hierarchical structure for better organization
- Logical grouping by component/page
- Consistent naming conventions

### 2. **Dynamic Content Handling**
- String interpolation for variables
- Pluralization support
- Date and number formatting

### 3. **User Experience**
- Native language names in language selector
- Smooth language switching without page reload
- Consistent layout across all languages

### 4. **Developer Experience**
- TypeScript integration for type safety
- Centralized translation management
- Easy addition of new languages

## Adding New Languages

1. **Create translation file:**
   ```bash
   # Add new language file
   src/i18n/locales/it.json
   ```

2. **Add translations:**
   ```json
   {
     "nav": {
       "home": "Casa",
       "about": "Chi siamo",
       "blog": "Blog"
     }
     // ... other translations
   }
   ```

3. **Update language list:**
   ```typescript
   // src/types/index.ts
   export const SUPPORTED_LANGUAGES: Language[] = [
     { code: 'en', name: 'English', nativeName: 'English' },
     { code: 'es', name: 'Spanish', nativeName: 'Español' },
     { code: 'fr', name: 'French', nativeName: 'Français' },
     { code: 'de', name: 'German', nativeName: 'Deutsch' },
     { code: 'it', name: 'Italian', nativeName: 'Italiano' } // New language
   ];
   ```

4. **Import in i18n config:**
   ```typescript
   // src/i18n/index.ts
   import itTranslation from './locales/it.json';

   const resources = {
     // ... existing languages
     it: { translation: itTranslation }
   };
   ```

## Power Pages Integration

This sample is designed to work seamlessly with Microsoft Power Pages and demonstrates:

- **Multi-language Support**: Complete localization for 4 languages (English, Spanish, French, German)
- **Single Page Application**: Client-side routing with React Router
- **Responsive Design**: Mobile-first approach that works on all devices
- **Modern Build Process**: Optimized Vite builds for production deployment
- **Type Safety**: Full TypeScript integration for better development experience

The application showcases how to build production-ready, multilingual web applications that can be easily deployed to Power Pages while maintaining all localization features.

## Browser Support

- **Modern Browsers**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **Mobile**: iOS Safari 14+, Chrome Mobile 88+
- **Accessibility**: WCAG 2.1 AA compliant

## Performance Features

- **Code Splitting**: React.lazy for dynamic imports
- **Optimized Bundle**: Tree-shaking and minification
- **Responsive Images**: Optimized loading for different screen sizes
- **Lazy Loading**: On-demand loading of translation resources

## Contributing

When adding new features or translations:

1. **Follow TypeScript strict mode**
2. **Add proper type definitions**
3. **Update all language files consistently**
4. **Test across all supported languages**
5. **Maintain responsive design principles**

## License

This sample is provided under the MIT License. See LICENSE file for details.

---

This sample demonstrates modern React development practices with a focus on internationalization, making it an excellent starting point for multilingual web applications in Power Pages.
