# Power Pages - Bring Your Own Code - Car Sales Website

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.14.

This is an angular implementation of [car-sales-website](../../react/car-sales-website/) converted using GitHub Copilot.

This is a modern web application for managing car sales, inventory, and customer information.

## Pre-requisites

Run `npm install -g @angular/cli` to install Angular CLI.

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/microsoft/power-pages-samples
    cd samples/bring-your-own-code-samples\angular\car-sales-website\
    ```

1. Install dependencies:

    ```powershell
    npm install
    ```

## Development server

To start a local development server, run:

```powershell
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```powershell
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```powershell
ng generate --help
```

## Building

To build the project run:

```powershell
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```powershell
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```powershell
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Running on Power Pages

Below steps will help you run this app in Power Pages.

### Setup

1. Install [Microsoft Power Platform CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction?tabs=windows#install-microsoft-power-platform-cli). (Version should be >= 1.44.2)
1. Allow `*.js` files by removing it from `Blocked Attachments` in `Privacy + Security` settings for your environment from Power Pages Admin Center.
1. Open a terminal and cd into `car-sales-website` folder.
1. Run `pac auth create --environment <Environment URL>` to login to your environment.

### Uploading site to Power Pages

1. Open a terminal and cd into `car-sales-website` folder.
1. Run `npm run build` to build the code.
1. Run `pac pages upload-code-site --rootPath .` to upload the site to Power Pages.
1. Go to Power Pages home and click on **Inactive sites**.
1. You should see **Car Sales Management** site listed there. Click on **Reactivate** to proceed.
1. Once the site is activated, click on **Preview** to see it running on Power Pages.
1. Additionally, install [Power Platform Tools VS Code extension](https://aka.ms/power-platform-vscode) to easily upload the site in future iterations with a single click from within VS Code.

**Note:** Please login to the site to see **Sales Leads** page.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## License

MIT
