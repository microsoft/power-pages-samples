# Power Pages - Bring Your Own Code - Credit Cards Website

This is a react based sample application to demonstrate how a react website can be hosted on Power Pages and integrated with features like authentication, authorization, web apis etc.

This is a modern credit card web application for a fictitious bank with the following features:

1. Customers can browse various credit cards offered by the bank.
1. Customers can apply for a credit card.
1. Customers can view their application status.
1. Credit Card Reviewers can see and approve/reject the application.

## Features

- Authentication using Microsoft Entra Id (see [AuthButton.tsx](src/components/AuthButton.tsx) for implementation)
- Authorization using Power Pages web roles (see [Header.tsx:9-17](src/components/Header.tsx#L9-L17) for implementation)
- Fetching data from using web apis (see [ApplicationStatus.tsx](src/pages/ApplicationStatus.tsx#L54-L64) for implementation)
- Updating data using web apis (see [Applications.tsx:115-129](src/pages/Applications.tsx#L115-L129) for implementation)

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:

    ```powershell
    git clone https://github.com/microsoft/power-pages-samples
    cd samples\bring-your-own-code\react\credit-cards-website\
    ```

1. Install dependencies:

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

Below steps will help you run this app in Power Pages.

### Setup

1. Install [Microsoft Power Platform CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction?tabs=windows#install-microsoft-power-platform-cli). (Version should be >= 1.43.6)
1. Allow `*.js` files by removing it from `Blocked Attachments` in `Privacy + Security` settings for your environment from Power Pages Admin Center.
1. Open a terminal and cd into `credit-cards-website` folder.
1. Run `pac auth create --environment <Environment URL>` to login to your environment.
1. Run `pac solution import --path .\solutions\CodeSiteSample_1_0_0_1_managed.zip` to import the sample managed solution in your environment.
1. **CreditCard** and **CreditCardApplication** tables will be created after the solution is imported.
1. Import data from `sample_creditcards.csv` to **CreditCard** table.

### Uploading site to Power Pages

1. Open a terminal and cd into `credit-cards-website` folder.
1. Run `npm run build` to build the code.
1. Run `pac pages upload-code-site --rootPath .` to upload the site to Power Pages.
1. Go to Power Pages home and click on **Inactive sites**.
1. You should see **Woodgrove Bank Credit Cards** site listed there. Click on **Reactivate** to proceed.
1. Once the site is activated, click on **Preview** to see it running on Power Pages.
1. Additionally, install [Power Platform Tools VS Code extension](https://aka.ms/power-platform-vscode) to easily upload the site in future iterations with a single click from within VS Code.

**Note:** Please assign **Credit Cards Application Reviewer** role and login with that role to see **Review Applications** tab.

## Project Structure

```text
credit-cards-website/
├── public/
│   └── assets/
│       └── (various image files)
├── src/
│   ├── components/
│   │   ├── ApplicationForm.tsx
│   │   ├── ApplicationStatusDetails.tsx
│   │   ├── ApplicationSteps.tsx
│   │   ├── ApplyCardBenefits.tsx
│   │   ├── AuthButton.tsx
│   │   ├── CardList.tsx
│   │   ├── CompareCards.tsx
│   │   ├── ContactForm.tsx
│   │   ├── EligibilityCarousel.tsx
│   │   ├── EligibilityForm.tsx
│   │   ├── EligibilityInfo.tsx
│   │   ├── FAQSection.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── HeroSection.tsx
│   │   ├── InvestmentOverview.tsx
│   │   ├── LatestOffers.tsx
│   │   ├── LatestOffersCarousel.tsx
│   │   └── ui/
│   ├── context/
│   │   └── ThemeContext.tsx
│   ├── pages/
│   │   ├── Application.tsx
│   │   ├── ApplicationStatus.tsx
│   │   ├── CardComparison.tsx
│   │   ├── Contact.tsx
│   │   ├── EligibilityCheck.tsx
│   │   ├── FAQs.tsx
│   │   ├── Home.tsx
│   │   ├── InvestmentInsights.tsx
│   │   └── InvestmentSavingInsights.tsx
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   └── index.tsx
├── index.html
├── package.json
├── powerpages.config.json
├── tsconfig.json
├── tsconfig.node.json
```

## Technologies Used

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/guide/)
- [React Router](https://reactrouter.com/)

## License

MIT
