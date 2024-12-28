# CrosSt Street Chatroom - TypeScript Version

The TypeScript version of CrosSt Street is a fork of the [official CrosSt Street version](https://github.com/CrosSt-Chat/CSC-main/). This fork primarily converts the original JavaScript implementation to TypeScript.

---

## Local Testing

### Prerequisites

- **Node.js**: Ensure you have [Node.js](https://nodejs.org/) version 14.0 or higher installed.
  - The backend is tested with the latest LTS version of Node.js, so it is recommended to use the latest LTS version.

---

### Installation Steps

1. **Download the Repository**:

   Download Actions artifacts.

   ```bash
   cd CSC-main
   ```

2. **Install Dependencies**:
   Run the following command in the backend directory:

   ```bash
   npm install
   ```

3. **Start the Backend**:
   Execute:

   ```bash
   node main.js
   ```

4. **Test the Backend**:
   Open the `index.html` file in the `client` folder using your browser. If the homepage is displayed successfully, the backend is running correctly.

---

## Deployment and Configuration

1. **Client Setup**:
   Copy the `client` folder and configure your web server to serve the frontend files.

2. **Run on the Same Server**:
   Ensure that the backend (`main.js`) and frontend (from the `client` folder) are hosted on the same server.

---

## Contributions

We extend our gratitude to the official CrosSt Street project for making the source code available.  
[Official CrosSt Street Version](https://github.com/CrosSt-Chat/CSC-main/)

---

## LICENSE

CrosSt Street Chatroom is licensed under the [GNU Public License v3.0](./LICENSE).
