# ClelandLab Grapher

This is an open-source component of LabWeb

## Get Started

### 0. Prerequisites

You need Node.js installed on your system. You can download it from [nodejs.org](https://nodejs.org/).

It's recommended to use pnpm as the package manager. You can install it via npm (if you installed Node.js):

```
npm install -g pnpm
```

### 1. Config

create a `config.js` file in the root directory with the following content:

```javascript
export default {
  port: 11112,
  dataPrefix: 'V:/path/prefix',
  tokenPath: '.',
  // if you want to map between user-input path and data-storage path, use the following line
  pathMap: path => path.replaceAll('\\', '/').replace(/^V:/, '/mnt/V')
}
```

### 2. Start Backend

To just run the backend server, use the following command:

```
node .
```

However, you may want to use the [`pm2`](https://pm2.keymetrics.io/docs/usage/quick-start/) process manager to keep the server running in the background.

```
# install pm2 if you haven't already
pnpm install -g pm2

pm2 start . --name grapher
```

### 3. Build Frontend

```
cd web

# install dependencies
pnpm install

# build the frontend
pnpm run build
```

Now the frontend files will be generated in `web/build` folder. You can use whatever static file server to serve these files, like Nginx.

