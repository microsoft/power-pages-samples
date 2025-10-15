# Bank Loan Application

A comprehensive bank loan application sample built with React, TypeScript, and Fluent UI v9 controls for Microsoft Power Pages.

## Overview

This sample demonstrates how to create a modern loan application portal with:
- **Loan Application Form**: A detailed form using Fluent UI controls to collect applicant information
- **Applications Dashboard**: A data grid view to display and manage submitted loan applications
- **State Management**: React Context API for managing application state
- **Modern UI**: Fluent UI v9 design system with responsive layouts

## Features

### Loan Application Form
- Personal information fields (First Name, Last Name, Email, Phone)
- Loan details (Amount, Purpose, Term, Employment Status, Annual Income)
- Form validation
- Success notifications using Fluent UI components
- Responsive design for mobile and desktop

### Applications Dashboard
- DataGrid with sortable columns
- Real-time application status tracking (Pending, Under Review, Approved, Rejected)
- Status badges with color coding
- Currency and date formatting
- Responsive table layout

### Fluent UI Components Used
- `Input`: Text and numeric input fields
- `Dropdown`: Select controls for loan purpose, term, and employment status
- `Button`: Primary and secondary action buttons
- `Field`: Form field wrapper with labels
- `Card`: Container component for sections
- `DataGrid`: Advanced table component with sorting and resizing
- `Badge`: Status indicators
- `TabList` & `Tab`: Navigation between views
- `FluentProvider`: Theme provider

## Project Structure

```
fluent-ui-sample/
├── src/
│   ├── components/
│   │   ├── LoanApplicationForm.tsx    # Loan application form component
│   │   └── ApplicationsList.tsx        # Applications data grid component
│   ├── context/
│   │   └── LoanContext.tsx            # State management context
│   ├── types/
│   │   └── LoanApplication.ts         # TypeScript type definitions
│   ├── App.tsx                        # Main app component with navigation
│   ├── main.tsx                       # Application entry point
│   └── index.css                      # Global styles
├── public/                            # Static assets
├── index.html                         # HTML entry point
├── package.json                       # Dependencies and scripts
├── tsconfig.json                      # TypeScript configuration
├── vite.config.ts                     # Vite build configuration
├── powerpages.config.json            # Power Pages configuration
└── README.md                          # This file
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager

### Installation

1. Navigate to the project directory:
   ```bash
   cd samples/bring-your-own-code/react/fluent-ui-sample
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

Create a production build:
```bash
npm run build
```

The build output will be in the `dist/` directory.

### Preview Production Build

Preview the production build locally:
```bash
npm run preview
```

## Usage

### Applying for a Loan

1. Click on the "Apply for Loan" tab
2. Fill out all required fields:
   - Personal information (name, email, phone)
   - Loan amount (minimum $1,000)
   - Select loan purpose from dropdown
   - Choose loan term (12 to 360 months)
   - Select employment status
   - Enter annual income
3. Click "Submit Application"
4. A success message will appear confirming submission

### Viewing Applications

1. Click on the "View Applications" tab
2. See all submitted applications in a sortable data grid
3. Click column headers to sort by different fields
4. View application status with color-coded badges

## Loan Application Types

The application supports the following loan purposes:
- Home Purchase
- Home Improvement
- Auto Loan
- Personal Loan
- Business Loan
- Education
- Debt Consolidation
- Other

## Application Status

Applications can have the following statuses:
- **Pending** (Yellow): Just submitted, awaiting review
- **Under Review** (Blue): Being evaluated by loan officers
- **Approved** (Green): Loan approved
- **Rejected** (Red): Loan application denied

## Technologies Used

- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe development
- **Fluent UI v9**: Microsoft's design system
- **Vite**: Fast build tool and dev server
- **React Context API**: State management

## Customization

### Adding New Loan Purposes

Edit `src/types/LoanApplication.ts`:
```typescript
export type LoanPurpose = 
  | 'Home Purchase'
  | 'Your New Purpose'
  // ...
```

### Modifying Loan Terms

Update the `loanTerms` array in `src/components/LoanApplicationForm.tsx`:
```typescript
const loanTerms: { value: LoanTerm; label: string }[] = [
  { value: 12, label: '1 year (12 months)' },
  // Add your custom terms
];
```

### Styling

The application uses Fluent UI's `makeStyles` hook for styling. Customize styles in individual components or modify the theme in `App.tsx`.

## Running on Power Pages

Below steps will help you run this app in Power Pages.

### Setup

1. Install [Microsoft Power Platform CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction?tabs=windows#install-microsoft-power-platform-cli). (Version should be >= 1.47.1)
1. Allow `*.js` files by removing it from `Blocked Attachments` in `Privacy + Security` settings for your environment from Power Pages Admin Center.
1. Open a terminal and cd into `fluent-ui-sample` folder.
1. Run `pac auth create --environment <Environment URL>` to login to your environment.

### Uploading site to Power Pages

1. Open a terminal and cd into `fluent-ui-sample` folder.
1. Run `npm run build` to build the code.
1. Run `pac pages upload-code-site --rootPath .` to upload the site to Power Pages.
1. Go to Power Pages home and click on **Inactive sites**.
1. You should see **Bank Loan Application** site listed there. Click on **Reactivate** to proceed.
1. Once the site is activated, click on **Preview** to see it running on Power Pages.
1. Additionally, install [Power Platform Tools VS Code extension](https://aka.ms/power-platform-vscode) to easily upload the site in future iterations with a single click from within VS Code.

## Browser Support

- Chrome (latest)
- Edge (latest)
- Firefox (latest)
- Safari (latest)

## Contributing

Contributions are welcome! Please follow the repository's contribution guidelines.

## License

This sample is provided as-is under the MIT License. See the repository LICENSE file for details.

## Support

For issues and questions:
- Check the [Power Pages documentation](https://learn.microsoft.com/power-pages/)
- Review [Fluent UI React documentation](https://react.fluentui.dev/)
- Open an issue in the repository

## Learn More

- [Fluent UI React Components](https://react.fluentui.dev/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Power Pages Documentation](https://learn.microsoft.com/power-pages/)
